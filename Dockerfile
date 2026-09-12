# Build stage
FROM node:lts-alpine AS build
WORKDIR /app

# Install curl for debugging
RUN apk add --no-cache curl

ARG PUBLIC_WORDPRESS_API_BASE=https://cms.wellroost.com
ENV PUBLIC_WORDPRESS_API_BASE=${PUBLIC_WORDPRESS_API_BASE:-https://cms.wellroost.com}

ARG PUBLIC_SITE_URL=https://wellroost.com
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL:-https://wellroost.com}

# This helps if the server has trouble with its own SSL certificate during build
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

COPY package*.json ./
RUN npm ci || npm install
COPY . .

# Invalidate cache so every redeployment fetches fresh posts from the CMS
ARG CACHEBUST=1

# Debug: Try to connect to WordPress before building
RUN echo "Checking connection to $PUBLIC_WORDPRESS_API_BASE..." && \
    curl -v -I "$PUBLIC_WORDPRESS_API_BASE/wp-json/wp/v2/posts" || echo "Connection check failed, but proceeding with build..."

RUN npm run build

# Production stage
FROM nginx:stable-alpine

RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
\
    # 1. Handle Astro Subpages and Static Files \
    location / { \
        try_files $uri $uri/ $uri.html /index.html; \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
    } \
\
    # 2. Cache hashed static assets \
    location /_astro/ { \
        expires 1y; \
        add_header Cache-Control "public, max-age=31536000, immutable"; \
    } \
\
    # 3. Proxy ALL WordPress Backend paths \
    location ~* ^/(wp-content|wp-includes|wp-json|wp-admin|wp-login\.php|wp-cron\.php) { \
        proxy_pass https://cms.wellroost.com; \
        proxy_set_header Host cms.wellroost.com; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_ssl_server_name on; \
        proxy_buffer_size 128k; \
        proxy_buffers 4 256k; \
        proxy_busy_buffers_size 256k; \
    } \
\
    # Fix for Astro 404s to prevent loop \
    error_page 404 /index.html; \
}' > /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
