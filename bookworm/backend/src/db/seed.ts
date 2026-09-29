import pool from './connection';
import bcrypt from 'bcryptjs';

// ── Cover images ──────────────────────────────────────────────────────────────
// Using Open Library Covers API — free, no API key, stable URLs.
// Format: https://covers.openlibrary.org/b/isbn/<ISBN>-L.jpg
// Each cover is hand-picked to match the genre/mood of our fictional titles.
// Titles and real-world ISBNs matching the exact titles or matching cover graphics
const COVERS: Record<string, string> = {
  // Self-help / minimalism / productivity
  'The Joy of Minimalism':  '',
  'The Art of Focus':       '',
  'The Art of Learning':    'https://covers.openlibrary.org/b/isbn/9780743277464-L.jpg', // The Art of Learning – Josh Waitzkin
  'The Path to Success':    '',

  // Fiction / thriller
  'The Midnight Hour':      'https://covers.openlibrary.org/b/isbn/9781524789978-L.jpg', // The Midnight Hour
  'Beneath the Stars':      'https://covers.openlibrary.org/b/isbn/9781542093019-L.jpg', // Beneath the Stars
  'The Final Frontier':     'https://covers.openlibrary.org/b/isbn/9780441237760-L.jpg', // The Final Frontier
  'The Vanishing House':    '',
  'The Lost Kitten':        'https://covers.openlibrary.org/b/isbn/9780316301381-L.jpg', // The Lost Kitten - Holly Webb
};

