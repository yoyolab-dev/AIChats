# Build stage
FROM node:20-slim AS builder
WORKDIR /app

# 安装构建工具（可选）
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Install dependencies (including dev)
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copy source
COPY . .

# Build
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
