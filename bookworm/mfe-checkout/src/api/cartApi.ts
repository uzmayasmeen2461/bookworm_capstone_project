import { getAuth, postAuth } from '../../../shared/src/apiClient';

export interface CheckoutCartItem {
  id: string;
  quantity: number;
  book_id: string;
  title: string;
  price: number;
  cover_image: string | null;
  format: string;
  delivery_days: number;
  author_name: string;
  category_name: string;
  category_slug: string;
}

export const cartApi = {
  get:   ()                             => getAuth<{ cartId: string; items: CheckoutCartItem[] }>('/cart'),
  add:   (bookId: string, quantity = 1) => postAuth('/cart/items', { bookId, quantity }),
};
