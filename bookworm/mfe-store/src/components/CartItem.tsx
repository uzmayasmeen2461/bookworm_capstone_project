import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CartItem as CartItemType } from '../api/cartApi';
import './CartItem.css';

interface Props {
  item: CartItemType;
  onUpdateQty: (itemId: string, qty: number) => void;
  onRemove:    (itemId: string) => void;
}

const getDeliveryDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const CartItemRow: React.FC<Props> = ({ item, onUpdateQty, onRemove }) => {
  const navigate = useNavigate();

  return (
    <div className="cart-item">
      {/* Cover */}
      <div
        className="cart-item__cover"
        onClick={() => navigate(`/book/${item.book_id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && navigate(`/book/${item.book_id}`)}
      >
        {item.cover_image
          ? <img src={item.cover_image} alt={item.title} />
          : <div className="cart-item__cover-placeholder">📖</div>
        }
      </div>

      {/* Info */}
      <div className="cart-item__info">
        <h3
          className="cart-item__title"
          onClick={() => navigate(`/book/${item.book_id}`)}
        >
          {item.title}
        </h3>
        <p className="cart-item__author">by {item.author_name}</p>
        <p className="cart-item__format">{item.format}</p>
        <div className="cart-item__tags">
          <span className="cart-item__tag">{item.category_name}</span>
        </div>
        <p className="cart-item__price">₹{item.price}</p>
        <p className="cart-item__delivery">
          Delivery by <strong>{getDeliveryDate(item.delivery_days)}</strong>
        </p>

        {/* Quantity controls */}
        <div className="cart-item__qty">
          <button
            className="cart-item__qty-btn"
            onClick={() => item.quantity > 1
              ? onUpdateQty(item.id, item.quantity - 1)
              : onRemove(item.id)
            }
            aria-label="Decrease quantity"
          >−</button>
          <span className="cart-item__qty-val">{item.quantity}</span>
          <button
            className="cart-item__qty-btn"
            onClick={() => onUpdateQty(item.id, item.quantity + 1)}
            disabled={item.quantity >= 10}
            aria-label="Increase quantity"
          >+</button>
        </div>
      </div>

      {/* Remove */}
      <button
        className="cart-item__remove"
        onClick={() => onRemove(item.id)}
        aria-label="Remove from cart"
        title="Remove"
      >✕</button>
    </div>
  );
};

export default CartItemRow;
