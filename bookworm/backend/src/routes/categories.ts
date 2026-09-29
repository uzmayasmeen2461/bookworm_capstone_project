import { Router } from 'express';
import pool from '../db/connection';

const router = Router();

// GET /categories
router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, slug FROM categories ORDER BY name ASC'
    );
    res.json({ categories: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /categories/:slug/books  — books for a specific category
router.get('/:slug/books', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.id, b.title, b.price, b.format, b.cover_image, b.rating, b.delivery_days,
             a.name as author_name, c.name as category_name, c.slug as category_slug,
             COALESCE((SELECT array_agg(tag) FROM book_tags WHERE book_id = b.id), '{}') as tags
      FROM books b
      JOIN authors a ON a.id = b.author_id
      JOIN categories c ON c.id = b.category_id
      WHERE c.slug = $1
      ORDER BY b.rating DESC
    `, [req.params.slug]);

    res.json({ books: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch category books' });
  }
});

export default router;
