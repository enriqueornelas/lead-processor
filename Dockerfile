# Build stage
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json bun.lock* package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

COPY package.json bun.lock* package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

RUN mkdir -p /data

EXPOSE 3000

VOLUME ["/data"]

CMD ["node", "dist/server.cjs"]
