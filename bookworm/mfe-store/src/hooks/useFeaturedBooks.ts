import { useState, useEffect } from 'react';
import { booksApi, FeaturedBooks } from '../api/booksApi';

export const useFeaturedBooks = () => {
  const [data, setData]       = useState<FeaturedBooks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    booksApi.getFeatured()
      .then(res  => { if (!cancelled) setData(res); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(()=> { if (!cancelled) setLoading(false); });

    // Cleanup — prevents state update on unmounted component
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
};
