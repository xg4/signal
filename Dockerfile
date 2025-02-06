# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine AS base

FROM base AS base2
RUN apk add --no-cache libc6-compat
RUN npm i -g pnpm

FROM base2 AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml* .npmrc* ./
RUN pnpm i --frozen-lockfile

FROM base2 AS deps2
WORKDIR /app

COPY package.json pnpm-lock.yaml* .npmrc* ./
RUN pnpm i --prod

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=deps2 --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/drizzle.config.ts ./drizzle.config.ts

USER nodejs

EXPOSE 3789

ENV PORT=3789

ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
