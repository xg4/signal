# syntax=docker.io/docker/dockerfile:1

FROM oven/bun:1-alpine AS base

FROM base AS deps

RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /temp/dev/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN bun run db:generate

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json

EXPOSE 3789/tcp

ENV PORT=3789

ENTRYPOINT ["bun"]
