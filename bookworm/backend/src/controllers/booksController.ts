import { Request, Response } from 'express';
import pool from '../db/connection';

// GET /books
// Supports: ?category=slug &search=text &format=Paperback &language=English
//           &minPrice=0 &maxPrice=999 &sort=price_asc|price_desc|rating|relevance
//           &page=1 &limit=20
export const getBooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      category, search, format, language,
      minPrice, maxPrice, sort = 'relevance',
      page = '1', limit = '20',
    } = req.query as Record<string, string>;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (category) {
      params.push(category);
      conditions.push(`c.slug = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(b.title ILIKE $${params.length} OR a.name ILIKE $${params.length})`);
    }
    if (format) {
      params.push(format);
      conditions.push(`b.format = $${params.length}`);
    }
    if (language) {
      params.push(language);
      conditions.push(`b.language = $${params.length}`);
    }
    if (minPrice) {
      params.push(parseFloat(minPrice));
      conditions.push(`b.price >= $${params.length}`);
    }
    if (maxPrice) {
      params.push(parseFloat(maxPrice));
      conditions.push(`b.price <= $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const orderMap: Record<string, string> = {
      price_asc:  'b.price ASC',
      price_desc: 'b.price DESC',
      rating:     'b.rating DESC',
      relevance:  'b.total_sold DESC',
    };
    const orderBy = orderMap[sort] || orderMap.relevance;

    const query = `
      SELECT b.id, b.title, b.price, b.format, b.language, b.cover_image,
             b.rating, b.total_sold, b.is_bestseller, b.is_new_launch,
             b.is_featured, b.delivery_days,
             a.id as author_id, a.name as author_name,
             c.id as category_id, c.name as category_name, c.slug as category_slug,
             COALESCE(
               (SELECT array_agg(tag) FROM book_tags WHERE book_id = b.id), '{}'
             ) as tags
      FROM books b
      JOIN authors a ON a.id = b.author_id
      JOIN categories c ON c.id = b.category_id
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(parseInt(limit), offset);
    const result = await pool.query(query, params);

    // Count total for pagination
    const countQuery = `
      SELECT COUNT(*) FROM books b
      JOIN authors a ON a.id = b.author_id
      JOIN categories c ON c.id = b.category_id
      ${where}
    `;
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      books: result.rows.map(formatBook),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch books' });
  }
};

// GET /books/featured  — Recommended, Bestsellers, New Launches sections
export const getFeaturedBooks = async (_req: Request, res: Response): Promise<void> => {
  try {
    const baseSelect = `
      SELECT b.id, b.title, b.price, b.format, b.cover_image, b.rating,
             b.delivery_days, b.is_bestseller, b.is_new_launch, b.is_featured,
             a.id as author_id, a.name as author_name,
             c.id as category_id, c.name as category_name, c.slug as category_slug,
             COALESCE((SELECT array_agg(tag) FROM book_tags WHERE book_id = b.id), '{}') as tags
      FROM books b JOIN authors a ON a.id = b.author_id JOIN categories c ON c.id = b.category_id
    `;

    const [recommended, bestsellers, newLaunches] = await Promise.all([
      pool.query(`${baseSelect} WHERE b.is_featured = true ORDER BY b.rating DESC LIMIT 6`),
      pool.query(`${baseSelect} WHERE b.is_bestseller = true ORDER BY b.total_sold DESC LIMIT 6`),
      pool.query(`${baseSelect} WHERE b.is_new_launch = true ORDER BY b.created_at DESC LIMIT 6`),
    ]);

    res.json({
      recommended: recommended.rows.map(formatBook),
      bestsellers: bestsellers.rows.map(formatBook),
      newLaunches: newLaunches.rows.map(formatBook),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch featured books' });
  }
};

// GET /books/:id
export const getBookById = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT b.*, a.id as author_id, a.name as author_name, a.bio as author_bio,
             a.photo_url as author_photo,
             c.id as category_id, c.name as category_name, c.slug as category_slug,
             COALESCE((SELECT array_agg(tag) FROM book_tags WHERE book_id = b.id), '{}') as tags
      FROM books b
      JOIN authors a ON a.id = b.author_id
      JOIN categories c ON c.id = b.category_id
      WHERE b.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    const book = result.rows[0];

    // Related books — same category, excluding this book
    const related = await pool.query(`
      SELECT b.id, b.title, b.price, b.format, b.cover_image, b.rating, b.delivery_days,
             a.name as author_name,
             c.name as category_name, c.slug as category_slug,
             COALESCE((SELECT array_agg(tag) FROM book_tags WHERE book_id = b.id), '{}') as tags
      FROM books b JOIN authors a ON a.id = b.author_id JOIN categories c ON c.id = b.category_id
      WHERE b.category_id = $1 AND b.id != $2
      ORDER BY b.rating DESC LIMIT 4
    `, [book.category_id, book.id]);

    res.json({
      ...formatBook(book),
      author: { id: book.author_id, name: book.author_name, bio: book.author_bio, photo: book.author_photo },
      relatedBooks: related.rows.map(formatBook),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch book' });
  }
};

// GET /books/recommended — personalised (based on order history) or featured fallback
export const getRecommended = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user?.id;

  try {
    let books;

    if (userId) {
      // Get categories from user's past orders
      books = await pool.query(`
        SELECT DISTINCT b.id, b.title, b.price, b.format, b.cover_image, b.rating,
               b.delivery_days, a.name as author_name,
               c.name as category_name, c.slug as category_slug,
               COALESCE((SELECT array_agg(tag) FROM book_tags WHERE book_id = b.id), '{}') as tags
        FROM books b
        JOIN authors a ON a.id = b.author_id
        JOIN categories c ON c.id = b.category_id
        WHERE b.category_id IN (
          SELECT DISTINCT b2.category_id FROM orders o
          JOIN order_items oi ON oi.order_id = o.id
          JOIN books b2 ON b2.id = oi.book_id
          WHERE o.user_id = $1
        )
        AND b.id NOT IN (
          SELECT oi2.book_id FROM orders o2
          JOIN order_items oi2 ON oi2.order_id = o2.id
          WHERE o2.user_id = $1
        )
        ORDER BY b.rating DESC LIMIT 6
      `, [userId]);
    }

    // Fallback to featured if no history or no results
    if (!books || books.rows.length === 0) {
      books = await pool.query(`
        SELECT b.id, b.title, b.price, b.format, b.cover_image, b.rating,
               b.delivery_days, a.name as author_name,
               c.name as category_name, c.slug as category_slug,
               COALESCE((SELECT array_agg(tag) FROM book_tags WHERE book_id = b.id), '{}') as tags
        FROM books b JOIN authors a ON a.id = b.author_id JOIN categories c ON c.id = b.category_id
        WHERE b.is_featured = true ORDER BY b.rating DESC LIMIT 6
      `);
    }

    res.json({ books: books.rows.map(formatBook) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
};

// Helper — maps flat SQL row to nested API shape
const formatBook = (row: Record<string, any>) => ({
  id:          row.id,
  title:       row.title,
  price:       parseFloat(row.price),
  format:      row.format,
  language:    row.language,
  coverImage:  row.cover_image,
  rating:      parseFloat(row.rating || 0),
  totalSold:   row.total_sold,
  isBestseller: row.is_bestseller,
  isNewLaunch: row.is_new_launch,
  isFeatured:  row.is_featured,
  deliveryDays: row.delivery_days,
  tags:        row.tags || [],
  author: { id: row.author_id, name: row.author_name },
  category: { id: row.category_id, name: row.category_name, slug: row.category_slug },
});
