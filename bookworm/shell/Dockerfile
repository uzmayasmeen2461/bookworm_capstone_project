# ── Build stage ──────────────────────────────────────────────────────────────
# shell MFE — builds a static webpack bundle, served by nginx at runtime.
# cache-bust: v2
FROM node:20-alpine AS builder

# ── Build-time args (passed from docker-compose.prod.yml) ────────────────────
ARG MFE_AUTH_URL=https://bookworm-mfe-auth.onrender.com
ARG MFE_STORE_URL=https://bookworm-mfe-store.onrender.com
ARG MFE_CHECKOUT_URL=https://bookworm-mfe-checkout.onrender.com
ARG API_BASE_URL=https://bookworm-backend-275c.onrender.com

# Expose as env vars so webpack.config.js can read them via process.env
ENV MFE_AUTH_URL=$MFE_AUTH_URL
ENV MFE_STORE_URL=$MFE_STORE_URL
ENV MFE_CHECKOUT_URL=$MFE_CHECKOUT_URL
ENV API_BASE_URL=$API_BASE_URL

WORKDIR /workspace

# ── Install workspace deps ────────────────────────────────────────────────────
# We need the full monorepo package graph so npm workspaces resolves correctly.
COPY package.json package-lock.json* ./
COPY shared/package.json      ./shared/
COPY shell/package.json        ./shell/
COPY mfe-auth/package.json     ./mfe-auth/
COPY mfe-store/package.json    ./mfe-store/
COPY mfe-checkout/package.json ./mfe-checkout/

RUN npm ci --ignore-scripts --workspaces=false --include-workspace-root \
  && npm ci --ignore-scripts --workspace=shared \
  && npm ci --ignore-scripts --workspace=shell

# ── Copy source ───────────────────────────────────────────────────────────────
COPY shared ./shared
COPY shell   ./shell

# ── Build production bundle ───────────────────────────────────────────────────
WORKDIR /workspace/shell
RUN npm run build

# ── Runtime stage — nginx to serve static files ───────────────────────────────
FROM nginx:alpine AS runtime

COPY --from=builder /workspace/shell/dist /usr/share/nginx/html
COPY shell/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 10000

CMD ["nginx", "-g", "daemon off;"]
