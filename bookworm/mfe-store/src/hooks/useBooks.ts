import { useState, useEffect } from 'react';
import { booksApi, BooksResponse, BooksFilters } from '../api/booksApi';

export const useBooks = (filters: BooksFilters) => {
  const [data, setData]       = useState<BooksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Serialise filters to trigger effect only when they actually change
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    booksApi.getBooks(JSON.parse(filterKey))
      .then(res  => { if (!cancelled) setData(res); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(()=> { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  return { data, loading, error };
};
