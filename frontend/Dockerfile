# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

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
