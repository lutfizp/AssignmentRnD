FROM node:20-alpine AS base

RUN npm install -g pnpm

WORKDIR /app
ENV CI=true
ENV NODE_OPTIONS=--max-old-space-size=512

COPY package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json tsconfig.json ./
COPY next.config.mjs postcss.config.mjs tailwind.config.ts* ./
COPY drizzle.config.ts ./

COPY lib lib/
COPY app app/
COPY components components/
COPY hooks hooks/

RUN pnpm install --no-frozen-lockfile --child-concurrency=2 --network-concurrency=4

FROM base AS builder
WORKDIR /app
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
RUN pnpm run build

FROM node:20-alpine AS runner
RUN npm install -g pnpm
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app /app

CMD ["pnpm", "run", "start"]
