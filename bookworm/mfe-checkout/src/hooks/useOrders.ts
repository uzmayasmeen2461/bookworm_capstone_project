import { useState, useEffect, useCallback } from 'react';
import { ordersApi, Order } from '../api/ordersApi';
import { tokenStore } from '../../../shared/src/apiClient';

export const useOrders = () => {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchOrders = useCallback(() => {
    if (!tokenStore.get()) { setLoading(false); return; }
    setLoading(true);
    ordersApi.getAll()
      .then(res  => setOrders(res.orders))
      .catch(err => setError(err.message))
      .finally(()=> setLoading(false));
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const cancelOrder = useCallback(async (orderId: string): Promise<string | null> => {
    try {
      await ordersApi.cancel(orderId);
      // Optimistic update — mark as cancelled locally
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' as const } : o)
      );
      return null;
    } catch (err: any) {
      return err.message || 'Failed to cancel order';
    }
  }, []);

  return { orders, loading, error, cancelOrder, refetch: fetchOrders };
};
