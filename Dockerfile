# syntax=docker.io/docker/dockerfile:1

FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
RUN npm i -g pnpm

RUN mkdir -p /temp/dev
COPY package.json pnpm-lock.yaml* .npmrc* /temp/dev/
RUN cd /temp/dev && pnpm install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json pnpm-lock.yaml* .npmrc* /temp/prod/
RUN cd /temp/prod && pnpm install --frozen-lockfile --production

FROM base AS builder
WORKDIR /app
COPY --from=deps /temp/dev/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=deps --chown=nodejs:nodejs /temp/prod/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/drizzle.config.ts ./drizzle.config.ts

USER nodejs

EXPOSE 3789/tcp

ENV PORT=3789
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["npm", "start"]
