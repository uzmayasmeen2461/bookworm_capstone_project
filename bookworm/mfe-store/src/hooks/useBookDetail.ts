import { useState, useEffect } from 'react';
import { booksApi, BookDetail } from '../api/booksApi';

export const useBookDetail = (id: string) => {
  const [book, setBook]       = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    booksApi.getBookById(id)
      .then(res  => { if (!cancelled) setBook(res); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(()=> { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  return { book, loading, error };
};
