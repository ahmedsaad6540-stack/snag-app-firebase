FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY preview ./preview
COPY app-manifest.yaml ./
COPY app-manifest.socket-mode.yaml ./

ENV NODE_ENV=production
ENV SLACK_SOCKET_MODE=true
ENV FIREBASE_PROJECT_ID=snag-ops-staging

USER node

CMD ["node", "src/app.js"]
