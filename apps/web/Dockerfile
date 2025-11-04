# Multi-stage Dockerfile for Blastoise Web App (Angular PWA)
# Optimized for production deployment on Railway

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./
COPY eslint.config.cjs ./

# Install dependencies
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY apps/web ./apps/web
COPY libs ./libs

# Build the web app for production
RUN npx nx build web --configuration=production

# Stage 2: Production - Serve with nginx
FROM nginx:1.27-alpine AS production

# Copy custom nginx config
COPY apps/web/nginx.conf /etc/nginx/nginx.conf

# Copy built application from builder
COPY --from=builder /app/dist/apps/web/browser /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Expose port (Railway uses PORT env var)
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
