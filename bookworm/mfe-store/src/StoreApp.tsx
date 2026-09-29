import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CatalogPage from './pages/CatalogPage';
import BookDetailPage from './pages/BookDetailPage';
import CartPage from './pages/CartPage';
import WishlistPage from './pages/WishlistPage';

const StoreApp: React.FC = () => {
  return (
    <Routes>
      <Route path="/"          element={<CatalogPage />} />
      <Route path="/catalog/*" element={<CatalogPage />} />
      <Route path="/book/:id"  element={<BookDetailPage />} />
      <Route path="/cart/*"    element={<CartPage />} />
      <Route path="/wishlist"  element={<WishlistPage />} />
      <Route path="/wishlist/*"element={<WishlistPage />} />
      <Route path="*"          element={<CatalogPage />} />
    </Routes>
  );
};

export default StoreApp;
