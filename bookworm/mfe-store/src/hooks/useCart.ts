import { useState, useEffect, useCallback } from 'react';
import { cartApi, CartItem, CartResponse } from '../api/cartApi';
import { ensureToken } from '../../../shared/src/apiClient';

export const useCart = () => {
  const [items, setItems]     = useState<CartItem[]>([]);
  const [cartId, setCartId]   = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const applyResponse = (res: CartResponse) => {
    setItems(res.items);
    setCartId(res.cartId);
    window.dispatchEvent(
      new CustomEvent('bw:cart:updated', { detail: { count: res.items.length } })
    );
  };

  // Fetch cart on mount — ensure token first, then fetch
  useEffect(() => {
    const hasRefresh = !!(localStorage.getItem('bw_refresh') || sessionStorage.getItem('bw_refresh'));
    if (!hasRefresh) { setLoading(false); return; }
    ensureToken().then(hasToken => {
      if (!hasToken) { setLoading(false); return; }
      cartApi.get()
        .then(applyResponse)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    });
  }, []);

  // Also re-fetch when a book-detail page adds to cart
  useEffect(() => {
    const handleAdded = () => {
      const hasRefresh = !!(localStorage.getItem('bw_refresh') || sessionStorage.getItem('bw_refresh'));
      if (!hasRefresh) return;
      cartApi.get().then(applyResponse).catch(() => {});
    };
    window.addEventListener('bw:cart:added', handleAdded);
    return () => window.removeEventListener('bw:cart:added', handleAdded);
  }, []);

  const updateQty = useCallback(async (itemId: string, qty: number) => {
    try {
      const res = await cartApi.updateQty(itemId, qty);
      applyResponse(res);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    try {
      const res = await cartApi.remove(itemId);
      applyResponse(res);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // Derived totals
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax      = parseFloat((subtotal * 0.12).toFixed(2));
  const total    = parseFloat((subtotal + tax).toFixed(2));

  return { items, cartId, loading, error, updateQty, removeItem, subtotal, tax, total };
};
