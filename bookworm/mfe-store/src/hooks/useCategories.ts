import { useState, useEffect } from 'react';
import { categoriesApi, Category } from '../api/categoriesApi';

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    let cancelled = false;
    categoriesApi.getAll()
      .then(res  => { if (!cancelled) setCategories(res.categories); })
      .catch(()  => { /* silently fail — not critical */ })
      .finally(()=> { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { categories, loading };
};
