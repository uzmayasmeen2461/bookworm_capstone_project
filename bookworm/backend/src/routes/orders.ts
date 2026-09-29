import { Router, Response } from 'express';
import pool from '../db/connection';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body } from 'express-validator';
import { validationResult } from 'express-validator';

const router = Router();
router.use(authMiddleware);

// GET /orders — user's order history
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const orders = await pool.query(`
      SELECT o.id, o.status, o.total_amount, o.tax_amount, o.discount,
             o.payment_method, o.payment_status, o.coupon_code, o.created_at,
             json_agg(
               json_build_object(
                 'id', oi.id, 'quantity', oi.quantity, 'unitPrice', oi.unit_price,
                 'book', json_build_object(
                   'id', b.id, 'title', b.title, 'coverImage', b.cover_image,
                   'format', b.format, 'authorName', a.name
                 )
               )
             ) as items
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN books b ON b.id = oi.book_id
      JOIN authors a ON a.id = b.author_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [req.user!.id]);

    res.json({ orders: orders.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /orders/:id — single order detail
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const order = await pool.query(`
      SELECT o.*, row_to_json(ad) as address,
             json_agg(json_build_object(
               'id', oi.id, 'quantity', oi.quantity, 'unitPrice', oi.unit_price,
               'book', json_build_object('id', b.id, 'title', b.title,
                         'coverImage', b.cover_image, 'format', b.format,
                         'authorName', a.name)
             )) as items
      FROM orders o
      LEFT JOIN addresses ad ON ad.id = o.address_id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN books b ON b.id = oi.book_id
      JOIN authors a ON a.id = b.author_id
      WHERE o.id = $1 AND o.user_id = $2
      GROUP BY o.id, ad.id
    `, [req.params.id, req.user!.id]);

    if (order.rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json(order.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /orders — create order from cart
router.post('/',
  [
    body('addressId').isUUID().withMessage('Valid address required'),
    body('paymentMethod')
      .isIn(['credit_card', 'debit_card', 'upi', 'wallet'])
      .withMessage('Valid payment method required'),
    body('couponCode').optional().isString(),
    body('useGiftPoints').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { addressId, paymentMethod, couponCode, useGiftPoints } = req.body;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get user's cart items
      const cartResult = await client.query(`
        SELECT ci.quantity, b.id as book_id, b.price, b.stock, b.title
        FROM carts c
        JOIN cart_items ci ON ci.cart_id = c.id
        JOIN books b ON b.id = ci.book_id
        WHERE c.user_id = $1
      `, [req.user!.id]);

      if (cartResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Cart is empty' });
        return;
      }

      // Check stock for all items
      for (const item of cartResult.rows) {
        if (item.stock < item.quantity) {
          await client.query('ROLLBACK');
          res.status(400).json({ error: `"${item.title}" is out of stock` });
          return;
        }
      }

      // Calculate totals
      const subtotal = cartResult.rows.reduce(
        (sum: number, i: any) => sum + parseFloat(i.price) * i.quantity, 0
      );
      const taxAmount = parseFloat((subtotal * 0.12).toFixed(2));

      // Gift points discount (1 point = ₹1, max 10% of order)
      let discount = 0;
      if (useGiftPoints) {
        const userResult = await client.query(
          'SELECT gift_points FROM users WHERE id = $1', [req.user!.id]
        );
        const points = userResult.rows[0]?.gift_points || 0;
        discount = Math.min(points, subtotal * 0.1);
      }

      const totalAmount = parseFloat((subtotal + taxAmount - discount).toFixed(2));

      // Create order
      const orderResult = await client.query(`
        INSERT INTO orders (user_id, address_id, total_amount, tax_amount, discount,
                            coupon_code, payment_method, payment_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        RETURNING id
      `, [req.user!.id, addressId, totalAmount, taxAmount, discount, couponCode || null, paymentMethod]);

      const orderId = orderResult.rows[0].id;

      // Insert order items + decrement stock
      for (const item of cartResult.rows) {
        await client.query(
          'INSERT INTO order_items (order_id, book_id, quantity, unit_price) VALUES ($1,$2,$3,$4)',
          [orderId, item.book_id, item.quantity, item.price]
        );
        await client.query(
          'UPDATE books SET stock = stock - $1, total_sold = total_sold + $1 WHERE id = $2',
          [item.quantity, item.book_id]
        );
      }

      // Deduct gift points if used
      if (useGiftPoints && discount > 0) {
        await client.query(
          'UPDATE users SET gift_points = gift_points - $1 WHERE id = $2',
          [Math.floor(discount), req.user!.id]
        );
      }

      // Clear cart
      await client.query(
        'DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1)',
        [req.user!.id]
      );

      await client.query('COMMIT');
      res.status(201).json({ orderId, totalAmount, status: 'pending' });
    } catch {
      await client.query('ROLLBACK');
      res.status(500).json({ error: 'Failed to create order' });
    } finally {
      client.release();
    }
  }
);

// PATCH /orders/:id/cancel — cancel within 48 hours
router.patch('/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const order = await pool.query(
      'SELECT id, status, created_at FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );

    if (order.rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const { status, created_at } = order.rows[0];
    const hoursElapsed = (Date.now() - new Date(created_at).getTime()) / 3600000;

    if (status === 'cancelled') {
      res.status(400).json({ error: 'Order already cancelled' });
      return;
    }
    if (status === 'delivered') {
      res.status(400).json({ error: 'Delivered orders cannot be cancelled' });
      return;
    }
    if (hoursElapsed > 48) {
      res.status(400).json({ error: 'Orders can only be cancelled within 48 hours' });
      return;
    }

    await pool.query(
      "UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
      [req.params.id]
    );

    res.json({ message: 'Order cancelled successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

export default router;


