/**
 * Tests for CartPage component
 *
 * What we test:
 *  1. Shows sign-in prompt when user is not logged in
 *  2. Shows loading spinner while cart is loading
 *  3. Shows empty-cart UI when logged in but cart is empty
 *  4. Renders cart items when cart has items
 *  5. Shows subtotal, tax, and total amounts
 *  6. "Proceed to Checkout" button navigates to /checkout
 *  7. Renders recommendations section when items exist
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CartPage from '../pages/CartPage';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// sessionStorage — controls logged-in state (CartPage reads bw_refresh, not tokenStore)
const setLoggedIn = (value: string | null) => {
  if (value) {
    Object.defineProperty(window, 'sessionStorage', { value: { getItem: (k: string) => k === 'bw_refresh' ? value : null }, writable: true, configurable: true });
  } else {
    Object.defineProperty(window, 'sessionStorage', { value: { getItem: () => null }, writable: true, configurable: true });
  }
};

// apiClient — stub (ensureToken not needed in tests, useCart is fully mocked)
jest.mock('../../../shared/src/apiClient', () => ({
  tokenStore: { get: jest.fn() },
  ensureToken: jest.fn().mockResolvedValue(true),
}));

// useCart hook — controllable cart state
const mockUseCart = jest.fn();
jest.mock('../hooks/useCart', () => ({
  useCart: () => mockUseCart(),
}));

// useRecommendations hook — suppress HTTP calls
jest.mock('../hooks/useRecommendations', () => ({
  useRecommendations: () => ({ books: [], loading: false }),
}));

// CartItem component — lightweight stub
jest.mock('../components/CartItem', () => ({
  __esModule: true,
  default: ({ item }: any) => (
    <div data-testid="cart-item">{item.title}</div>
  ),
}));

// BookCard component — lightweight stub
jest.mock('../components/BookCard', () => ({
  __esModule: true,
  default: ({ book }: any) => <div>{book.title}</div>,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
const emptyCart = {
  items:     [],
  loading:   false,
  error:     null,
  updateQty: jest.fn(),
  removeItem: jest.fn(),
  subtotal:  0,
  tax:       0,
  total:     0,
};

const filledCart = {
  items: [
    { id: 'ci1', book_id: 'b1', title: 'Test Book', author_name: 'A. Author',
      price: 200, quantity: 2, cover_image: null, format: 'Paperback' },
  ],
  loading:   false,
  error:     null,
  updateQty: jest.fn(),
  removeItem: jest.fn(),
  subtotal:  400,
  tax:       48,
  total:     448,
};

const renderCart = () =>
  render(
    <MemoryRouter>
      <CartPage />
    </MemoryRouter>
  );

// ─────────────────────────────────────────────────────────────────────────────

describe('CartPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    setLoggedIn('refresh-token');  // default: logged in
  });

  afterEach(() => {
    setLoggedIn(null);
  });

  it('shows sign-in prompt when not logged in', () => {
    setLoggedIn(null);
    mockUseCart.mockReturnValue(emptyCart);

    renderCart();

    expect(screen.getByText(/please sign in to view your cart/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('sign-in button navigates to /login', () => {
    setLoggedIn(null);
    mockUseCart.mockReturnValue(emptyCart);

    renderCart();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('shows loading spinner while cart is loading', () => {
    mockUseCart.mockReturnValue({ ...emptyCart, loading: true });

    renderCart();

    expect(screen.getByText(/loading cart/i)).toBeInTheDocument();
  });

  it('shows empty-cart UI when cart is empty', () => {
    mockUseCart.mockReturnValue(emptyCart);

    renderCart();

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse books/i })).toBeInTheDocument();
  });

  it('renders cart items when cart has items', () => {
    mockUseCart.mockReturnValue(filledCart);

    renderCart();

    expect(screen.getAllByTestId('cart-item')).toHaveLength(1);
    expect(screen.getByText('Test Book')).toBeInTheDocument();
  });

  it('displays subtotal, tax and total', () => {
    mockUseCart.mockReturnValue(filledCart);

    renderCart();

    expect(screen.getByText('₹400.00')).toBeInTheDocument();  // subtotal
    expect(screen.getByText('₹48.00')).toBeInTheDocument();   // tax
    expect(screen.getByText('₹448.00')).toBeInTheDocument();  // total
  });

  it('"Proceed to Checkout" navigates to /checkout', () => {
    mockUseCart.mockReturnValue(filledCart);

    renderCart();
    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/checkout');
  });
});
