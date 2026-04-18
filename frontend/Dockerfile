# Build stage
FROM node:20-slim AS builder
WORKDIR /app

# Ensure dev dependencies are installed
ENV NODE_ENV=development

# Install dependencies
COPY package*.json ./
RUN npm install --no-audit --no-fund && \
    test -x node_modules/.bin/vite

# Copy source
COPY . .

# Build
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
