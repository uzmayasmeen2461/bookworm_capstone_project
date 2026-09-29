import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useRecommendations } from '../hooks/useRecommendations';
import CartItemRow from '../components/CartItem';
import BookCard from '../components/BookCard';
import './CartPage.css';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, loading, error, updateQty, removeItem, subtotal, tax, total } = useCart();
  const { books: recommended, loading: recLoading } = useRecommendations();

  // Use persistent storage (shared across all MFE bundles) — tokenStore is per-bundle
  const isLoggedIn = !!(localStorage.getItem('bw_refresh') || sessionStorage.getItem('bw_refresh'));

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="cart-empty">
        <span className="cart-empty__icon">🛒</span>
        <h2>Your cart is empty</h2>
        <p>Please sign in to view your cart</p>
        <button className="btn-primary" onClick={() => navigate('/login')}>
          Sign In
        </button>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="cart-loading">
        <div className="cart-spinner" />
        <p>Loading cart…</p>
      </div>
    );
  }

  // ── Empty cart ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="cart-empty">
        <span className="cart-empty__icon">🛒</span>
        <h2>Your cart is empty</h2>
        <p>Browse our catalog and add books you love</p>
        <button className="btn-primary" onClick={() => navigate('/')}>
          Browse Books
        </button>

        {!recLoading && recommended.length > 0 && (
          <div className="cart-rec">
            <h3 className="cart-rec__title">Recommended for You</h3>
            <div className="cart-rec__row">
              {recommended.map(b => <BookCard key={b.id} book={b} />)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="cart-page">
      {/* Breadcrumb */}
      <nav className="cart-page__breadcrumb">
        <Link to="/">Home</Link>
        <span> / </span>
        <span className="cart-page__crumb-current">Shopping Cart</span>
      </nav>

      <h1 className="cart-page__title">Shopping Cart</h1>

      <div className="cart-page__body">
        {/* ── Left: cart items ── */}
        <div className="cart-page__items">
          {error && <p className="cart-page__error">{error}</p>}
          {items.map(item => (
            <CartItemRow
              key={item.id}
              item={item}
              onUpdateQty={updateQty}
              onRemove={removeItem}
            />
          ))}

          {/* Recommendations based on order history */}
          {!recLoading && recommended.length > 0 && (
            <section className="cart-rec">
              <h3 className="cart-rec__title">Recommended based on your history</h3>
              <div className="cart-rec__row">
                {recommended.map(b => <BookCard key={b.id} book={b} />)}
              </div>
            </section>
          )}
        </div>

        {/* ── Right: Grand Total ── */}
        <aside className="cart-page__summary">
          <h2 className="cart-page__summary-title">Grand Total</h2>

          <div className="cart-page__summary-rows">
            <div className="cart-page__summary-row">
              <span>Price ({items.length} item{items.length > 1 ? 's' : ''})</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="cart-page__summary-row">
              <span>Tax (12%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="cart-page__summary-row">
              <span>Delivery Charges</span>
              <span className="cart-page__free">Free</span>
            </div>
          </div>

          <div className="cart-page__summary-divider" />

          <div className="cart-page__summary-row cart-page__summary-total">
            <span>Total Amount</span>
            <span>₹{total.toFixed(2)}</span>
          </div>

          <button
            className="btn-checkout"
            onClick={() => navigate('/checkout')}
          >
            Proceed to Checkout 💳
          </button>
        </aside>
      </div>
    </div>
  );
};

export default CartPage;
