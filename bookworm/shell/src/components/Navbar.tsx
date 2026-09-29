import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

interface User {
  id: string;
  name: string;
  email: string;
  giftPoints: number;
}

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [cartCount, setCartCount] = useState(0);

  // On mount — restore user from storage so navbar shows name on page refresh
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bw_user') || sessionStorage.getItem('bw_user');
      if (saved) setUser(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Listen for auth events fired by mfe-auth
  // Cart badge is updated via bw:cart:updated events fired by useCart in mfe-store
  useEffect(() => {
    const handleLogin = (e: Event) => {
      const { user: loggedInUser } = (e as CustomEvent).detail;
      setUser(loggedInUser);
    };

    const handleLogout = () => {
      setUser(null);
      setCartCount(0);
      navigate('/login');
    };

    const handleCartUpdate = (e: Event) => {
      const { count } = (e as CustomEvent).detail;
      setCartCount(count);
    };

    window.addEventListener('bw:auth:login',   handleLogin);
    window.addEventListener('bw:auth:logout',  handleLogout);
    window.addEventListener('bw:cart:updated', handleCartUpdate);

    return () => {
      window.removeEventListener('bw:auth:login',   handleLogin);
      window.removeEventListener('bw:auth:logout',  handleLogout);
      window.removeEventListener('bw:cart:updated', handleCartUpdate);
    };
  }, [navigate]);

  return (
    <nav className="navbar">
      <div className="navbar__brand" onClick={() => navigate('/')}>
        <span className="navbar__logo">📚</span>
        <span className="navbar__title">Book Worm</span>
      </div>

      <div className="navbar__links">
        <Link to="/orders"   className="navbar__link">My Orders</Link>
        <Link to="/wishlist" className="navbar__link">My Wishlist</Link>
        <Link to="/catalog"  className="navbar__link">My Writers</Link>
      </div>

      <div className="navbar__actions">
        <Link to="/cart" className="navbar__icon" aria-label="Cart">
          <span className="navbar__cart-icon">🛒</span>
          {cartCount > 0 && (
            <span className="navbar__cart-badge">{cartCount}</span>
          )}
        </Link>

        {user ? (
          <div className="navbar__user">
            <span className="navbar__user-name">{user.name.split(' ')[0]}</span>
            <button
              className="navbar__logout"
              onClick={() =>
                window.dispatchEvent(new CustomEvent('bw:auth:trigger:logout'))
              }
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link to="/login" className="navbar__icon" aria-label="Sign in">
            <span className="navbar__account-icon">👤</span>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
