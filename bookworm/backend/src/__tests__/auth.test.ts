/**
 * Integration tests for POST /auth/* routes
 *
 * What we test:
 *  1. POST /auth/register — happy path returns user + tokens
 *  2. POST /auth/register — rejects duplicate email (409)
 *  3. POST /auth/register — rejects invalid email (400)
 *  4. POST /auth/register — rejects short password (400)
 *  5. POST /auth/login    — happy path returns user + tokens
 *  6. POST /auth/login    — wrong password returns 401
 *  7. POST /auth/login    — unknown email returns 401
 *  8. POST /auth/refresh  — missing token returns 400
 *  9. POST /auth/logout   — always returns 200 regardless
 *
 * The DB pool is fully mocked — no live Postgres needed.
 */
import request from 'supertest';
import app from '../app';

// ── Mock the database pool ────────────────────────────────────────────────────
// We mock at the module level so controllers never touch a real DB.
const mockQuery = jest.fn();
jest.mock('../db/connection', () => ({
  __esModule: true,
  default: { query: (...args: any[]) => mockQuery(...args) },
}));

// ── Mock bcryptjs to make tests fast (no real hashing) ───────────────────────
jest.mock('bcryptjs', () => ({
  hash:    jest.fn().mockResolvedValue('$hashed$'),
  compare: jest.fn(),
}));

import bcrypt from 'bcryptjs';
const mockBcryptCompare = bcrypt.compare as jest.Mock;

// ── Mock JWT so we don't need real secrets set ────────────────────────────────
jest.mock('jsonwebtoken', () => ({
  sign:   jest.fn().mockReturnValue('mock.access.token'),
  verify: jest.fn(),
}));

import jwt from 'jsonwebtoken';
const mockJwtVerify = jwt.verify as jest.Mock;

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  beforeEach(() => mockQuery.mockReset());

  it('creates a user and returns tokens (201)', async () => {
    // 1st call: check existing (none)
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 2nd call: INSERT user → returns new row
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'customer', gift_points: 0 }],
    });
    // 3rd call: INSERT refresh token
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'Password1' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('alice@test.com');
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('returns 409 when email already exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'u-existing' }] });

    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'Password1' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Alice', email: 'not-an-email', password: 'Password1' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'Sh0rt' });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockBcryptCompare.mockReset();
  });

  it('returns user and tokens on valid credentials (200)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'u1', name: 'Alice', email: 'alice@test.com', password_hash: '$hashed$', role: 'customer', gift_points: 0 }],
    });
    mockBcryptCompare.mockResolvedValue(true);
    mockQuery.mockResolvedValueOnce({ rows: [] }); // INSERT refresh token

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@test.com', password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@test.com');
    expect(res.body.accessToken).toBe('mock.access.token');
  });

  it('returns 401 for wrong password', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'u1', name: 'Alice', email: 'alice@test.com', password_hash: '$hashed$', role: 'customer', gift_points: 0 }],
    });
    mockBcryptCompare.mockResolvedValue(false);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@test.com', password: 'WrongPass1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it('returns 401 for unknown email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'ghost@test.com', password: 'Password1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /auth/refresh', () => {
  it('returns 400 when no refreshToken body', async () => {
    const res = await request(app).post('/auth/refresh').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/refresh token required/i);
  });

  it('returns 401 for invalid refresh token', async () => {
    mockJwtVerify.mockImplementationOnce(() => { throw new Error('invalid'); });

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'bad.token.here' });

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  it('returns 200 with no token (idempotent)', async () => {
    const res = await request(app).post('/auth/logout').send({});
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);
  });
});
