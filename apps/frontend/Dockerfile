# Build context: repositório raiz (monorepo)
FROM node:22-bookworm-slim AS deps
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/
# Optional deps nativas (Linux) + lockfile único na raiz — evita npm #4828 com apps/frontend/package-lock.json.
RUN npm ci --workspace=frontend --workspaces --if-present && \
  LCSS_VER=$(node -p "require('./apps/frontend/node_modules/lightningcss/package.json').version") && \
  npm install -w frontend "lightningcss-linux-x64-gnu@${LCSS_VER}" --no-save && \
  OX_VER=$(node -p "require('./apps/frontend/node_modules/@tailwindcss/oxide/package.json').version") && \
  npm install -w frontend "@tailwindcss/oxide-linux-x64-gnu@${OX_VER}" --no-save

FROM node:22-bookworm-slim AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/frontend/node_modules ./apps/frontend/node_modules
COPY . .
# Se ainda existir no contexto (legado), não deixar o Next/npm ver dois lockfiles.
RUN rm -f apps/frontend/package-lock.json || true
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build -w frontend

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs
COPY --from=builder /repo/apps/frontend/public ./apps/frontend/public
COPY --from=builder --chown=nextjs:nodejs /repo/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/frontend/.next/static ./apps/frontend/.next/static
USER nextjs
EXPOSE 3000
# Railway injeta PORT; o Next faz listen(port, hostname).
ENV HOST=0.0.0.0
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
CMD ["node", "apps/frontend/server.js"]
