📚 BookWorm
A full-stack online bookstore built as a Micro-Frontend (MFE) monorepo. Five independently deployable React/TypeScript apps compose at runtime via Webpack Module Federation, backed by a Node.js/Express REST API and PostgreSQL.

🏗 Architecture
Browser
  └── Shell (host)          — global layout, navbar, routing
        ├── mfe-auth        — login / register / session management
        ├── mfe-store       — catalog, book detail, cart, wishlist
        └── mfe-checkout    — checkout, payment, orders
              └── Backend API  ←→  PostgreSQL
Apps communicate across bundle boundaries via custom window events — no shared state library required.

Event	Fired by	Listened by
bw:auth:login	mfe-auth	Shell, mfe-store, mfe-checkout, apiClient
bw:auth:logout	mfe-auth	Shell, all MFEs
bw:cart:updated	mfe-store	Shell (cart badge)
📦 Monorepo Structure
bookworm/
├── shell/            # MFE host — Navbar, routing, lazy-loads remotes
├── mfe-auth/         # Login, Register, JWT session lifecycle
├── mfe-store/        # Catalog, BookDetail, Cart, Wishlist
├── mfe-checkout/     # Checkout, Payment, Orders
├── shared/           # Shared apiClient (used by all MFEs)
├── backend/          # Node.js / Express REST API
├── docker-compose.yml          # local development
├── docker-compose.prod.yml     # self-hosted VPS (Traefik + HTTPS)
└── render.yaml                 # Render.com one-click deploy
🚀 Tech Stack
Layer	Technology
Frontend	React 18, TypeScript, React Router v7
MFE bundling	Webpack 5, Module Federation
Backend	Node.js, Express, TypeScript
Database	PostgreSQL 15
Auth	JWT (15 min access) + Refresh tokens (7 days), bcryptjs
Styling	Plain CSS (per component)
Testing	Jest, React Testing Library
Containers	Docker, Docker Compose, nginx
Deployment	Render (free tier) or self-hosted VPS with Traefik
✨ Features
🔐 Persistent login — stays logged in across page reloads and browser restarts until explicit sign-out
🔄 Silent token refresh — 401 interceptor transparently retries expired requests; proactive 14-min refresh timer prevents expiry mid-session
📖 Book catalog — category sidebar, filter by price / format / language, search
⭐ Recommendations — personalised suggestions, bestsellers, new launches
🛒 Cart — live item count badge synced across all MFEs
❤️ Wishlist — save books for later
💳 Checkout — address book, order summary, payment (credit card / debit / UPI / wallet)
📦 Order history — track all past orders and their status
🎁 Gift points — earned on account creation, visible in the navbar
🛡 MFE error isolation — one remote failing does not crash the rest of the app
🧪 Unit tests — across all MFEs and the backend
🏃 Running Locally
Prerequisites
Node.js 20+
PostgreSQL running locally (or Docker)
1. Install dependencies
cd bookworm
npm install
2. Configure the backend
cp backend/.env.example backend/.env
# Edit backend/.env and fill in your local DB credentials
3. Set up the database
npm run --workspace=backend setup
# Creates the DB, runs migrations, seeds sample books + demo user
4. Start all services (5 terminals)
npm run backend    # API on http://localhost:5000
npm run shell      # Shell on http://localhost:3000
npm run auth       # mfe-auth on http://localhost:3001
npm run store      # mfe-store on http://localhost:3002
npm run checkout   # mfe-checkout on http://localhost:3003
Open http://localhost:3000

Demo account: demo@bookworm.com / Demo@1234

🐳 Running with Docker Compose
cd bookworm
cp .env.production.example .env.production
# Fill in DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET
docker compose --env-file .env.production up --build
Open http://localhost:3000

☁️ Deploying to Render (free, no domain needed)
Push this repo to GitHub
Go to render.com → New → Blueprint
Connect your repo — Render finds render.yaml automatically
Fill in JWT_SECRET and JWT_REFRESH_SECRET when prompted
Click Apply — all 6 services deploy automatically
After first deploy, set these two environment variables in the Render dashboard:

On bookworm-backend → Environment:

ALLOWED_ORIGINS=https://bookworm-shell.onrender.com,https://bookworm-mfe-auth.onrender.com,https://bookworm-mfe-store.onrender.com,https://bookworm-mfe-checkout.onrender.com
On bookworm-shell → Build vars:

MFE_AUTH_URL=https://bookworm-mfe-auth.onrender.com
MFE_STORE_URL=https://bookworm-mfe-store.onrender.com
MFE_CHECKOUT_URL=https://bookworm-mfe-checkout.onrender.com
API_BASE_URL=https://bookworm-backend.onrender.com
Then redeploy the shell. Your app is live at https://bookworm-shell.onrender.com.

Free tier note: Services spin down after 15 min of inactivity — the first request after idle takes ~30 s to cold-start.

🗄 Database Schema
Table	Purpose
users	Accounts with roles (guest / registered / admin) and gift points
categories	Book genres (Romance, Mystery, Sci-Fi …)
authors	Author profiles
books	Catalogue with price, format, stock, ratings
book_tags	Many-to-many tags per book
carts / cart_items	Per-user shopping cart
orders / order_items	Purchase history with status lifecycle
reviews	Star ratings + comments per book per user
wishlists	Saved books per user
addresses	Saved delivery addresses
refresh_tokens	Server-side refresh token rotation (hashed)
🔑 Environment Variables
Backend (backend/.env)
Variable	Description
PORT	API port (default 5000)
DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD	PostgreSQL connection
JWT_SECRET	Access token signing secret (min 64 random chars)
JWT_REFRESH_SECRET	Refresh token signing secret (min 64 random chars)
JWT_EXPIRES_IN	Access token lifetime (default 15m)
JWT_REFRESH_EXPIRES_IN	Refresh token lifetime (default 7d)
ALLOWED_ORIGINS	Comma-separated list of allowed CORS origins
Generate secrets with:

node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
🧪 Running Tests
# All workspaces
npm test --workspaces --if-present

# Individual
npm test --workspace=backend
npm test --workspace=mfe-auth
npm test --workspace=mfe-store
npm test --workspace=mfe-checkout
🔒 Security Notes
Access tokens are memory-only (never persisted to storage)
Refresh tokens are stored as bcrypt hashes in the database and rotated on every use
.env.production is git-ignored — never commit real secrets
All containers run as non-root users
CORS is restricted to an explicit allowlist via ALLOWED_ORIGINS