const seed = async () => {
  console.info('[Seed] Starting...');

  // ── Categories ────────────────────────────────────────────────────────────
  const categories = [
    { name: 'Romance',                slug: 'romance' },
    { name: 'Mystery',                slug: 'mystery' },
    { name: 'Science Fiction',        slug: 'science-fiction' },
    { name: 'Fantasy',                slug: 'fantasy' },
    { name: 'Historical',             slug: 'historical' },
    { name: 'Biography',              slug: 'biography' },
    { name: 'Self-help',              slug: 'self-help' },
    { name: 'Memoir',                 slug: 'memoir' },
    { name: 'Travel',                 slug: 'travel' },
    { name: 'Cooking',                slug: 'cooking' },
    { name: "Children's",             slug: 'childrens' },
    { name: 'Young Adult',            slug: 'young-adult' },
    { name: 'Comics & Graphic Novels',slug: 'comics-graphic-novels' },
    { name: 'Poetry',                 slug: 'poetry' },
    { name: 'Drama',                  slug: 'drama' },
    { name: 'Science',                slug: 'science' },
    { name: 'Philosophy',             slug: 'philosophy' },
    { name: 'Religion',               slug: 'religion' },
    { name: 'Language Learning',      slug: 'language-learning' },
    { name: 'Non-Fiction',            slug: 'non-fiction' },
    { name: 'Fiction',                slug: 'fiction' },
  ];

  const categoryIds: Record<string, string> = {};
  for (const cat of categories) {
    const res = await pool.query(
      `INSERT INTO categories (name, slug) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = $1 RETURNING id`,
      [cat.name, cat.slug]
    );
    categoryIds[cat.slug] = res.rows[0].id;
  }
  console.info('[Seed] Categories done');

  // ── Authors ───────────────────────────────────────────────────────────────
  const authors = [
    { name: 'Daniel Reed',    bio: 'A writer, minimalist, and productivity coach based in San Francisco.' },
    { name: 'Arjun Patel',    bio: 'Practical guide to mastering focus & boosting productivity every day.' },
    { name: 'Raj Patel',      bio: 'Master the mindset and methods for effective lifelong learning.' },
    { name: 'James Wright',   bio: 'A practical guide to achieving goals with clarity and confidence.' },
    { name: 'James Adams',    bio: 'Haunting tale of a man\'s journey & the shadows of a forgotten past.' },
    { name: 'Jessica Martin', bio: 'A heartwarming tale, where two souls discover who you need.' },
    { name: 'Laura Mitchell', bio: 'A mission to space secrets to change humanity forever.' },
    { name: 'Clara Nelson',   bio: 'A chilling mystery unfolds within a house that disappears.' },
    { name: 'Emily Parker',   bio: 'A heartwarming tale of courage, friendship, and feline adventure.' },
  ];

  const authorIds: Record<string, string> = {};
  for (const author of authors) {
    const res = await pool.query(
      `INSERT INTO authors (name, bio) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING id`,
      [author.name, author.bio]
    );
    if (res.rows.length > 0) authorIds[author.name] = res.rows[0].id;
    else {
      const existing = await pool.query('SELECT id FROM authors WHERE name = $1', [author.name]);
      authorIds[author.name] = existing.rows[0].id;
    }
  }
  console.info('[Seed] Authors done');

  // ── Books ─────────────────────────────────────────────────────────────────
  const books = [
    {
      title: 'The Joy of Minimalism', author: 'Daniel Reed',
      category: 'self-help', price: 149, format: 'Paperback',
      description: 'Declutter your life to uncover peace, clarity, and joy.',
      rating: 4.3, totalSold: 145, stock: 50,
      isFeatured: true, isBestseller: false, isNewLaunch: true,
      tags: ['Non-fiction', 'Self Help'],
    },
    {
      title: 'The Art of Focus', author: 'Arjun Patel',
      category: 'self-help', price: 399, format: 'Paperback',
      description: 'Practical guide to mastering focus & boosting productivity every day.',
      rating: 4.5, totalSold: 320, stock: 40,
      isFeatured: true, isBestseller: false, isNewLaunch: false,
      tags: ['Non-fiction', 'Self Help'],
    },
    {
      title: 'The Art of Learning', author: 'Raj Patel',
      category: 'self-help', price: 259, format: 'Paperback',
      description: 'Master the mindset and methods for effective lifelong learning.',
      rating: 4.4, totalSold: 210, stock: 35,
      isFeatured: true, isBestseller: false, isNewLaunch: false,
      tags: ['Non-fiction', 'Self Help'],
    },
    {
      title: 'The Path to Success', author: 'James Wright',
      category: 'self-help', price: 359, format: 'Paperback',
      description: 'A practical guide to achieving goals with clarity and confidence.',
      rating: 4.2, totalSold: 180, stock: 60,
      isFeatured: true, isBestseller: false, isNewLaunch: false,
      tags: ['Non-fiction', 'Self Help'],
    },
    {
      title: 'The Midnight Hour', author: 'James Adams',
      category: 'fiction', price: 299, format: 'Paperback',
      description: "Haunting tale of a man's journey & the shadows of a forgotten past.",
      rating: 4.6, totalSold: 500, stock: 25,
      isFeatured: false, isBestseller: true, isNewLaunch: false,
      tags: ['Fiction', 'Thriller', 'Horror'],
    },
    {
      title: 'Beneath the Stars', author: 'Jessica Martin',
      category: 'fiction', price: 499, format: 'Hardcover',
      description: 'A heartwarming tale, where two souls discover who you need.',
      rating: 4.7, totalSold: 620, stock: 15,
      isFeatured: false, isBestseller: true, isNewLaunch: false,
      tags: ['Fiction', 'Love', 'Drama'],
    },
    {
      title: 'The Final Frontier', author: 'Laura Mitchell',
      category: 'science-fiction', price: 359, format: 'Paperback',
      description: 'A mission to space secrets to change humanity forever.',
      rating: 4.5, totalSold: 410, stock: 30,
      isFeatured: false, isBestseller: true, isNewLaunch: false,
      tags: ['Fiction', 'Thriller'],
    },
    {
      title: 'The Vanishing House', author: 'Clara Nelson',
      category: 'mystery', price: 99, format: 'eBook',
      description: 'A chilling mystery unfolds within a house that disappears.',
      rating: 4.1, totalSold: 95, stock: 999,
      isFeatured: false, isBestseller: false, isNewLaunch: true,
      tags: ['Fiction', 'Horror'],
    },
    {
      title: 'The Lost Kitten', author: 'Emily Parker',
      category: 'childrens', price: 339, format: 'Hardcover',
      description: 'A heartwarming tale of courage, friendship, and feline adventure.',
      rating: 4.8, totalSold: 750, stock: 80,
      isFeatured: false, isBestseller: false, isNewLaunch: true,
      tags: ['Fiction', 'Children'],
    },
  ];

  for (const book of books) {
    const categoryId = categoryIds[book.category];
    const authorId   = authorIds[book.author];
    if (!categoryId || !authorId) continue;

    const coverImage = COVERS[book.title] ? COVERS[book.title] : null;

    const res = await pool.query(`
      INSERT INTO books
        (title, author_id, category_id, description, price, format, cover_image,
         rating, total_sold, stock, is_featured, is_bestseller, is_new_launch)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (title) DO UPDATE SET cover_image = EXCLUDED.cover_image RETURNING id
    `, [
      book.title, authorId, categoryId, book.description, book.price,
      book.format, coverImage,
      book.rating, book.totalSold, book.stock,
      book.isFeatured, book.isBestseller, book.isNewLaunch,
    ]);

    if (res.rows.length > 0) {
      for (const tag of book.tags) {
        await pool.query(
          'INSERT INTO book_tags (book_id, tag) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [res.rows[0].id, tag]
        );
      }
    }
  }
  console.info('[Seed] Books done');

  // ── Demo user ─────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Demo@1234', 12);
  await pool.query(`
    INSERT INTO users (name, email, password_hash, gift_points)
    VALUES ('Demo User', 'demo@bookworm.com', $1, 100)
    ON CONFLICT (email) DO NOTHING
  `, [passwordHash]);
  console.info('[Seed] Demo user created: demo@bookworm.com / Demo@1234');

  console.info('[Seed] All done!');
};

// ── Standalone execution (called by docker-compose migrate service) ───────────
// When run directly: node -e "require('./dist/db/seed')"
// Ends the pool after completion so the process exits cleanly.
if (require.main === module) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error('[Seed] Failed:', err.message);
      process.exit(1);
    });
}

// ── Exported for use by index.ts startup (does NOT call pool.end()) ──────────
export { seed };
