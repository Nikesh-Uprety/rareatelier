FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV CI=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends bzip2 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=5000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

RUN mkdir -p /app/uploads

EXPOSE 5000
CMD ["npm", "start"]
