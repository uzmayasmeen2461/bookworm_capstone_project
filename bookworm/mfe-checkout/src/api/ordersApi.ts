import { getAuth, postAuth, patchAuth } from '../../../shared/src/apiClient';

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  book: {
    id: string;
    title: string;
    coverImage: string | null;
    format: string;
    authorName: string;
  };
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  status: OrderStatus;
  total_amount: number;
  tax_amount: number;
  discount: number;
  payment_method: string;
  payment_status: string;
  coupon_code: string | null;
  created_at: string;
  items: OrderItem[];
}

export const ordersApi = {
  getAll: () =>
    getAuth<{ orders: Order[] }>('/orders'),

  getById: (id: string) =>
    getAuth<Order>(`/orders/${id}`),

  cancel: (id: string) =>
    patchAuth<{ message: string }>(`/orders/${id}/cancel`, {}),
};
