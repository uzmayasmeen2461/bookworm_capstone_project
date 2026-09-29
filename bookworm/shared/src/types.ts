// ── Shared TypeScript types used across all MFEs ──────────────────────────────
// Import these in any MFE: import type { Book, User } from 'shared/src/types'

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'guest' | 'registered';
  giftPoints: number;
}

export interface Author {
  id: string;
  name: string;
  bio: string;
  photo?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export type BookFormat = 'Paperback' | 'Hardcover' | 'eBook';

export interface Book {
  id: string;
  title: string;
  author: Author;
  category: Category;
  tags: string[];
  price: number;
  format: BookFormat;
  language: string;
  description: string;
  coverImage: string;
  rating: number;
  totalSold: number;
  stock: number;
  deliveryDate: string;
}

export interface CartItem {
  id: string;
  book: Book;
  quantity: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
}

export interface OrderItem {
  id: string;
  book: Book;
  quantity: number;
  price: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  deliveryAddress: Address;
  createdAt: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  addressLine: string;
  city: string;
  state: string;
  pin: string;
  country: string;
  email: string;
  phone: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  bookId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export type PaymentMethod = 'credit_card' | 'debit_card' | 'upi' | 'wallet';

export interface PaymentDetails {
  method: PaymentMethod;
  amount: number;
  orderId: string;
}
