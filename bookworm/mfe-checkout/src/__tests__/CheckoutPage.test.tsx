/**
 * Tests for CheckoutPage component
 *
 * What we test:
 *  1. Shows sign-in gate when not logged in
 *  2. Shows loading spinner while cart/addresses load
 *  3. Shows empty-cart gate when cart is empty
 *  4. Renders cart items in the page
 *  5. Shows Grand Total section with correct amounts
 *  6. Coupon BOOK10 applies 10% discount
 *  7. Invalid coupon shows error message
 *  8. "Pay Now" button opens payment modal
 *  9. Address validation error shown before opening modal
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from '../pages/CheckoutPage';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// sessionStorage — controls auth state (CheckoutPage reads bw_refresh, not tokenStore)
const setLoggedIn = (value: string | null) => {
  Object.defineProperty(window, 'sessionStorage', {
    value: { getItem: (k: string) => k === 'bw_refresh' ? value : null },
    writable: true,
    configurable: true,
  });
};

// apiClient — stub
jest.mock('../../../shared/src/apiClient', () => ({
  tokenStore: { get: jest.fn() },
  ensureToken: jest.fn().mockResolvedValue(true),
}));

// useCheckoutCart hook
const mockUseCheckoutCart = jest.fn();
jest.mock('../hooks/useCheckoutCart', () => ({
  useCheckoutCart: () => mockUseCheckoutCart(),
}));

// useAddresses hook
const mockUseAddresses = jest.fn();
jest.mock('../hooks/useAddresses', () => ({
  useAddresses: () => mockUseAddresses(),
}));

// PaymentModal — stub that fires onPay immediately on button click
jest.mock('../components/PaymentModal', () => ({
  __esModule: true,
  default: ({ onClose, onPay }: any) => (
    <div data-testid="payment-modal">
      <button onClick={() => onPay('credit_card')}>Confirm Payment</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// OrderConfirmation — stub
jest.mock('../components/OrderConfirmation', () => ({
  __esModule: true,
  default: () => <div data-testid="order-confirmation">Order Confirmed!</div>,
}));

// API modules — stub to avoid HTTP
jest.mock('../api/checkoutApi', () => ({
  checkoutApi: {
    createOrder:      jest.fn().mockResolvedValue({ orderId: 'o1', totalAmount: 448 }),
    initiatePayment:  jest.fn().mockResolvedValue({ sessionToken: 'tok' }),
    confirmPayment:   jest.fn().mockResolvedValue({ pointsEarned: 50 }),
  },
}));

jest.mock('../api/addressApi', () => ({
  addressApi: {
    save: jest.fn().mockResolvedValue({ id: 'addr-new' }),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
const cartItem = {
  id: 'ci1', book_id: 'b1', title: 'Clean Code', author_name: 'Uncle Bob',
  price: 400, quantity: 1, cover_image: null, format: 'Paperback', category_name: 'Tech',
};

const defaultCart = {
  items: [cartItem],
  loading: false,
  subtotal: 400,
  tax: 48,
};

const defaultAddresses = {
  addresses: [],
  loading: false,
  refresh: jest.fn(),
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <CheckoutPage />
    </MemoryRouter>
  );

// ─────────────────────────────────────────────────────────────────────────────

describe('CheckoutPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    setLoggedIn('refresh-token');  // default: logged in
    mockUseCheckoutCart.mockReturnValue(defaultCart);
    mockUseAddresses.mockReturnValue(defaultAddresses);
  });

  afterEach(() => {
    setLoggedIn(null);
  });

  it('shows sign-in gate when not logged in', () => {
    setLoggedIn(null);
    mockUseCheckoutCart.mockReturnValue({ ...defaultCart, loading: false });

    renderPage();
    expect(screen.getByText(/sign in to checkout/i)).toBeInTheDocument();
  });

  it('shows loading spinner while data loads', () => {
    mockUseCheckoutCart.mockReturnValue({ ...defaultCart, loading: true });

    renderPage();
    expect(screen.getByText(/preparing checkout/i)).toBeInTheDocument();
  });

  it('shows empty-cart gate when cart is empty', () => {
    mockUseCheckoutCart.mockReturnValue({ ...defaultCart, items: [] });

    renderPage();
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  it('renders cart item titles', () => {
    renderPage();
    expect(screen.getByText('Clean Code')).toBeInTheDocument();
    expect(screen.getByText('by Uncle Bob')).toBeInTheDocument();
  });

  it('shows subtotal and tax in summary', () => {
    renderPage();
    expect(screen.getByText('₹400.00')).toBeInTheDocument();
    expect(screen.getByText('₹48.00')).toBeInTheDocument();
  });

  it('applies BOOK10 coupon and shows discount', async () => {
    renderPage();

    const couponInput = screen.getByPlaceholderText(/coupon code/i);
    await userEvent.clear(couponInput);
    await userEvent.type(couponInput, 'BOOK10');
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }));

    // 10% of 400 = 40 discount
    expect(await screen.findByText(/−₹40\.00/)).toBeInTheDocument();
  });

  it('shows error for invalid coupon code', async () => {
    renderPage();

    const couponInput = screen.getByPlaceholderText(/coupon code/i);
    await userEvent.type(couponInput, 'BADCODE');
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }));

    expect(await screen.findByText(/invalid coupon/i)).toBeInTheDocument();
  });

  it('opens payment modal when Pay Now is clicked with valid form', async () => {
    renderPage();

    // Fill required address fields so validation passes
    await userEvent.type(screen.getByPlaceholderText('First Name'),  'Jane');
    await userEvent.type(screen.getByPlaceholderText('Last Name'),   'Doe');
    await userEvent.type(screen.getByPlaceholderText('Street, Area, Landmark'), '123 Main St');
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await userEvent.type(screen.getByPlaceholderText('City'),        'Mumbai');
    await userEvent.type(screen.getByPlaceholderText('110001'),      '400001');
    await userEvent.type(screen.getByPlaceholderText('9876543210'),  '9876543210');
    // Select a state (select has no aria label — target by display value of default option)
    fireEvent.change(screen.getByDisplayValue('Select State'), { target: { value: 'Maharashtra' } });

    fireEvent.click(screen.getByRole('button', { name: /pay now/i }));

    expect(await screen.findByTestId('payment-modal')).toBeInTheDocument();
  });

  it('shows address validation errors when Pay Now clicked with empty form', async () => {
    renderPage();

    // Click Pay Now — validate() fires before modal; first-name error appears inline
    fireEvent.click(screen.getByRole('button', { name: /pay now/i }));

    // Modal must NOT have opened (validation blocked it)
    expect(screen.queryByTestId('payment-modal')).not.toBeInTheDocument();

    // Field error for first name shown
    await waitFor(() =>
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
    );
  });
});
