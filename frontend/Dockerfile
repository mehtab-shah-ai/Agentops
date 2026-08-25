# ------------------------------------------------------------------------------
# Stage 1: Build Frontend Assets with Vite & TypeScript
# ------------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first for maximum layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files and compile production bundle
COPY . .
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Nginx Static Server & Reverse Proxy
# ------------------------------------------------------------------------------
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled SPA bundle from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
