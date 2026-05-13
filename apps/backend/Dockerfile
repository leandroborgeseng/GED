# Build context: raiz do monorepo (Railway, docker compose na raiz).
# Não use context só em apps/backend — os COPY abaixo assumem a raiz do repositório.
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY apps/backend/package*.json ./
COPY apps/backend/prisma ./prisma/
RUN npm ci
COPY apps/backend/ ./
# Prisma 6 exige DATABASE_URL no schema mesmo para `generate` (não precisa de Postgres acessível no build).
ARG DATABASE_URL_BUILD=postgresql://build:build@127.0.0.1:5/_prisma_build_only?schema=public
ENV DATABASE_URL=${DATABASE_URL_BUILD}
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package*.json ./
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
