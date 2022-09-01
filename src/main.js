if(!process.env.CONTAINERS) {
    console.error('Please specify the containers to monitor in environment variable CONTAINER.');
    process.exit(1);
}
if(!process.env.WEBHOOK_URL) {
    console.error('Please specify the Discord webhook url in environment variable WEBHOOK_URL.');
    process.exit(1);
}

const childProcess = require('child_process');
const { Webhook } = require('discord-webhook-node');

console.log('Starting docker discord logger...');

const discordWebhook = new Webhook(process.env.WEBHOOK_URL);
discordWebhook.send('Started docker discord logger.').catch(e => {
    console.log('Provided webhook url is invalid: '+e.message);
    process.exit(1);
});

const containers = process.env.CONTAINERS.split(':');
containers.forEach(containerName => {
    monitorContainer(containerName, false);
});

const dockerEventListener = childProcess.spawn('docker', ['events', '--filter', 'event=start', '--format', '{{json .}}'], {
    detached: true
});
dockerEventListener.stdout.on('data', data => {
    data = JSON.parse(data.toString());
    const containerName = containers.find(container => container == data.Actor.Attributes.name || data.id.startsWith(container));
    if(containerName) {
        console.log(`Container "${containerName}" started, attaching listener.`);
        monitorContainer(containerName, true);
    }
});
dockerEventListener.on('close', () => {
    console.log('Event listener process exited.');
});

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
