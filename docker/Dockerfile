FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS install
COPY package.json bunfig.toml ./
COPY packages/core/package.json ./packages/core/
COPY packages/web/package.json ./packages/web/
RUN bun install

FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS release
COPY --from=build /app/packages/core/dist ./dist
COPY --from=build /app/packages/web/dist ./web
COPY config ./config
COPY skills ./skills

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000 3001

CMD ["bun", "run", "dist/gateway/server.js"]
