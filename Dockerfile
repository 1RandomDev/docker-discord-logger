FROM alpine:latest

RUN apk add --no-cache \
    docker-cli \
    nodejs \
    npm

WORKDIR /docker-discord-logger

COPY . .
RUN npm install --omit=dev

CMD ["node", "src/main.js"]
