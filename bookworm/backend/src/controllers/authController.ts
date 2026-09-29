import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import pool from '../db/connection';

// Generates a short-lived access token (15 min) and long-lived refresh token (7 days).
// Access token is sent with every API request.
// Refresh token is used only to get a new access token when it expires.
const generateTokens = (user: { id: string; email: string; role: string }) => {
  const accessOptions: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn'],
  };
  const refreshOptions: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  };

  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    accessOptions
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET!,
    refreshOptions
  );

  return { accessToken, refreshToken };
};

// POST /auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Hash password — never store plaintext
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role, gift_points, created_at`,
      [name, email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];
    const tokens = generateTokens(user);

    // Store refresh token hash in DB for rotation validation
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 8);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshHash, expiresAt]
    );

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, giftPoints: user.gift_points },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch {
    res.status(500).json({ error: 'Registration failed' });
  }
};

// POST /auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash, role, gift_points FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Same message for wrong email AND wrong password — prevents user enumeration
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const tokens = generateTokens(user);

    // Store refresh token hash
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 8);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshHash, expiresAt]
    );

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, giftPoints: user.gift_points },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
};

// POST /auth/refresh
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;

  if (!token) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { id: string };

    // Look up stored refresh tokens for this user
    const stored = await pool.query(
      'SELECT id, token_hash FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()',
      [decoded.id]
    );

    // Validate token against stored hashes
    let validRecord = null;
    for (const row of stored.rows) {
      const match = await bcrypt.compare(token, row.token_hash);
      if (match) { validRecord = row; break; }
    }

    if (!validRecord) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    // Rotate — delete old token, issue new pair
    await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [validRecord.id]);

    const userResult = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [decoded.id]
    );
    const user = userResult.rows[0];
    const tokens = generateTokens(user);

    const refreshHash = await bcrypt.hash(tokens.refreshToken, 8);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshHash, expiresAt]
    );

    res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

// POST /auth/logout
export const logout = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { id: string };
      // Delete all refresh tokens for this user (logout from all devices)
      await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [decoded.id]);
    } catch {
      // Token invalid — still return success (idempotent logout)
    }
  }

  res.json({ message: 'Logged out successfully' });
};
