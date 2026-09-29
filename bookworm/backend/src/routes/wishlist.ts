import { Router, Response } from 'express';
import pool from '../db/connection';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// GET /wishlist — returns books in the same camelCase shape as /books
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT b.id, b.title, b.price, b.format, b.language, b.cover_image,
             b.rating, b.total_sold, b.is_bestseller, b.is_new_launch,
             b.is_featured, b.delivery_days,
             a.id as author_id, a.name as author_name,
             c.id as category_id, c.name as category_name, c.slug as category_slug,
             COALESCE(
               (SELECT array_agg(tag) FROM book_tags WHERE book_id = b.id), '{}'
             ) as tags
      FROM wishlists w
      JOIN books b ON b.id = w.book_id
      JOIN authors a ON a.id = b.author_id
      JOIN categories c ON c.id = b.category_id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
    `, [req.user!.id]);

    // Transform to the same camelCase shape BookCard expects
    const books = result.rows.map((row: any) => ({
      id:           row.id,
      title:        row.title,
      price:        parseFloat(row.price),
      format:       row.format,
      language:     row.language,
      coverImage:   row.cover_image,
      rating:       parseFloat(row.rating || 0),
      totalSold:    row.total_sold,
      isBestseller: row.is_bestseller,
      isNewLaunch:  row.is_new_launch,
      isFeatured:   row.is_featured,
      deliveryDays: row.delivery_days,
      tags:         row.tags || [],
      author:   { id: row.author_id,   name: row.author_name },
      category: { id: row.category_id, name: row.category_name, slug: row.category_slug },
    }));

    res.json({ books });
  } catch {
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// POST /wishlist/:bookId
router.post('/:bookId', async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      'INSERT INTO wishlists (user_id, book_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.user!.id, req.params.bookId]
    );
    res.status(201).json({ message: 'Added to wishlist' });
  } catch {
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// DELETE /wishlist/:bookId
router.delete('/:bookId', async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      'DELETE FROM wishlists WHERE user_id = $1 AND book_id = $2',
      [req.user!.id, req.params.bookId]
    );
    res.json({ message: 'Removed from wishlist' });
  } catch {
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

export default router;


