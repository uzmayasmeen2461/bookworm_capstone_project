import { useState, useEffect } from 'react';
import { booksApi, BookSummary } from '../api/booksApi';
import { tokenStore } from '../../../shared/src/apiClient';

export const useRecommendations = () => {
  const [books, setBooks]     = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Use personalised if logged in, otherwise featured
    const fetch = tokenStore.get()
      ? booksApi.getRecommended().then(r => r.books)
      : booksApi.getFeatured().then(r => r.recommended);

    fetch
      .then(b  => { if (!cancelled) setBooks(b.slice(0, 4)); })
      .catch(() => {/* non-critical */ })
      .finally(()=> { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  return { books, loading };
};
