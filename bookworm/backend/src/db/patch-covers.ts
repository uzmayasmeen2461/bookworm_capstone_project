/**
 * patch-covers.ts
 *
 * One-time script to update cover_image on existing book rows.
 * Run from bookworm/backend/:
 *   npx ts-node src/db/patch-covers.ts
 */
import pool from './connection';

const COVERS: Record<string, string | null> = {
  'The Joy of Minimalism':  null,
  'The Art of Focus':       null,
  'The Art of Learning':    'https://covers.openlibrary.org/b/isbn/9780743277464-L.jpg',
  'The Path to Success':    null,
  'The Midnight Hour':      'https://covers.openlibrary.org/b/isbn/9781524789978-L.jpg',
  'Beneath the Stars':      'https://covers.openlibrary.org/b/isbn/9781542093019-L.jpg',
  'The Final Frontier':     'https://covers.openlibrary.org/b/isbn/9780441237760-L.jpg',
  'The Vanishing House':    null,
  'The Lost Kitten':        'https://covers.openlibrary.org/b/isbn/9780316301381-L.jpg',
};

const patchCovers = async () => {
  console.info('[patch-covers] Updating cover images...');

  for (const [title, url] of Object.entries(COVERS)) {
    const res = await pool.query(
      `UPDATE books SET cover_image = $1 WHERE title = $2 RETURNING id, title`,
      [url, title]
    );
    if (res.rows.length > 0) {
      console.info(`  ✓ ${title}`);
    } else {
      console.warn(`  ✗ Not found: ${title}`);
    }
  }

  console.info('[patch-covers] Done!');
  await pool.end();
};

patchCovers().catch((err) => {
  console.error('[patch-covers] Failed:', err.message);
  process.exit(1);
});
