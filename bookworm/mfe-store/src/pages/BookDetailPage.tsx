import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { GeneratedCover } from '../components/BookCard';
import { useBookDetail } from '../hooks/useBookDetail';
import { reviewsApi, Review } from '../api/reviewsApi';
import { cartApi } from '../api/cartApi';
import { wishlistApi } from '../api/wishlistApi';
import StarRating from '../components/StarRating';
import BookCard from '../components/BookCard';
import './BookDetailPage.css';

const BookDetailPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { book, loading, error } = useBookDetail(id);

  // Reviews state
  const [reviews, setReviews]           = useState<Review[]>([]);
  const [reviewText, setReviewText]     = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [reviewError, setReviewError]   = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Cart / wishlist feedback
  const [cartMsg, setCartMsg]           = useState('');
  const [wishMsg, setWishMsg]           = useState('');
  const [cartLoading, setCartLoading]   = useState(false);
  const [wishLoading, setWishLoading]   = useState(false);

  // Fetch reviews when book loads
  useEffect(() => {
    if (!id) return;
    setReviewsLoading(true);
    reviewsApi.getByBook(id)
      .then(res => setReviews(res.reviews))
      .catch(() => {/* non-critical */})
      .finally(() => setReviewsLoading(false));
  }, [id, reviewSuccess]);

  const handleAddToCart = async () => {
    if (!sessionStorage.getItem('bw_refresh')) { navigate('/login'); return; }
    setCartLoading(true);
    setCartMsg('');
    try {
      await cartApi.add(id);
      setCartMsg('Added to cart!');
      // Notify shell navbar to update cart badge
      window.dispatchEvent(new CustomEvent('bw:cart:added'));
    } catch (err: any) {
      setCartMsg(err.message || 'Failed to add to cart');
    } finally {
      setCartLoading(false);
      setTimeout(() => setCartMsg(''), 3000);
    }
  };

  const handleAddToWishlist = async () => {
    if (!sessionStorage.getItem('bw_refresh')) { navigate('/login'); return; }
    setWishLoading(true);
    setWishMsg('');
    try {
      await wishlistApi.add(id);
      setWishMsg('Added to wishlist!');
    } catch (err: any) {
      setWishMsg(err.message || 'Failed to add to wishlist');
    } finally {
      setWishLoading(false);
      setTimeout(() => setWishMsg(''), 3000);
    }
  };

  const handleSubmitReview = async () => {
    if (!sessionStorage.getItem('bw_refresh')) { navigate('/login'); return; }
    if (reviewRating === 0) { setReviewError('Please select a star rating'); return; }
    setSubmitting(true);
    setReviewError('');
    try {
      await reviewsApi.submit(id, reviewRating, reviewText);
      setReviewText('');
      setReviewRating(0);
      setReviewSuccess(prev => !prev); // toggle to re-fetch reviews
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="book-detail__loading">
        <div className="book-detail__spinner" />
        <p>Loading book…</p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="book-detail__error">
        <p>⚠️ {error || 'Book not found'}</p>
        <button onClick={() => navigate(-1)} className="btn-back">← Go Back</button>
      </div>
    );
  }

  // ── Breadcrumb ─────────────────────────────────────────────────────────────
  const breadcrumb = [
    { label: 'Home',                  to: '/' },
    { label: book.category.name,      to: `/catalog?category=${book.category.slug}` },
    { label: book.title,              to: null },
  ];

  return (
    <div className="book-detail">
      {/* Breadcrumb */}
      <nav className="book-detail__breadcrumb" aria-label="breadcrumb">
        {breadcrumb.map((crumb, i) => (
          <span key={i}>
            {crumb.to
              ? <Link to={crumb.to} className="book-detail__crumb-link">{crumb.label}</Link>
              : <span className="book-detail__crumb-current">{crumb.label}</span>
            }
            {i < breadcrumb.length - 1 && <span className="book-detail__crumb-sep"> / </span>}
          </span>
        ))}
      </nav>

      <div className="book-detail__body">
        {/* ── Left: main content ── */}
        <div className="book-detail__main">

          {/* Top section: cover + info */}
          <div className="book-detail__top">
            {/* Cover */}
            <div className="book-detail__cover">
              {book.coverImage ? (
                <img src={book.coverImage} alt={book.title} />
              ) : (
                <GeneratedCover title={book.title} author={book.author.name} large />
              )}
            </div>

            {/* Info */}
            <div className="book-detail__info">
              <h1 className="book-detail__title">{book.title}</h1>
              <p className="book-detail__author">
                by <Link to={`/catalog`} className="book-detail__author-link">
                  {book.author.name}
                </Link>
              </p>

              <p className="book-detail__description">{book.description}</p>

              <p className="book-detail__format">{book.format}</p>
              <div className="book-detail__tags">
                {book.tags.map(tag => (
                  <span key={tag} className="book-detail__tag">{tag}</span>
                ))}
              </div>

              <div className="book-detail__meta">
                <div className="book-detail__meta-item">
                  <span className="book-detail__meta-label">🔤 Language</span>
                  <span>{book.language}</span>
                </div>
                <div className="book-detail__meta-item">
                  <span className="book-detail__meta-label">⭐ Rating</span>
                  <span>
                    <StarRating value={book.rating} size="sm" />
                    <span className="book-detail__rating-val"> {book.rating.toFixed(1)}</span>
                  </span>
                </div>
                <div className="book-detail__meta-item">
                  <span className="book-detail__meta-label">📦 Sells</span>
                  <span>{book.totalSold} copies sold</span>
                </div>
              </div>

              <p className="book-detail__price">₹{book.price}</p>
              <p className="book-detail__delivery">
                Delivery by <strong>{getDeliveryDate(book.deliveryDays)}</strong>
              </p>

              {/* Action buttons */}
              <div className="book-detail__actions">
                <button
                  className="btn-cart"
                  onClick={handleAddToCart}
                  disabled={cartLoading}
                >
                  {cartLoading ? 'Adding…' : '🛒 Add to Cart'}
                </button>
                <button
                  className="btn-wishlist"
                  onClick={handleAddToWishlist}
                  disabled={wishLoading}
                >
                  {wishLoading ? 'Saving…' : '🔖 Add to Wishlist'}
                </button>
              </div>

              {cartMsg && <p className={`book-detail__msg ${cartMsg.includes('!') ? 'book-detail__msg--ok' : 'book-detail__msg--err'}`}>{cartMsg}</p>}
              {wishMsg && <p className={`book-detail__msg ${wishMsg.includes('!') ? 'book-detail__msg--ok' : 'book-detail__msg--err'}`}>{wishMsg}</p>}
            </div>
          </div>

          {/* About the writer */}
          <section className="book-detail__author-section">
            <h2 className="book-detail__section-title">About the writer</h2>
            <div className="book-detail__author-card">
              <div className="book-detail__author-avatar">
                {book.author.photo
                  ? <img src={book.author.photo} alt={book.author.name} />
                  : <span>👤</span>
                }
              </div>
              <div>
                <p className="book-detail__author-name">{book.author.name}</p>
                <p className="book-detail__author-bio">{book.author.bio}</p>
              </div>
            </div>
          </section>

          {/* Reviews */}
          <section className="book-detail__reviews">
            <h2 className="book-detail__section-title">Reviews</h2>

            {/* Submit review */}
            <div className="book-detail__review-form">
              <textarea
                className="book-detail__review-input"
                placeholder="Leave your review…"
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                maxLength={1000}
                rows={4}
              />
              <div className="book-detail__review-footer">
                <div className="book-detail__review-stars">
                  <StarRating
                    value={reviewRating}
                    interactive
                    onChange={setReviewRating}
                    size="lg"
                  />
                </div>
                <button
                  className="btn-submit-review"
                  onClick={handleSubmitReview}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting…' : 'Submit →'}
                </button>
              </div>
              {reviewError && <p className="book-detail__msg book-detail__msg--err">{reviewError}</p>}
            </div>

            {/* Review list */}
            {reviewsLoading ? (
              <p className="book-detail__reviews-loading">Loading reviews…</p>
            ) : reviews.length === 0 ? (
              <p className="book-detail__reviews-empty">No reviews yet. Be the first!</p>
            ) : (
              <div className="book-detail__review-list">
                {reviews.map(r => (
                  <div key={r.id} className="book-detail__review-card">
                    <div className="book-detail__review-header">
                      <span className="book-detail__review-author">{r.user_name}</span>
                      <StarRating value={r.rating} size="sm" />
                    </div>
                    <p className="book-detail__review-text">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Right: Related Reads ── */}
        {book.relatedBooks.length > 0 && (
          <aside className="book-detail__related">
            <h2 className="book-detail__section-title">Related Reads</h2>
            <div className="book-detail__related-list">
              {book.relatedBooks.map(rb => (
                <BookCard key={rb.id} book={rb} />
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const getDeliveryDate = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

export default BookDetailPage;
