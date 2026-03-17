# ================================
# Stage 1 : Build
# ================================
FROM node:20-alpine AS builder

WORKDIR /app

# Dépendances système pour bcrypt et autres modules natifs
RUN apk add --no-cache python3 make g++ openssl

# Installer les dépendances
COPY package*.json ./
RUN npm ci

# Copier les sources
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Build Next.js
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build

# ================================
# Stage 2 : Production
# ================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Dépendances système runtime
RUN apk add --no-cache openssl mariadb-client

# Créer un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copier les fichiers nécessaires depuis le builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Dossier uploads (sera monté via volume)
RUN mkdir -p ./public/uploads && chown -R nextjs:nodejs ./public/uploads

# Script de démarrage
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
