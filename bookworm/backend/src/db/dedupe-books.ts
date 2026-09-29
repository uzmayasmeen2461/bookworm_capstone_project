/**
 * dedupe-books.ts
 * Removes duplicate book rows, keeping the oldest (first inserted) copy of each title.
 * Safe to run multiple times.
 *
 * Run from bookworm/backend/:
 *   npx ts-node src/db/dedupe-books.ts
 */
import pool from './connection';

const dedupeBooks = async () => {
  console.info('[dedupe] Scanning for duplicate books...');

  // Find titles that appear more than once
  const dupes = await pool.query<{ title: string; count: string }>(`
    SELECT title, COUNT(*) as count
    FROM books
    GROUP BY title
    HAVING COUNT(*) > 1
    ORDER BY title
  `);

  if (dupes.rows.length === 0) {
    console.info('[dedupe] No duplicates found. Database is clean.');
    await pool.end();
    return;
  }

  console.info(`[dedupe] Found ${dupes.rows.length} duplicated title(s):`);
  dupes.rows.forEach(r => console.info(`  "${r.title}" appears ${r.count} times`));

  // For each duplicated title, keep the row with the earliest created_at,
  // delete all others. Also clean up dependent rows (book_tags, cart_items, etc.)
  let totalDeleted = 0;

  for (const { title } of dupes.rows) {
    // Get all rows for this title, ordered oldest first
    const rows = await pool.query<{ id: string }>(
      `SELECT id FROM books WHERE title = $1 ORDER BY created_at ASC`,
      [title]
    );

    // Keep the first (oldest), delete the rest
    const keepId   = rows.rows[0].id;
    const deleteIds = rows.rows.slice(1).map(r => r.id);

    for (const id of deleteIds) {
      // Delete dependent rows first (FK constraints)
      await pool.query('DELETE FROM book_tags   WHERE book_id = $1', [id]);
      await pool.query('DELETE FROM cart_items  WHERE book_id = $1', [id]);
      await pool.query('DELETE FROM order_items WHERE book_id = $1', [id]);
      await pool.query('DELETE FROM reviews     WHERE book_id = $1', [id]);
      await pool.query('DELETE FROM wishlists   WHERE book_id = $1', [id]);
      await pool.query('DELETE FROM books       WHERE id      = $1', [id]);
      totalDeleted++;
    }

    console.info(`  ✓ Kept ${keepId.slice(0, 8)}… for "${title}", removed ${deleteIds.length} duplicate(s)`);
  }

  console.info(`[dedupe] Done — removed ${totalDeleted} duplicate book row(s).`);
  await pool.end();
};

dedupeBooks().catch(err => {
  console.error('[dedupe] Failed:', err.message);
  process.exit(1);
});
