# ── Build stage ───────────────────────────────────────────────────────────────
# cache-bust: v2
FROM node:20-alpine AS builder

ARG API_BASE_URL=https://bookworm-backend-275c.onrender.com
ENV API_BASE_URL=$API_BASE_URL

WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY shared/package.json      ./shared/
COPY shell/package.json        ./shell/
COPY mfe-auth/package.json     ./mfe-auth/
COPY mfe-store/package.json    ./mfe-store/
COPY mfe-checkout/package.json ./mfe-checkout/

RUN npm ci --ignore-scripts --workspaces=false --include-workspace-root \
  && npm ci --ignore-scripts --workspace=shared \
  && npm ci --ignore-scripts --workspace=mfe-store

COPY shared    ./shared
COPY mfe-store ./mfe-store

WORKDIR /workspace/mfe-store
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM nginx:alpine AS runtime

COPY --from=builder /workspace/mfe-store/dist /usr/share/nginx/html
COPY mfe-store/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 10000

CMD ["nginx", "-g", "daemon off;"]
