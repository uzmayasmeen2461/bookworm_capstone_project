/**
 * Integration tests for GET /books/* routes
 *
 * What we test:
 *  1. GET /books/featured      — returns recommended/bestsellers/newLaunches shape
 *  2. GET /books               — returns books array + pagination
 *  3. GET /books               — supports ?search= query param
 *  4. GET /books/:id           — returns full book with relatedBooks
 *  5. GET /books/:id           — returns 404 for unknown id
 *  6. GET /books/recommended   — returns books array (featured fallback)
 *
 * The DB pool is fully mocked — no live Postgres needed.
 */
import request from 'supertest';
import app from '../app';

const mockQuery = jest.fn();
jest.mock('../db/connection', () => ({
  __esModule: true,
  default: { query: (...args: any[]) => mockQuery(...args) },
}));

// JWT mock so optionalAuth middleware doesn't throw
jest.mock('jsonwebtoken', () => ({
  sign:   jest.fn().mockReturnValue('tok'),
  verify: jest.fn().mockReturnValue({ id: 'u1', email: 'x@x.com', role: 'customer' }),
}));

// ── Sample row helper ─────────────────────────────────────────────────────────
const bookRow = (overrides: Record<string, any> = {}) => ({
  id:           'b1',
  title:        'Test Book',
  price:        '149.00',
  format:       'Paperback',
  language:     'English',
  cover_image:  null,
  rating:       '4.5',
  total_sold:   100,
  is_bestseller: false,
  is_new_launch: false,
  is_featured:   true,
  delivery_days: 3,
  tags:          ['Fiction'],
  author_id:    'a1',
  author_name:  'Author One',
  category_id:  'c1',
  category_name: 'Fiction',
  category_slug: 'fiction',
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /books/featured', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns recommended, bestsellers, newLaunches arrays', async () => {
    const rows = [bookRow()];
    // Three parallel queries via Promise.all
    mockQuery
      .mockResolvedValueOnce({ rows })  // recommended
      .mockResolvedValueOnce({ rows })  // bestsellers
      .mockResolvedValueOnce({ rows }); // newLaunches

    const res = await request(app).get('/books/featured');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.recommended)).toBe(true);
    expect(Array.isArray(res.body.bestsellers)).toBe(true);
    expect(Array.isArray(res.body.newLaunches)).toBe(true);
    expect(res.body.recommended[0].title).toBe('Test Book');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /books', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns books array and pagination', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [bookRow()] })           // books list
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });    // count

    const res = await request(app).get('/books');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.books)).toBe(true);
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.books[0].id).toBe('b1');
  });

  it('includes search param in query (no crash)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const res = await request(app).get('/books?search=Tolkien');

    expect(res.status).toBe(200);
    expect(res.body.books).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /books/:id', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns full book detail with relatedBooks', async () => {
    const row = bookRow({ author_bio: 'Bio text', author_photo: null });
    mockQuery
      .mockResolvedValueOnce({ rows: [row] })          // book detail
      .mockResolvedValueOnce({ rows: [bookRow()] });   // related books

    const res = await request(app).get('/books/b1');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('b1');
    expect(Array.isArray(res.body.relatedBooks)).toBe(true);
    expect(res.body.author.name).toBe('Author One');
  });

  it('returns 404 for unknown id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/books/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /books/recommended', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns featured books as fallback when no history', async () => {
    // No personalised results → featured fallback
    mockQuery
      .mockResolvedValueOnce({ rows: [] })             // personalised (empty)
      .mockResolvedValueOnce({ rows: [bookRow()] });   // featured fallback

    const res = await request(app).get('/books/recommended');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.books)).toBe(true);
  });
});
