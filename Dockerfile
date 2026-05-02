ARG FFMPEG_TARGET_PLATFORM=linux/amd64

FROM --platform=${FFMPEG_TARGET_PLATFORM} jrottenberg/ffmpeg:7.1-scratch AS ffmpeg

FROM --platform=${FFMPEG_TARGET_PLATFORM} node:22.20.0-alpine AS base

WORKDIR /app

RUN npm install -g pnpm@10

FROM base AS deps

ENV HUSKY=0

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY .husky/install.mjs ./.husky/install.mjs
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

FROM base AS build

ENV HUSKY=0

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY .husky/install.mjs ./.husky/install.mjs
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM base AS runtime

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=ffmpeg /bin/ffmpeg /usr/local/bin/ffmpeg
COPY --from=ffmpeg /bin/ffprobe /usr/local/bin/ffprobe
COPY --from=ffmpeg /lib /lib

COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/apps/server/dist ./apps/server/dist
COPY --from=build --chown=nodejs:nodejs /app/apps/worker/dist ./apps/worker/dist
COPY --chown=nodejs:nodejs package.json ./

USER nodejs

EXPOSE 3000

CMD ["node", "apps/server/dist/server.js"]
