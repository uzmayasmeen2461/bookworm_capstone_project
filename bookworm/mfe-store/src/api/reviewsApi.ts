import { getAuth, postAuth } from '../../../shared/src/apiClient';

export interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user_name: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  averageRating: number;
  total: number;
}

export const reviewsApi = {
  // GET /reviews/:bookId — public
  getByBook: (bookId: string) =>
    getAuth<ReviewsResponse>(`/reviews/${bookId}`),

  // POST /reviews — requires auth
  submit: (bookId: string, rating: number, comment: string) =>
    postAuth('/reviews', { bookId, rating, comment }),
};
