import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PaymentMethod } from '../api/checkoutApi';
import './PaymentModal.css';

interface Props {
  amount: number;
  onPay:   (method: PaymentMethod, cardDetails?: CardDetails) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

export interface CardDetails {
  cardNumber: string;
  nameOnCard: string;
  cvv: string;
  expiry: string;
}

const METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'credit_card', label: 'Credit Card' },
  { key: 'debit_card',  label: 'Debit Card'  },
  { key: 'upi',         label: 'UPI'         },
  { key: 'wallet',      label: 'Wallet'      },
];

const PaymentModal: React.FC<Props> = ({ amount, onPay, onClose, loading }) => {
  const [method, setMethod]   = useState<PaymentMethod>('credit_card');
  const [cardNum, setCardNum] = useState('');
  const [name, setName]       = useState('');
  const [cvv, setCvv]         = useState('');
  const [expiry, setExpiry]   = useState('');
  const [upiId, setUpiId]     = useState('');
  const [error, setError]     = useState('');

  const isCardMethod = method === 'credit_card' || method === 'debit_card';

  const validate = (): string | null => {
    if (isCardMethod) {
      if (cardNum.replace(/\s/g,'').length < 16) return 'Enter a valid 16-digit card number';
      if (!name.trim())                          return 'Name on card is required';
      if (cvv.length < 3)                        return 'Enter a valid CVV';
      if (!expiry.match(/^\d{2}\/\d{4}$/))       return 'Enter expiry as MM/YYYY';
    }
    if (method === 'upi' && !upiId.includes('@')) return 'Enter a valid UPI ID (e.g. name@upi)';
    return null;
  };

  const handlePay = async () => {
    setError('');
    const err = validate();
    if (err) { setError(err); return; }
    await onPay(method, isCardMethod ? { cardNumber: cardNum, nameOnCard: name, cvv, expiry } : undefined);
  };

  // Format card number with spaces every 4 digits
  const formatCard = (val: string) =>
    val.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();

  const modal = (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Complete Payment</h2>
          <span className="modal-amount">Payable Amount: <strong>₹{amount.toFixed(2)}</strong></span>
        </div>

        <div className="modal-body">
          {/* Payment method tabs */}
          <div className="modal-methods">
            {METHODS.map(m => (
              <button
                key={m.key}
                className={`modal-method-btn ${method === m.key ? 'modal-method-btn--active' : ''}`}
                onClick={() => { setMethod(m.key); setError(''); }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Card fields */}
          {isCardMethod && (
            <div className="modal-fields">
              <div className="modal-field-row">
                <div className="modal-field">
                  <label>Card Number</label>
                  <input
                    type="text"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    value={cardNum}
                    onChange={e => setCardNum(formatCard(e.target.value))}
                    maxLength={19}
                  />
                </div>
                <div className="modal-field">
                  <label>Name on Card</label>
                  <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-field-row">
                <div className="modal-field">
                  <label>CVV</label>
                  <input
                    type="password"
                    placeholder="XXX"
                    value={cvv}
                    onChange={e => setCvv(e.target.value.replace(/\D/g,'').slice(0,4))}
                    maxLength={4}
                  />
                </div>
                <div className="modal-field">
                  <label>Date of Expiry</label>
                  <input
                    type="text"
                    placeholder="MM/YYYY"
                    value={expiry}
                    onChange={e => setExpiry(e.target.value)}
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
          )}

          {/* UPI field */}
          {method === 'upi' && (
            <div className="modal-fields">
              <div className="modal-field">
                <label>UPI ID</label>
                <input
                  type="text"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Wallet — no extra fields */}
          {method === 'wallet' && (
            <p className="modal-wallet-msg">Your wallet balance will be used.</p>
          )}
        </div>

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-footer">
          <button
            className="btn-pay"
            onClick={handlePay}
            disabled={loading}
          >
            {loading ? 'Processing…' : `Pay Now ₹${amount.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default PaymentModal;
