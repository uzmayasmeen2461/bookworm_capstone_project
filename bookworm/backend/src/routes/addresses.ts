import { Router, Response } from 'express';
import pool from '../db/connection';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body } from 'express-validator';
import { validationResult } from 'express-validator';

const router = Router();
router.use(authMiddleware);

const addressRules = [
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('addressLine').trim().notEmpty(),
  body('city').trim().notEmpty(),
  body('state').trim().notEmpty(),
  body('pin').trim().isLength({ min: 4, max: 10 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').trim().notEmpty(),
  body('country').optional().trim(),
];

// GET /addresses
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user!.id]
    );
    res.json({ addresses: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// POST /addresses
router.post('/', addressRules, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { firstName, lastName, addressLine, city, state, pin, country, email, phone, isDefault } = req.body;

  try {
    if (isDefault) {
      // Un-default all existing addresses for this user
      await pool.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.user!.id]);
    }

    const result = await pool.query(`
      INSERT INTO addresses (user_id, first_name, last_name, address_line, city, state, pin, country, email, phone, is_default)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [req.user!.id, firstName, lastName, addressLine, city, state, pin, country || 'India', email, phone, isDefault || false]);

    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to save address' });
  }
});

export default router;


