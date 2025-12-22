# Creating multi-stage build for production
FROM oven/bun:1.3.5-alpine as build
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git nodejs > /dev/null 2>&1
ENV NODE_ENV=production
ARG STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN
ENV STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN ${STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN}
WORKDIR /opt/
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile
ENV PATH /opt/node_modules/.bin:$PATH
WORKDIR /opt/app
COPY . .
RUN bun run build

# Creating final production image
FROM oven/bun:1.3.5-alpine
RUN apk add --no-cache vips-dev nodejs
ENV NODE_ENV=production
ARG STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN
ENV STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN ${STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN}
ENV TZ=UTC
WORKDIR /opt/
COPY --from=build /opt/node_modules ./node_modules
WORKDIR /opt/app
COPY --from=build /opt/app ./
ENV PATH /opt/node_modules/.bin:$PATH

RUN chown -R bun:bun /opt/app
USER bun
EXPOSE 1337
CMD ["strapi", "start"]
