# Build stage
FROM node:20-slim AS builder
WORKDIR /app

# Install dependencies (including dev)
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
