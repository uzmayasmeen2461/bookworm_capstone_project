import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Order, OrderStatus } from '../api/ordersApi';
import { cartApi } from '../api/cartApi';
import './OrderCard.css';

interface Props {
  order:         Order;
  onCancel:      (orderId: string) => Promise<string | null>;
}

// Status badge config
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: string }> = {
  pending:   { label: 'Pending',   color: '#f59e0b', icon: '⏳' },
  confirmed: { label: 'Confirmed', color: '#4a9eff', icon: '✅' },
  shipped:   { label: 'Shipped',   color: '#a78bfa', icon: '🚚' },
  delivered: { label: 'Delivered', color: '#22c55e', icon: '📦' },
  cancelled: { label: 'Cancelled', color: '#6b7280', icon: '✕'  },
};

// Check if order can be cancelled (within 48 hrs and not delivered/cancelled)
const canCancel = (order: Order): boolean => {
  if (['delivered','cancelled'].includes(order.status)) return false;
  const hours = (Date.now() - new Date(order.created_at).getTime()) / 3600000;
  return hours <= 48;
};

const OrderCard: React.FC<Props> = ({ order, onCancel }) => {
  const navigate = useNavigate();
  const [cancelError, setCancelError]       = useState('');
  const [cancelLoading, setCancelLoading]   = useState(false);
  const [buyAgainMsg, setBuyAgainMsg]       = useState('');
  const [buyAgainLoading, setBuyAgainLoading] = useState(false);

  const statusCfg = STATUS_CONFIG[order.status];

  const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setCancelLoading(true);
    setCancelError('');
    const err = await onCancel(order.id);
    if (err) setCancelError(err);
    setCancelLoading(false);
  };

  // Buy Again — re-adds all items from this order to cart
  const handleBuyAgain = async () => {
    setBuyAgainLoading(true);
    setBuyAgainMsg('');
    try {
      for (const item of order.items) {
        await cartApi.add(item.book.id, item.quantity);
      }
      setBuyAgainMsg('All items added to cart!');
      window.dispatchEvent(new CustomEvent('bw:cart:updated', {
        detail: { count: order.items.length }
      }));
      setTimeout(() => navigate('/cart'), 1200);
    } catch (err: any) {
      setBuyAgainMsg(err.message || 'Failed to add items');
    } finally {
      setBuyAgainLoading(false);
      setTimeout(() => setBuyAgainMsg(''), 3000);
    }
  };

  return (
    <div className={`order-card ${order.status === 'cancelled' ? 'order-card--cancelled' : ''}`}>
      {/* Header */}
      <div className="order-card__header">
        <div className="order-card__meta">
          <span className="order-card__id">Order #{order.id.slice(0, 8).toUpperCase()}</span>
          <span className="order-card__date">{formattedDate}</span>
        </div>
        <span
          className="order-card__status"
          style={{ color: statusCfg.color, borderColor: statusCfg.color }}
        >
          {statusCfg.icon} {statusCfg.label}
        </span>
      </div>

      {/* Items */}
      <div className="order-card__items">
        {order.items.map(item => (
          <div
            key={item.id}
            className="order-card__item"
            onClick={() => navigate(`/book/${item.book.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && navigate(`/book/${item.book.id}`)}
          >
            <div className="order-card__cover">
              {item.book.coverImage
                ? <img src={item.book.coverImage} alt={item.book.title} />
                : <div className="order-card__cover-ph">📖</div>
              }
            </div>
            <div className="order-card__item-info">
              <p className="order-card__item-title">{item.book.title}</p>
              <p className="order-card__item-author">by {item.book.authorName}</p>
              <p className="order-card__item-format">{item.book.format}</p>
              <p className="order-card__item-price">₹{item.unitPrice} × {item.quantity}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="order-card__footer">
        <div className="order-card__totals">
          <span className="order-card__total-label">Total</span>
          <span className="order-card__total-val">₹{Number(order.total_amount).toFixed(2)}</span>
          {order.payment_method && (
            <span className="order-card__pay-method">
              via {order.payment_method.replace('_', ' ')}
            </span>
          )}
        </div>

        <div className="order-card__actions">
          {buyAgainMsg && (
            <span className={`order-card__msg ${buyAgainMsg.includes('!') ? 'order-card__msg--ok' : 'order-card__msg--err'}`}>
              {buyAgainMsg}
            </span>
          )}
          {cancelError && (
            <span className="order-card__msg order-card__msg--err">{cancelError}</span>
          )}

          {/* Buy Again — available on all non-cancelled orders */}
          {order.status !== 'cancelled' && (
            <button
              className="btn-buy-again"
              onClick={handleBuyAgain}
              disabled={buyAgainLoading}
            >
              {buyAgainLoading ? 'Adding…' : '🔄 Buy Again'}
            </button>
          )}

          {/* Cancel — only within 48 hrs */}
          {canCancel(order) && (
            <button
              className="btn-cancel-order"
              onClick={handleCancel}
              disabled={cancelLoading}
            >
              {cancelLoading ? 'Cancelling…' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
