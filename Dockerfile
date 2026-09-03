# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json .npmrc ./

# Install all dependencies (dev included for build)
RUN npm install

# Copy source files
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Build project
RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy dependency manifests
COPY package*.json .npmrc ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3333

CMD ["node", "dist/main.js"]
