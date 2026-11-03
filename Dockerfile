FROM node:22.16-bookworm-slim
WORKDIR /app
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile
COPY . .
RUN yarn build
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["yarn", "start"]
