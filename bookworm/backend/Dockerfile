# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install ALL deps (including devDeps for tsc)
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --ignore-scripts; else npm install --ignore-scripts; fi

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc --project tsconfig.json

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy compiled output and install production deps as root before switching user
COPY --from=builder /app/dist ./dist
COPY src/db/migrations ./dist/db/migrations
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --ignore-scripts; else npm install --omit=dev --ignore-scripts; fi

# Switch to non-root node user (provided by node:alpine)
USER node

# Expose port — defaults to 5000 locally; Render overrides via PORT env var
EXPOSE ${PORT:-5000}

# Healthcheck — lightweight; relies on /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "const p=process.env.PORT||5000; require('http').get('http://127.0.0.1:'+p+'/health', r => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/index.js"]
