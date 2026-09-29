import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// AuthApp is exposed via Module Federation.
// When loaded by the shell, the shell already provides a BrowserRouter —
// so we use Routes directly (no extra Router wrapper needed).
// When run standalone (port 3001), bootstrap.tsx wraps it in BrowserRouter.
const AuthApp: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login/*"    element={<LoginPage />} />
        <Route path="/register/*" element={<RegisterPage />} />
        {/* Standalone fallback */}
        <Route path="*"           element={<LoginPage />} />
      </Routes>
    </AuthProvider>
  );
};

export default AuthApp;
