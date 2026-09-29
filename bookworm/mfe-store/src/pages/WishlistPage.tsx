import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { wishlistApi } from '../api/wishlistApi';
import { BookSummary } from '../api/booksApi';
import BookCard from '../components/BookCard';
import './WishlistPage.css';

const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const [books, setBooks]     = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const isLoggedIn = !!sessionStorage.getItem('bw_refresh');

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    setLoading(true);
    wishlistApi.getAll()
      .then(res  => { if (!cancelled) setBooks(res.books); })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load wishlist'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const handleRemove = async (bookId: string) => {
    try {
      await wishlistApi.remove(bookId);
      setBooks(prev => prev.filter(b => b.id !== bookId));
    } catch {
      // non-critical — silently ignore
    }
  };

  // ── Not logged in ────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="wishlist-gate">
        <span className="wishlist-gate__icon">🔖</span>
        <h2>Sign in to see your wishlist</h2>
        <button className="wishlist-btn-primary" onClick={() => navigate('/login')}>
          Sign In
        </button>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="wishlist-loading">
        <div className="wishlist-spinner" />
        <p>Loading wishlist…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="wishlist-gate">
        <p className="wishlist-error">{error}</p>
        <button className="wishlist-btn-primary" onClick={() => navigate('/')}>Browse Books</button>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (books.length === 0) {
    return (
      <div className="wishlist-gate">
        <span className="wishlist-gate__icon">🔖</span>
        <h2>Your wishlist is empty</h2>
        <p>Browse books and click "Add to Wishlist" to save them here.</p>
        <button className="wishlist-btn-primary" onClick={() => navigate('/')}>
          Browse Books
        </button>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <h1 className="wishlist-title">My Wishlist <span className="wishlist-count">({books.length})</span></h1>

      <div className="wishlist-grid">
        {books.map(book => (
          <div key={book.id} className="wishlist-item">
            <BookCard book={book} />
            <button
              className="wishlist-remove-btn"
              onClick={() => handleRemove(book.id)}
              aria-label={`Remove ${book.title} from wishlist`}
            >
              ✕ Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WishlistPage;
