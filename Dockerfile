# Build stage
FROM node:lts-alpine AS build
WORKDIR /app

# Install curl for debugging
RUN apk add --no-cache curl

ARG PUBLIC_WORDPRESS_API_BASE=https://cms.wellroost.com
ENV PUBLIC_WORDPRESS_API_BASE=${PUBLIC_WORDPRESS_API_BASE:-https://cms.wellroost.com}

ARG PUBLIC_SITE_URL=https://wellroost.com
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL:-https://wellroost.com}

# Vibe-marketing telemetry sinks. Astro inlines PUBLIC_* at BUILD time, so these must be present
# here — setting them on the running container ships a bundle whose values are already `undefined`
# and every interaction event is dropped. Empty by default: the site then says so (console warning,
# and the "Telemetry Enabled" badge on /calculators/ disappears) rather than pretending to report.
ARG PUBLIC_SUPABASE_URL=
ENV PUBLIC_SUPABASE_URL=${PUBLIC_SUPABASE_URL:-}
ARG PUBLIC_SUPABASE_ANON_KEY=
ENV PUBLIC_SUPABASE_ANON_KEY=${PUBLIC_SUPABASE_ANON_KEY:-}
# The webhook sink. Coolify passes `--build-arg PUBLIC_N8N_WEBHOOK_URL=…`, so that name MUST be
# declared here or Docker drops it as an unused build arg and the bundle inlines an empty value —
# silently, with the variable visibly present in Coolify. Both names are declared because the
# application reads either (see src/lib/telemetry.ts).
ARG PUBLIC_N8N_WEBHOOK_URL=
ENV PUBLIC_N8N_WEBHOOK_URL=${PUBLIC_N8N_WEBHOOK_URL:-}
ARG PUBLIC_TELEMETRY_WEBHOOK_URL=
ENV PUBLIC_TELEMETRY_WEBHOOK_URL=${PUBLIC_TELEMETRY_WEBHOOK_URL:-}

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

# The copy gate runs in the image build, not just locally: the lexicon is a brand contract, and a
# contract that only runs when someone remembers to type the command is advisory. `prebuild` runs
# `copy:check` before `npm run build`, so a violation stops the deploy.
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
