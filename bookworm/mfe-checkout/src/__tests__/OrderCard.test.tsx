/**
 * Tests for OrderCard component
 *
 * What we test:
 *  1. Renders order ID (first 8 chars uppercase), date, status
 *  2. Renders all order items with title and price
 *  3. Shows correct status badge colour/label
 *  4. "Buy Again" button visible for non-cancelled orders
 *  5. "Buy Again" hidden for cancelled orders
 *  6. "Cancel Order" button visible when order is recent and not delivered
 *  7. "Cancel Order" NOT shown for delivered orders
 *  8. Calls onCancel with correct orderId on confirm
 *  9. Shows cancel error message when cancel fails
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrderCard from '../components/OrderCard';
import { Order } from '../api/ordersApi';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock cartApi to avoid real HTTP calls
jest.mock('../api/cartApi', () => ({
  cartApi: { add: jest.fn().mockResolvedValue({}) },
}));

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id:             'abc12345-0000-0000-0000-000000000000',
  status:         'confirmed',
  total_amount:   508,
  tax_amount:     62,
  discount:       0,
  payment_method: 'credit_card',
  payment_status: 'completed',
  coupon_code:    null,
  created_at:     new Date().toISOString(), // now = within 48 hrs
  items: [
    {
      id: 'i1', quantity: 1, unitPrice: 149,
      book: { id: 'b1', title: 'Joy of Minimalism', coverImage: null, format: 'Paperback', authorName: 'Daniel Reed' },
    },
  ],
  ...overrides,
});

const renderCard = (order: Order, onCancel = jest.fn()) =>
  render(
    <MemoryRouter>
      <OrderCard order={order} onCancel={onCancel} />
    </MemoryRouter>
  );

describe('OrderCard', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    window.confirm = jest.fn(() => true); // auto-confirm dialogs
  });

  it('renders order ID prefix (8 chars uppercase) and status', () => {
    renderCard(makeOrder());
    expect(screen.getByText('Order #ABC12345')).toBeInTheDocument();
    expect(screen.getByText(/Confirmed/)).toBeInTheDocument();
  });

  it('renders book title and price', () => {
    renderCard(makeOrder());
    expect(screen.getByText('Joy of Minimalism')).toBeInTheDocument();
    expect(screen.getByText('₹149 × 1')).toBeInTheDocument();
  });

  it('shows "Buy Again" for confirmed orders', () => {
    renderCard(makeOrder({ status: 'confirmed' }));
    expect(screen.getByRole('button', { name: /buy again/i })).toBeInTheDocument();
  });

  it('hides "Buy Again" for cancelled orders', () => {
    renderCard(makeOrder({ status: 'cancelled' }));
    expect(screen.queryByRole('button', { name: /buy again/i })).not.toBeInTheDocument();
  });

  it('shows "Cancel Order" when order is recent and confirmed', () => {
    renderCard(makeOrder({ status: 'confirmed' }));
    expect(screen.getByRole('button', { name: /cancel order/i })).toBeInTheDocument();
  });

  it('hides "Cancel Order" for delivered orders', () => {
    renderCard(makeOrder({ status: 'delivered' }));
    expect(screen.queryByRole('button', { name: /cancel order/i })).not.toBeInTheDocument();
  });

  it('hides "Cancel Order" for orders older than 48 hours', () => {
    const oldDate = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    renderCard(makeOrder({ status: 'confirmed', created_at: oldDate }));
    expect(screen.queryByRole('button', { name: /cancel order/i })).not.toBeInTheDocument();
  });

  it('calls onCancel with orderId when confirmed', async () => {
    const onCancel = jest.fn().mockResolvedValue(null);
    renderCard(makeOrder(), onCancel);
    fireEvent.click(screen.getByRole('button', { name: /cancel order/i }));
    await waitFor(() =>
      expect(onCancel).toHaveBeenCalledWith('abc12345-0000-0000-0000-000000000000')
    );
  });

  it('shows error message when cancel fails', async () => {
    const onCancel = jest.fn().mockResolvedValue('Orders can only be cancelled within 48 hours');
    renderCard(makeOrder(), onCancel);
    fireEvent.click(screen.getByRole('button', { name: /cancel order/i }));
    expect(await screen.findByText(/48 hours/i)).toBeInTheDocument();
  });
});
