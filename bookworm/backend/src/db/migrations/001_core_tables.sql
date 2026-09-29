-- Migration 001: Core tables
-- Run order: users → categories → authors → books → book_tags

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'registered' CHECK (role IN ('guest','registered','admin')),
  gift_points   INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Categories ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) UNIQUE NOT NULL,
  slug       VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Authors ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS authors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  bio        TEXT,
  photo_url  VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Books ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(500) NOT NULL,
  author_id     UUID NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL,
  format        VARCHAR(20) NOT NULL DEFAULT 'Paperback' CHECK (format IN ('Paperback','Hardcover','eBook')),
  language      VARCHAR(50)  NOT NULL DEFAULT 'English',
  cover_image   VARCHAR(500),
  rating        NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  total_sold    INTEGER NOT NULL DEFAULT 0,
  stock         INTEGER NOT NULL DEFAULT 0,
  is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
  is_bestseller BOOLEAN NOT NULL DEFAULT FALSE,
  is_new_launch BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_days INTEGER NOT NULL DEFAULT 3,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Book Tags ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_tags (
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  tag     VARCHAR(100) NOT NULL,
  PRIMARY KEY (book_id, tag)
);

-- ── Indexes for common queries ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_books_category    ON books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_author      ON books(author_id);
CREATE INDEX IF NOT EXISTS idx_books_bestseller  ON books(is_bestseller);
CREATE INDEX IF NOT EXISTS idx_books_new_launch  ON books(is_new_launch);
CREATE INDEX IF NOT EXISTS idx_books_price       ON books(price);
