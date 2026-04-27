# Build stage
FROM node:20-alpine AS builder
ARG VITE_API_BASE_URL=https://api.oujun.work
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN VITE_API_BASE_URL=${VITE_API_BASE_URL} npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]