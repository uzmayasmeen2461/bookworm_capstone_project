import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckoutCartItem } from '../api/cartApi';
import './OrderConfirmation.css';

interface Props {
  items:        CheckoutCartItem[];
  totalAmount:  number;
  pointsEarned: number;
  onContinue:   () => void;
}

const getDeliveryDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const OrderConfirmation: React.FC<Props> = ({ items, totalAmount, pointsEarned, onContinue }) => {
  const navigate = useNavigate();

  return (
    <div className="confirmation">
      <div className="confirmation__box">
        {/* Success icon */}
        <div className="confirmation__icon">✅</div>
        <p className="confirmation__msg">
          Your purchase of the following reads is successful
        </p>

        {/* Purchased items */}
        <div className="confirmation__items">
          {items.map(item => (
            <div key={item.id} className="confirmation__item">
              <div className="confirmation__item-cover">
                {item.cover_image
                  ? <img src={item.cover_image} alt={item.title} />
                  : <div className="confirmation__item-placeholder">📖</div>
                }
              </div>
              <div className="confirmation__item-info">
                <h3 className="confirmation__item-title"
                    onClick={() => navigate(`/book/${item.book_id}`)}>
                  {item.title}
                </h3>
                <p className="confirmation__item-author">by {item.author_name}</p>
                <p className="confirmation__item-format">{item.format}</p>
                <p className="confirmation__item-tags">{item.category_name}</p>
                <p className="confirmation__item-price">₹{item.price}</p>
                <p className="confirmation__item-delivery">
                  Delivery by <strong>{getDeliveryDate(item.delivery_days)}</strong>
                </p>
              </div>
            </div>
          ))}
        </div>

        {pointsEarned > 0 && (
          <p className="confirmation__points">
            🎁 You earned <strong>{pointsEarned} gift points</strong> on this order!
          </p>
        )}

        <button className="btn-continue" onClick={onContinue}>
          Continue your Shopping 📚
        </button>
      </div>
    </div>
  );
};

export default OrderConfirmation;
