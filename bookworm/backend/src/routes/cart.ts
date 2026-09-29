import { Router, Response } from 'express';
import pool from '../db/connection';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body, param } from 'express-validator';
import { validationResult } from 'express-validator';

const router = Router();

// All cart routes require authentication
router.use(authMiddleware);

const getOrCreateCart = async (userId: string): Promise<string> => {
  let cart = await pool.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
  if (cart.rows.length === 0) {
    cart = await pool.query(
      'INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [userId]
    );
  }
  return cart.rows[0].id;
};

const cartItemsQuery = `
  SELECT ci.id, ci.quantity,
         b.id as book_id, b.title, b.price, b.cover_image, b.format,
         b.delivery_days, a.name as author_name,
         c.name as category_name, c.slug as category_slug
  FROM cart_items ci
  JOIN books b ON b.id = ci.book_id
  JOIN authors a ON a.id = b.author_id
  JOIN categories c ON c.id = b.category_id
  WHERE ci.cart_id = $1
  ORDER BY ci.created_at ASC
`;

// GET /cart
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const cartId = await getOrCreateCart(req.user!.id);
    const items = await pool.query(cartItemsQuery, [cartId]);
    res.json({ cartId, items: items.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// POST /cart/items  — add book to cart
router.post('/items',
  [body('bookId').isUUID(), body('quantity').isInt({ min: 1, max: 10 })],
  async (req: AuthRequest, res: Response) => {
    if (!validationResult(req).isEmpty()) {
      res.status(400).json({ errors: validationResult(req).array() });
      return;
    }

    const { bookId, quantity } = req.body;

    try {
      const cartId = await getOrCreateCart(req.user!.id);

      // Upsert — if already in cart, increase quantity
      await pool.query(`
        INSERT INTO cart_items (cart_id, book_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (cart_id, book_id)
        DO UPDATE SET quantity = LEAST(cart_items.quantity + $3, 10)
      `, [cartId, bookId, quantity]);

      const items = await pool.query(cartItemsQuery, [cartId]);
      res.json({ cartId, items: items.rows });
    } catch {
      res.status(500).json({ error: 'Failed to add to cart' });
    }
  }
);

// PATCH /cart/items/:itemId — update quantity
router.patch('/items/:itemId',
  [param('itemId').isUUID(), body('quantity').isInt({ min: 1, max: 10 })],
  async (req: AuthRequest, res: Response) => {
    if (!validationResult(req).isEmpty()) {
      res.status(400).json({ errors: validationResult(req).array() });
      return;
    }

    try {
      const cartId = await getOrCreateCart(req.user!.id);
      await pool.query(
        'UPDATE cart_items SET quantity = $1 WHERE id = $2 AND cart_id = $3',
        [req.body.quantity, req.params.itemId, cartId]
      );
      const items = await pool.query(cartItemsQuery, [cartId]);
      res.json({ cartId, items: items.rows });
    } catch {
      res.status(500).json({ error: 'Failed to update cart' });
    }
  }
);

// DELETE /cart/items/:itemId
router.delete('/items/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    const cartId = await getOrCreateCart(req.user!.id);
    await pool.query(
      'DELETE FROM cart_items WHERE id = $1 AND cart_id = $2',
      [req.params.itemId, cartId]
    );
    const items = await pool.query(cartItemsQuery, [cartId]);
    res.json({ cartId, items: items.rows });
  } catch {
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

// DELETE /cart  — clear entire cart
router.delete('/', async (req: AuthRequest, res: Response) => {
  try {
    const cartId = await getOrCreateCart(req.user!.id);
    await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    res.json({ message: 'Cart cleared' });
  } catch {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;

