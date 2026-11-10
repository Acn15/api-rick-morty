# Use the official Node.js image as the base image
FROM node:24-alpine AS base

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Development stage with full dependencies
FROM base AS dev
RUN npm install
COPY . .
EXPOSE 3000

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:24-alpine AS prod
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g prisma
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
RUN npx prisma generate
EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]