import { getAuth, postAuth, deleteAuth } from '../../../shared/src/apiClient';
import { BookSummary } from './booksApi';

export interface WishlistResponse {
  books: BookSummary[];
}

export const wishlistApi = {
  getAll: ()              => getAuth<WishlistResponse>('/wishlist'),
  add:    (bookId: string) => postAuth(`/wishlist/${bookId}`, {}),
  remove: (bookId: string) => deleteAuth(`/wishlist/${bookId}`),
};
