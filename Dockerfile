# Build stage
FROM node:lts-alpine AS build
WORKDIR /app

# Install curl for debugging
RUN apk add --no-cache curl

ARG PUBLIC_WORDPRESS_API_BASE
ENV PUBLIC_WORDPRESS_API_BASE=$PUBLIC_WORDPRESS_API_BASE
# This helps if the server has trouble with its own SSL certificate during build
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

COPY package*.json ./
RUN npm install
COPY . .

# Debug: Try to connect to WordPress before building
RUN echo "Checking connection to $PUBLIC_WORDPRESS_API_BASE..." && \
    curl -v -I "$PUBLIC_WORDPRESS_API_BASE/wp-json/wp/v2/posts" || echo "Connection check failed, but proceeding with build..."

RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Production stage
FROM nginx:stable-alpine

RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
\
    # Handle Astro Subpages and Static Files \
    location / { \
        try_files $uri $uri/ $uri.html /404.html; \
    } \
\
    # Proxy WordPress Media and Assets \
    location ~* ^/(wp-content|wp-includes) { \
        proxy_pass https://cms.giniloh.com; \
        proxy_set_header Host cms.giniloh.com; \
        proxy_ssl_server_name on; \
        proxy_cache_bypass $http_upgrade; \
    } \
\
    # Proxy WordPress API for Search/Islands \
    location /wp-json { \
        proxy_pass https://cms.giniloh.com; \
        proxy_set_header Host cms.giniloh.com; \
        proxy_ssl_server_name on; \
    } \
\
    error_page 404 /404.html; \
}' > /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
