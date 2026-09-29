import { get, getAuth } from '../../../shared/src/apiClient';

export interface BookSummary {
  id: string;
  title: string;
  price: number;
  format: string;
  language: string;
  coverImage: string | null;
  rating: number;
  totalSold: number;
  isBestseller: boolean;
  isNewLaunch: boolean;
  isFeatured: boolean;
  deliveryDays: number;
  tags: string[];
  author: { id: string; name: string };
  category: { id: string; name: string; slug: string };
}

export interface BookDetail extends BookSummary {
  description: string;
  stock: number;
  author: {
    id: string;
    name: string;
    bio: string;
    photo: string | null;
  };
  relatedBooks: BookSummary[];
}

export interface FeaturedBooks {
  recommended: BookSummary[];
  bestsellers: BookSummary[];
  newLaunches: BookSummary[];
}

export interface BooksResponse {
  books: BookSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface BooksFilters {
  category?: string;
  search?: string;
  format?: string;
  language?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'rating';
  page?: number;
  limit?: number;
}

// Build query string from filters object
const toQueryString = (filters: BooksFilters): string => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== '') params.set(key, String(val));
  });
  return params.toString();
};

export const booksApi = {
  // GET /books/featured — home page sections
  getFeatured: () =>
    get<FeaturedBooks>('/books/featured'),

  // GET /books/recommended — personalised (auth optional)
  getRecommended: () =>
    getAuth<{ books: BookSummary[] }>('/books/recommended'),

  // GET /books?...filters — catalog listing
  getBooks: (filters: BooksFilters = {}) =>
    get<BooksResponse>(`/books?${toQueryString(filters)}`),

  // GET /books/:id — single book with related books
  getBookById: (id: string) =>
    get<BookDetail>(`/books/${id}`),
};
