import { useState, useEffect } from 'react';
import { cartApi, CheckoutCartItem } from '../api/cartApi';
import { ensureToken } from '../../../shared/src/apiClient';

export const useCheckoutCart = () => {
  const [items, setItems]     = useState<CheckoutCartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasRefresh = !!(localStorage.getItem('bw_refresh') || sessionStorage.getItem('bw_refresh'));
    if (!hasRefresh) { setLoading(false); return; }

    ensureToken().then(hasToken => {
      if (!hasToken) { setLoading(false); return; }
      cartApi.get()
        .then(res  => setItems(res.items))
        .catch(()  => {})
        .finally(()=> setLoading(false));
    });
  }, []);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax      = parseFloat((subtotal * 0.12).toFixed(2));

  return { items, loading, subtotal, tax };
};
