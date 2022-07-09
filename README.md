docker-discord-logger
---------------------

Script that logs the output of docker containers to discord via the webhook api.

### Installation
Docker CLI:
```bash
docker run -d --name=docker-discord-logger \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -e CONTAINERS=Container1:Container2:Container3 \
    -e WEBHOOK_URL=<discord webhook url> \
    docker-discord-logger:latest
```

Docker Compose:
```yaml
version: "3.4"

services:
  docker-discord-logger:
    container_name: docker-discord-logger
    image: docker-discord-logger:latest
    network_mode: bridge
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - CONTAINERS=Container1:Container2:Container3
      - WEBHOOK_URL=<discord webhook url>
    restart: unless-stopped
```

### Build it yourself
```bash
git clone https://github.com/1RandomDev/docker-discord-logger.git && cd docker-discord-logger
docker build --tag docker-discord-logger:latest .
```
