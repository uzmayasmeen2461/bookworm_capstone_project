import { getAuth, postAuth, patchAuth, deleteAuth } from '../../../shared/src/apiClient';

export interface CartItem {
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

export interface CartResponse {
  cartId: string;
  items: CartItem[];
}

export const cartApi = {
  get:        ()                              => getAuth<CartResponse>('/cart'),
  add:        (bookId: string, quantity = 1)  => postAuth<CartResponse>('/cart/items', { bookId, quantity }),
  updateQty:  (itemId: string, quantity: number) => patchAuth<CartResponse>(`/cart/items/${itemId}`, { quantity }),
  remove:     (itemId: string)                => deleteAuth<CartResponse>(`/cart/items/${itemId}`),
  clear:      ()                              => deleteAuth('/cart'),
};
