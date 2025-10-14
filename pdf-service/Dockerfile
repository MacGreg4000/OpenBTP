FROM ghcr.io/puppeteer/puppeteer:21.11.0

WORKDIR /app

# Copier uniquement package.json pour tirer parti du cache
COPY package.json ./

RUN npm ci --omit=dev

# Copier le serveur
COPY server.js ./

EXPOSE 3000

CMD ["node", "server.js"]


