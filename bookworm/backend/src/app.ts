import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import YAML from 'yamljs';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import authRoutes      from './routes/auth';
import booksRoutes     from './routes/books';
import categoriesRoutes from './routes/categories';
import cartRoutes      from './routes/cart';
import ordersRoutes    from './routes/orders';
import reviewsRoutes   from './routes/reviews';
import wishlistRoutes  from './routes/wishlist';
import addressesRoutes from './routes/addresses';
import paymentRoutes   from './routes/payment';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();

// ── Security: only allow our MFE origins ─────────────────────────────────────
// ALLOWED_ORIGINS env var is a comma-separated list of allowed origins.
// Set it in your deployment (Render / VPS) to your actual frontend URLs.
// Example: https://bookworm-shell.onrender.com,https://bookworm-mfe-auth.onrender.com
const extraOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
  ...extraOrigins,
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman) in development
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10kb' })); // Limit request body size
app.use(express.urlencoded({ extended: true }));

// ── OpenAPI docs at /api-docs ──────────────────────────────────────────────────
const swaggerPath = path.join(__dirname, '../../swagger.yaml');
try {
  const swaggerDoc = YAML.load(swaggerPath);
  // Cast to any[] to satisfy the overloaded express use() signature
  app.use('/api-docs', ...(swaggerUi.serve as any), swaggerUi.setup(swaggerDoc) as any);
} catch {
  // Swagger file optional — don't crash if not present
}

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/auth',        authRoutes);
app.use('/books',       booksRoutes);
app.use('/categories',  categoriesRoutes);
app.use('/cart',        cartRoutes);
app.use('/orders',      ordersRoutes);
app.use('/reviews',     reviewsRoutes);
app.use('/wishlist',    wishlistRoutes);
app.use('/addresses',   addressesRoutes);
app.use('/payment',     paymentRoutes);

// ── Error handling (must be last) ─────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
