require('dotenv').config();
const childProcess = require('child_process');
const { Webhook } = require('discord-webhook-node');

if(!process.env.WEBHOOK_URL) {
    console.error('Please specify the Discord webhook url in environment variable WEBHOOK_URL.');
    process.exit(1);
}

console.log('Starting docker discord logger...');

// Initialize discord webhook
const discordWebhook = new Webhook(process.env.WEBHOOK_URL);
discordWebhook.send('Started docker discord logger.').catch(e => {
    console.log('Provided webhook url is invalid: '+e.message);
    process.exit(1);
});

(async () => {
    // Add running containers on start
    let containers = process.env.CONTAINERS ? process.env.CONTAINERS.split(':') : [];
    containers.push(...(await getLabeledContainers('discord-logger.enabled=true')));
    containers = [...new Set(containers)];
    containers.forEach(containerName => {
        monitorContainer(containerName, false);
    });

    // Listen for started containers
    const dockerEventListener = childProcess.spawn('docker', ['events', '--filter', 'event=start', '--format', '{{json .}}'], {
        detached: true
    });
    dockerEventListener.stdout.on('data', data => {
        data = JSON.parse(data.toString());
        let containerName = containers.find(container => container == data.Actor.Attributes.name || data.id.startsWith(container));

        if(!containerName && data.Actor.Attributes['discord-logger.enabled'] == 'true') {
            containerName = data.Actor.Attributes.name;
        }

        if(containerName) {
            console.log(`Container "${containerName}" started, attaching listener.`);
            monitorContainer(containerName, true);
        }
    });
    dockerEventListener.on('close', () => {
        console.log('Event listener process exited.');
    });
})();

// Monitor individual containers
function monitorContainer(containerName, notifyDiscord) {
    const logListener = childProcess.spawn('docker', ['logs', containerName, '--follow', '--tail', '0'], {
        detached: true
    });

    logListener.stdout.on('data', data => {
        const message = data.toString()
            //.replace('\n', '').replace('\r', '') // Replace newlines
            .replace(/\u001b\[.*?m/g, '') // Strip color
            .trim(); // Strip starting/ending spaces

        discordWebhook.send(`**[${containerName}]** ${message}`);
    });

    logListener.on('close', () => {
        console.log(`Log listener for container container "${containerName}" exited.`);
        discordWebhook.send(`Container **"${containerName}"** exited.`);
    });

    if(notifyDiscord) discordWebhook.send(`Container **"${containerName}"** started.`);
}

async function getLabeledContainers(label) {
    return new Promise(resolve => {
        childProcess.exec(`docker ps --filter=label=${label} --format='{{json .}}'`, (error, stdout, stderr) => {
            if(stderr) {
                console.error(`Error while checking running containers: `+stderr);
            }

            const containers = [];
            stdout.split('\n').forEach(container => {
                if(!container) return;
                container = JSON.parse(container);
                containers.push(container.Names);
            });
            resolve(containers);
        });
    });
}
