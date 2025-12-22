FROM oven/bun:1 AS builder

WORKDIR /app

# Copy storybook package files
COPY storybook/package.json storybook/bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy storybook source
COPY storybook/ .

# Build storybook
RUN bun run build-storybook

# Production stage
FROM nginx:alpine

# Copy built storybook to nginx
COPY --from=builder /app/storybook-static /usr/share/nginx/html

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
