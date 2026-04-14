# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/admin/package*.json ./
RUN npm install --no-audit --no-fund

COPY frontend/admin .
ARG VITE_BUILD_VERSION
ENV VITE_BUILD_VERSION=${VITE_BUILD_VERSION}
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]