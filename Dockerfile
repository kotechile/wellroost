# Build stage
FROM node:lts-alpine AS build
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy rest of the files and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Copy the built files from the build stage to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy a custom nginx config if needed (optional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
