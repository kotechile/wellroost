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

# Edge behaviour (404s, trailing slashes, legacy /tools redirects, WP passthrough) lives in a real
# file so it can be reviewed and tested, instead of being escaped through `echo` in this Dockerfile.
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Fail the image build if the config does not parse.
RUN nginx -t

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
