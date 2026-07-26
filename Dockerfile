FROM oven/bun:1.2.20-alpine AS frontend
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
ARG VITE_MOBIX_API_KEY
ARG VITE_MOBIX_MRP_API_KEY
ARG VITE_MOBIX_API_BASE=https://mobix.motovax.com
ARG VITE_MOBIX_IMAGE_BASE=https://mobix.motovax.com
ARG VITE_MOTOVAX_AUTH_API_BASE=https://mobix.motovax.com
ARG VITE_STRAPI_API_KEY
ARG VITE_CMS_API_BASE=https://api.mobixbydss.id/api
ARG VITE_CMS_IMAGE_BASE=https://api.mobixbydss.id
ARG VITE_DSF_BEARER_TOKEN
ARG VITE_DSF_BASE_URL=https://simulation.dipostar.com
RUN bun run build

FROM golang:1.25-alpine AS server
WORKDIR /src

COPY go.mod ./
COPY cmd/webserver ./cmd/webserver
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /webserver ./cmd/webserver

FROM alpine:3.22
RUN addgroup -S app && adduser -S -G app app
WORKDIR /app

COPY --from=server /webserver /usr/local/bin/webserver
COPY --from=frontend /app/dist ./dist

USER app
EXPOSE 8080
ENV ADDR=:8080 STATIC_DIR=/app/dist

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["webserver"]
