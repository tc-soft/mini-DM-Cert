# --- build stage ---
FROM node:22-bookworm-slim AS build
WORKDIR /app

# better-sqlite3 falls back to compiling from source if no prebuilt binary
# matches this platform, so build tools are needed here (not in the final image).
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

# --- runtime stage ---
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    DATABASE_PATH=/app/data/mini-dm.db

RUN groupadd -r app && useradd -r -g app app \
    && mkdir -p /app/data && chown -R app:app /app

COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/package.json ./package.json

USER app
VOLUME ["/app/data"]
EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
