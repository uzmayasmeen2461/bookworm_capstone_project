-- Migration 003: Add unique constraint on books.title to prevent duplicate inserts
-- Run after 001 and 002.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'books_title_unique'
  ) THEN
    ALTER TABLE books ADD CONSTRAINT books_title_unique UNIQUE (title);
  END IF;
END $$;
