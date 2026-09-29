import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';

const CheckoutApp: React.FC = () => {
  return (
    <Routes>
      <Route path="/checkout"             element={<CheckoutPage />} />
      <Route path="/checkout/*"           element={<CheckoutPage />} />
      <Route path="/payment"              element={<CheckoutPage />} />
      <Route path="/payment/*"            element={<CheckoutPage />} />
      <Route path="/order-confirmation"   element={<CheckoutPage />} />
      <Route path="/order-confirmation/*" element={<CheckoutPage />} />
      <Route path="/orders"               element={<OrdersPage />} />
      <Route path="/orders/*"             element={<OrdersPage />} />
      <Route path="*"                     element={<CheckoutPage />} />
    </Routes>
  );
};

export default CheckoutApp;
