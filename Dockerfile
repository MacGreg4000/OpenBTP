# ================================
# Stage 1 : Build
# ================================
FROM node:20-alpine AS builder

WORKDIR /app

# Dépendances système pour bcrypt, canvas et autres modules natifs
RUN apk add --no-cache python3 make g++ openssl pkgconf \
    cairo-dev pango-dev jpeg-dev giflib-dev pixman-dev

# Installer les dépendances
COPY package*.json ./
RUN npm ci

# Copier les sources
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Variables nécessaires au build (valeurs fictives, remplacées au runtime)
ARG NEXTAUTH_SECRET=build_placeholder_secret
ARG DATABASE_URL=mysql://build:build@localhost:3306/build
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV DATABASE_URL=$DATABASE_URL

# Build Next.js
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build

# ================================
# Stage 2 : Production
# ================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Dépendances système runtime
RUN apk add --no-cache openssl mariadb-client \
    cairo pango jpeg giflib pixman && \
    # Créer un alias mysqldump → mariadump pour compatibilité
    ln -sf /usr/bin/mariadump /usr/bin/mysqldump

# Créer un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copier les fichiers nécessaires depuis le builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# Dossiers persistants (seront montés via volumes)
RUN mkdir -p ./public/uploads ./backups && \
    chown -R nextjs:nodejs ./public/uploads ./backups

# Script de démarrage
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
