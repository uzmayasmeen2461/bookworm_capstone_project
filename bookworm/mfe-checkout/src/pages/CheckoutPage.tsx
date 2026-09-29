import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCheckoutCart } from '../hooks/useCheckoutCart';
import { useAddresses } from '../hooks/useAddresses';
import { checkoutApi, PaymentMethod } from '../api/checkoutApi';
import { addressApi, NewAddress } from '../api/addressApi';
import PaymentModal from '../components/PaymentModal';
import OrderConfirmation from '../components/OrderConfirmation';
import './CheckoutPage.css';

const INDIA_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
  'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh',
];

type CheckoutStep = 'cart' | 'confirm';

// ── Per-field error map ───────────────────────────────────────────────────────
interface FieldErrors {
  firstName?: string;
  lastName?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pin?: string;
  email?: string;
  phone?: string;
  savedAddr?: string;
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, loading: cartLoading, subtotal, tax } = useCheckoutCart();
  const { addresses, loading: addrLoading, refresh: refreshAddr } = useAddresses();

  // Address form state
  const [useSaved, setUseSaved]       = useState(false);
  const [savedAddrId, setSavedAddrId] = useState('');
  const [addr, setAddr] = useState<NewAddress>({
    firstName: '', lastName: '', addressLine: '', city: '',
    state: '', pin: '', country: 'India', email: '', phone: '',
  });

  // Inline field errors — shown under each field
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Coupon & gift points
  const [coupon, setCoupon]               = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError]     = useState('');
  const [usePoints, setUsePoints]         = useState(false);
  const [discount, setDiscount]           = useState(0);

  // Payment
  const [showPayment, setShowPayment]   = useState(false);
  const [payLoading, setPayLoading]     = useState(false);
  const [payError, setPayError]         = useState('');
  const [step, setStep]                 = useState<CheckoutStep>('cart');
  const [confirmedItems, setConfirmedItems] = useState(items);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [finalTotal, setFinalTotal]     = useState(0);

  const total = parseFloat((subtotal + tax - discount).toFixed(2));

  const handleApplyCoupon = () => {
    setCouponError('');
    if (coupon.toUpperCase() === 'BOOK10') {
      setDiscount(parseFloat((subtotal * 0.10).toFixed(2)));
      setCouponApplied(true);
    } else {
      setCouponError('Invalid coupon code');
    }
  };

  const handleUsePoints = (checked: boolean) => {
    setUsePoints(checked);
    if (checked) setDiscount(prev => prev + parseFloat((subtotal * 0.05).toFixed(2)));
    else         setDiscount(prev => Math.max(0, prev - parseFloat((subtotal * 0.05).toFixed(2))));
  };

  // ── Per-field validation — returns errors map, empty = valid ─────────────
  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (useSaved) {
      if (!savedAddrId) errs.savedAddr = 'Please select a saved address';
      return errs;
    }
    if (!addr.firstName.trim())              errs.firstName   = 'First name is required';
    if (!addr.lastName.trim())               errs.lastName    = 'Last name is required';
    if (!addr.addressLine.trim())            errs.addressLine = 'Address is required';
    if (!addr.city.trim())                   errs.city        = 'City is required';
    if (!addr.state)                         errs.state       = 'State is required';
    if (addr.pin.length < 6)                 errs.pin         = 'Enter a valid 6-digit PIN';
    if (!addr.email.trim() || !addr.email.includes('@'))
                                             errs.email       = 'Enter a valid email';
    if (addr.phone.length < 10)              errs.phone       = 'Enter a valid 10-digit phone number';
    return errs;
  };

  // Clear a field's error as soon as the user starts typing
  const clearErr = (field: keyof FieldErrors) =>
    setFieldErrors(prev => { const next = { ...prev }; delete next[field]; return next; });

  // ── "Pay Now" clicked — validate first, then open modal ──────────────────
  const handlePayNowClick = () => {
    if (!localStorage.getItem('bw_refresh') && !sessionStorage.getItem('bw_refresh')) { navigate('/login'); return; }
    setPayError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return; // stay on page, show inline errors — do NOT open modal
    }
    setFieldErrors({});
    setShowPayment(true);
  };

  const handlePayNow = async (method: PaymentMethod) => {
    setPayLoading(true);
    setPayError('');
    try {
      let addressId = savedAddrId;
      if (!useSaved) {
        const saved = await addressApi.save(addr);
        addressId = saved.id;
        refreshAddr();
      }

      const order = await checkoutApi.createOrder({
        addressId,
        paymentMethod: method,
        couponCode: couponApplied ? coupon : undefined,
        useGiftPoints: usePoints,
      });

      const payment   = await checkoutApi.initiatePayment(order.orderId);
      const confirmed = await checkoutApi.confirmPayment(order.orderId, payment.sessionToken);

      setConfirmedItems(items);
      setPointsEarned(confirmed.pointsEarned);
      setFinalTotal(order.totalAmount);
      setShowPayment(false);
      setStep('confirm');

      window.dispatchEvent(new CustomEvent('bw:cart:updated', { detail: { count: 0 } }));
    } catch (err: any) {
      setPayError(err.message || 'Payment failed. Please try again.');
      setShowPayment(false);
    } finally {
      setPayLoading(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (cartLoading || addrLoading) {
    return (
      <div className="checkout-loading">
        <div className="checkout-spinner" />
        <p>Preparing checkout…</p>
      </div>
    );
  }

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!localStorage.getItem('bw_refresh') && !sessionStorage.getItem('bw_refresh')) {
    return (
      <div className="checkout-gate">
        <h2>Sign in to checkout</h2>
        <button className="btn-primary" onClick={() => navigate('/login')}>Sign In</button>
      </div>
    );
  }

  // ── Empty cart ────────────────────────────────────────────────────────────
  if (items.length === 0 && step !== 'confirm') {
    return (
      <div className="checkout-gate">
        <h2>Your cart is empty</h2>
        <button className="btn-primary" onClick={() => navigate('/')}>Browse Books</button>
      </div>
    );
  }

  // ── Order confirmed ───────────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <OrderConfirmation
        items={confirmedItems}
        totalAmount={finalTotal}
        pointsEarned={pointsEarned}
        onContinue={() => navigate('/')}
      />
    );
  }

  const fe = fieldErrors; // shorthand

  return (
    <div className="checkout-page">
      {/* Breadcrumb */}
      <nav className="checkout-breadcrumb">
        <Link to="/">Home</Link> /
        <Link to="/cart"> Cart</Link> /
        <span> Checkout</span>
      </nav>

      <h1 className="checkout-title">Checkout</h1>

      {/* Payment error (only shown after modal attempt) */}
      {payError && <p className="checkout-error">{payError}</p>}

      <div className="checkout-body">
        {/* ── Left ── */}
        <div className="checkout-left">
          {/* Cart items preview */}
          <section className="checkout-section">
            <h2 className="checkout-section-title">Order Summary</h2>
            <div className="checkout-items-row">
              {items.map(item => (
                <div key={item.id} className="checkout-item-mini">
                  <div className="checkout-item-mini__cover">
                    {item.cover_image
                      ? <img src={item.cover_image} alt={item.title} />
                      : <div className="checkout-item-mini__placeholder">📖</div>
                    }
                  </div>
                  <div className="checkout-item-mini__info">
                    <p className="checkout-item-mini__title">{item.title}</p>
                    <p className="checkout-item-mini__author">by {item.author_name}</p>
                    <p className="checkout-item-mini__format">{item.format}</p>
                    <p className="checkout-item-mini__tags">{item.category_name}</p>
                    <p className="checkout-item-mini__price">₹{item.price}</p>
                    <p className="checkout-item-mini__qty">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Address */}
          <section className="checkout-section">
            <h2 className="checkout-section-title">Delivery Address</h2>

            {addresses.length > 0 && (
              <label className="checkout-checkbox">
                <input
                  type="checkbox"
                  checked={useSaved}
                  onChange={e => { setUseSaved(e.target.checked); setFieldErrors({}); }}
                />
                Use Saved Address
              </label>
            )}

            {useSaved && addresses.length > 0 ? (
              <>
                <div className="checkout-saved-addresses">
                  {addresses.map(a => (
                    <label key={a.id} className="checkout-addr-option">
                      <input
                        type="radio"
                        name="savedAddr"
                        value={a.id}
                        checked={savedAddrId === a.id}
                        onChange={() => { setSavedAddrId(a.id); clearErr('savedAddr'); }}
                      />
                      <span>
                        {a.first_name} {a.last_name}, {a.address_line}, {a.city}, {a.state} - {a.pin}
                      </span>
                    </label>
                  ))}
                </div>
                {fe.savedAddr && <p className="checkout-field-error">{fe.savedAddr}</p>}
              </>
            ) : (
              <div className="checkout-addr-form">
                <div className="checkout-form-row">
                  <div className="checkout-form-field">
                    <label>First Name *</label>
                    <input
                      value={addr.firstName}
                      onChange={e => { setAddr(p => ({...p, firstName: e.target.value})); clearErr('firstName'); }}
                      placeholder="First Name"
                      className={fe.firstName ? 'input-error' : ''}
                    />
                    {fe.firstName && <span className="checkout-field-error">{fe.firstName}</span>}
                  </div>
                  <div className="checkout-form-field">
                    <label>Last Name *</label>
                    <input
                      value={addr.lastName}
                      onChange={e => { setAddr(p => ({...p, lastName: e.target.value})); clearErr('lastName'); }}
                      placeholder="Last Name"
                      className={fe.lastName ? 'input-error' : ''}
                    />
                    {fe.lastName && <span className="checkout-field-error">{fe.lastName}</span>}
                  </div>
                  <div className="checkout-form-field checkout-form-field--wide">
                    <label>Address *</label>
                    <input
                      value={addr.addressLine}
                      onChange={e => { setAddr(p => ({...p, addressLine: e.target.value})); clearErr('addressLine'); }}
                      placeholder="Street, Area, Landmark"
                      className={fe.addressLine ? 'input-error' : ''}
                    />
                    {fe.addressLine && <span className="checkout-field-error">{fe.addressLine}</span>}
                  </div>
                </div>

                <div className="checkout-form-row">
                  <div className="checkout-form-field">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={addr.email}
                      onChange={e => { setAddr(p => ({...p, email: e.target.value})); clearErr('email'); }}
                      placeholder="you@example.com"
                      className={fe.email ? 'input-error' : ''}
                    />
                    {fe.email && <span className="checkout-field-error">{fe.email}</span>}
                  </div>
                  <div className="checkout-form-field">
                    <label>City *</label>
                    <input
                      value={addr.city}
                      onChange={e => { setAddr(p => ({...p, city: e.target.value})); clearErr('city'); }}
                      placeholder="City"
                      className={fe.city ? 'input-error' : ''}
                    />
                    {fe.city && <span className="checkout-field-error">{fe.city}</span>}
                  </div>
                  <div className="checkout-form-field">
                    <label>PIN Code *</label>
                    <input
                      value={addr.pin}
                      onChange={e => { setAddr(p => ({...p, pin: e.target.value.replace(/\D/g,'').slice(0,6)})); clearErr('pin'); }}
                      placeholder="110001"
                      maxLength={6}
                      className={fe.pin ? 'input-error' : ''}
                    />
                    {fe.pin && <span className="checkout-field-error">{fe.pin}</span>}
                  </div>
                </div>

                <div className="checkout-form-row">
                  <div className="checkout-form-field">
                    <label>Phone *</label>
                    <div className={`checkout-phone${fe.phone ? ' checkout-phone--error' : ''}`}>
                      <span className="checkout-phone__prefix">+91</span>
                      <input
                        value={addr.phone}
                        onChange={e => { setAddr(p => ({...p, phone: e.target.value.replace(/\D/g,'').slice(0,10)})); clearErr('phone'); }}
                        placeholder="9876543210"
                        maxLength={10}
                      />
                    </div>
                    {fe.phone && <span className="checkout-field-error">{fe.phone}</span>}
                  </div>
                  <div className="checkout-form-field">
                    <label>State *</label>
                    <select
                      value={addr.state}
                      onChange={e => { setAddr(p => ({...p, state: e.target.value})); clearErr('state'); }}
                      className={fe.state ? 'input-error' : ''}
                    >
                      <option value="">Select State</option>
                      {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {fe.state && <span className="checkout-field-error">{fe.state}</span>}
                  </div>
                  <div className="checkout-form-field">
                    <label>Country</label>
                    <select value={addr.country} onChange={e => setAddr(p => ({...p, country: e.target.value}))}>
                      <option value="India">India</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── Right: Grand Total ── */}
        <aside className="checkout-summary">
          <h2 className="checkout-summary-title">Grand Total</h2>

          <div className="checkout-summary-rows">
            <div className="checkout-summary-row">
              <span>Price ({items.length} item{items.length > 1 ? 's' : ''})</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="checkout-summary-row">
              <span>Tax (12%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="checkout-summary-row">
              <span>Delivery</span>
              <span className="checkout-free">Free</span>
            </div>
          </div>

          {/* Coupon */}
          <div className="checkout-coupon">
            <input
              className={`checkout-coupon__input${couponError ? ' input-error' : ''}`}
              placeholder="Coupon code"
              value={coupon}
              onChange={e => { setCoupon(e.target.value); setCouponApplied(false); setCouponError(''); }}
              disabled={couponApplied}
            />
            <button
              className="checkout-coupon__btn"
              onClick={handleApplyCoupon}
              disabled={couponApplied || !coupon}
            >
              {couponApplied ? '✓ Applied' : 'Apply'}
            </button>
          </div>
          {couponError && <p className="checkout-field-error checkout-coupon-error">{couponError}</p>}

          {/* Gift points */}
          <label className="checkout-checkbox checkout-checkbox--points">
            <input type="checkbox" checked={usePoints} onChange={e => handleUsePoints(e.target.checked)} />
            Redeem gift points (5% off)
          </label>

          <div className="checkout-summary-divider" />

          {discount > 0 && (
            <div className="checkout-summary-row checkout-discount">
              <span>Discount</span>
              <span>−₹{discount.toFixed(2)}</span>
            </div>
          )}

          <div className="checkout-summary-row checkout-total">
            <span>Total Amount</span>
            <span>₹{total.toFixed(2)}</span>
          </div>

          <button className="btn-pay-now" onClick={handlePayNowClick}>
            Pay Now 💳
          </button>
        </aside>
      </div>

      {/* Payment Modal — only opened after successful validation */}
      {showPayment && (
        <PaymentModal
          amount={total}
          onPay={handlePayNow}
          onClose={() => setShowPayment(false)}
          loading={payLoading}
        />
      )}
    </div>
  );
};

export default CheckoutPage;
