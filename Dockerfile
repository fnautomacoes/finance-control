# Production Dockerfile
# Multi-stage build for optimized image size

# ===============================
# Stage 1: Dependencies
# ===============================
FROM node:20-slim AS deps
RUN apt-get update && apt-get install -y openssl libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json ./
COPY prisma ./prisma/

# Instala TODAS as dependências (incluindo dev) para o build
# Não copia package-lock.json para evitar conflitos de plataforma com SWC
RUN npm install && npx prisma generate

# ===============================
# Stage 2: Builder
# ===============================
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
# NEXT_PRIVATE_SKIP_PATCHING ignora a verificação de lockfile que causa falhas
RUN NEXT_PRIVATE_SKIP_PATCHING=1 npm run build

# ===============================
# Stage 3: Runner (Production)
# ===============================
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install required packages
RUN apt-get update && apt-get install -y wget openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
