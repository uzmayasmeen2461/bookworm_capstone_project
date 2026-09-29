import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { tokenStore } from '../../../shared/src/apiClient';
import OrderCard from '../components/OrderCard';
import './OrdersPage.css';

const STATUS_FILTERS = ['All', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
type FilterValue = typeof STATUS_FILTERS[number];

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders, loading, error, cancelOrder } = useOrders();
  const [filter, setFilter] = React.useState<FilterValue>('All');

  if (!tokenStore.get()) {
    return (
      <div className="orders-gate">
        <h2>Sign in to view your orders</h2>
        <button className="btn-primary" onClick={() => navigate('/login')}>Sign In</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="orders-loading">
        <div className="orders-spinner" />
        <p>Loading orders…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-gate">
        <p className="orders-error">⚠️ {error}</p>
        <button className="btn-primary" onClick={() => navigate('/')}>Go Home</button>
      </div>
    );
  }

  const filtered = filter === 'All'
    ? orders
    : orders.filter(o => o.status === filter);

  return (
    <div className="orders-page">
      {/* Breadcrumb */}
      <nav className="orders-breadcrumb">
        <Link to="/">Home</Link>
        <span> / </span>
        <span>My Orders</span>
      </nav>

      <div className="orders-header">
        <h1 className="orders-title">My Orders</h1>
        <span className="orders-count">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Status filter tabs */}
      <div className="orders-filters">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            className={`orders-filter-btn ${filter === f ? 'orders-filter-btn--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'All' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Order list */}
      {filtered.length === 0 ? (
        <div className="orders-empty">
          <span className="orders-empty__icon">📦</span>
          <h2>
            {filter === 'All'
              ? "You haven't placed any orders yet"
              : `No ${filter} orders`}
          </h2>
          <p>Start browsing and buy your first book!</p>
          <button className="btn-primary" onClick={() => navigate('/')}>Browse Books</button>
        </div>
      ) : (
        <div className="orders-list">
          {filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onCancel={cancelOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
