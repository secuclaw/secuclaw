FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package*.json pnpm-lock.yaml ./
COPY packages/core/package*.json ./packages/core/
COPY packages/cli/package*.json ./packages/cli/
COPY packages/web/package*.json ./packages/web/

RUN bun install

COPY tsconfig*.json ./
COPY packages/core ./packages/core
COPY packages/cli ./packages/cli
COPY packages/web ./packages/web

RUN bun --filter @secuclaw/core build
RUN bun --filter @secuclaw/cli build
RUN bun --filter @secuclaw/web build

FROM oven/bun:1-alpine AS runtime

WORKDIR /app

RUN addgroup -g 1001 -S secuclaw && \
    adduser -S secuclaw -u 1001 -G secuclaw

COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/cli/dist ./packages/cli/dist
COPY --from=builder /app/packages/cli/package.json ./packages/cli/
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/package.json ./

RUN bun install --filter @secuclaw/core --filter @secuclaw/cli

COPY --from=builder /app/packages/web/dist ./packages/web/dist

RUN chown -R secuclaw:secuclaw /app

USER secuclaw

ENV NODE_ENV=production
ENV PORT=21000

EXPOSE 21000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:21000/health || exit 1

CMD ["bun", "packages/cli/dist/index.js", "gateway", "start"]
