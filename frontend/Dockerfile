# Build stage
FROM node:20-slim AS builder
WORKDIR /app

# Install dependencies (including dev)
ENV NODE_ENV=development \
    NPM_CONFIG_PRODUCTION=false
COPY package*.json ./
RUN npm install --no-audit --no-fund && \
    npm list --depth=0 && \
    ls -la node_modules/.bin && \
    test -x node_modules/.bin/vite
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
