FROM node:22.16-bookworm-slim AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:22.16-bookworm-slim AS production-deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile --production

FROM node:22.16-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json /app/yarn.lock /app/server.ts ./
COPY --from=build --chown=node:node /app/src/server ./src/server
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
CMD ["yarn", "start"]
