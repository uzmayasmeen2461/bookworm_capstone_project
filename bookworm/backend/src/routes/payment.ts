import { Router, Response } from 'express';
import pool from '../db/connection';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body } from 'express-validator';
import { validationResult } from 'express-validator';
import crypto from 'crypto';

const router = Router();
router.use(authMiddleware);

// POST /payment/initiate — creates a payment session for an order
router.post('/initiate',
  [body('orderId').isUUID()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const order = await pool.query(
        'SELECT id, total_amount, payment_status FROM orders WHERE id = $1 AND user_id = $2',
        [req.body.orderId, req.user!.id]
      );

      if (order.rows.length === 0) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      if (order.rows[0].payment_status === 'completed') {
        res.status(400).json({ error: 'Order already paid' });
        return;
      }

      // Generate a payment session token (in production this would be from Razorpay/Stripe)
      const sessionToken = crypto.randomBytes(32).toString('hex');

      res.json({
        sessionToken,
        orderId: order.rows[0].id,
        amount: order.rows[0].total_amount,
        currency: 'INR',
      });
    } catch {
      res.status(500).json({ error: 'Failed to initiate payment' });
    }
  }
);

// POST /payment/confirm — marks payment as complete
router.post('/confirm',
  [body('orderId').isUUID(), body('sessionToken').notEmpty()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const order = await pool.query(
        'SELECT id, total_amount, user_id FROM orders WHERE id = $1 AND user_id = $2',
        [req.body.orderId, req.user!.id]
      );

      if (order.rows.length === 0) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Update order to confirmed + payment completed
      await pool.query(`
        UPDATE orders
        SET payment_status = 'completed', status = 'confirmed', updated_at = NOW()
        WHERE id = $1
      `, [req.body.orderId]);

      // Award gift points — 1 point per ₹10 spent
      const pointsEarned = Math.floor(order.rows[0].total_amount / 10);
      if (pointsEarned > 0) {
        await pool.query(
          'UPDATE users SET gift_points = gift_points + $1 WHERE id = $2',
          [pointsEarned, req.user!.id]
        );
      }

      res.json({
        message: 'Payment successful',
        orderId: req.body.orderId,
        pointsEarned,
      });
    } catch {
      res.status(500).json({ error: 'Payment confirmation failed' });
    }
  }
);

export default router;


