import { Router, Response } from 'express';
import pool from '../db/connection';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body } from 'express-validator';
import { validationResult } from 'express-validator';

const router = Router();

// GET /reviews/:bookId — public
router.get('/:bookId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.rating, r.comment, r.created_at,
             u.name as user_name
      FROM reviews r JOIN users u ON u.id = r.user_id
      WHERE r.book_id = $1
      ORDER BY r.created_at DESC
    `, [req.params.bookId]);

    const avg = result.rows.length
      ? result.rows.reduce((s: number, r: any) => s + r.rating, 0) / result.rows.length
      : 0;

    res.json({ reviews: result.rows, averageRating: parseFloat(avg.toFixed(1)), total: result.rows.length });
  } catch {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /reviews — requires auth
router.post('/',
  authMiddleware,
  [
    body('bookId').isUUID(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().trim().isLength({ max: 1000 }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { bookId, rating, comment } = req.body;

    try {
      const result = await pool.query(`
        INSERT INTO reviews (user_id, book_id, rating, comment)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, book_id)
        DO UPDATE SET rating = $3, comment = $4
        RETURNING id, rating, comment, created_at
      `, [req.user!.id, bookId, rating, comment || null]);

      // Update book's average rating
      await pool.query(`
        UPDATE books SET rating = (
          SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE book_id = $1
        ) WHERE id = $1
      `, [bookId]);

      res.status(201).json(result.rows[0]);
    } catch {
      res.status(500).json({ error: 'Failed to submit review' });
    }
  }
);

export default router;


