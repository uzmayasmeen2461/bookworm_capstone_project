import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';
import MFEErrorBoundary from './components/MFEErrorBoundary';

// ─── Lazy-load each MFE ───────────────────────────────────────────────────────
// Strategy: catch the failed import promise so it never becomes an unhandled
// rejection (which triggers the React dev overlay). Instead return a component
// that throws synchronously during render — this is caught cleanly by the
// MFEErrorBoundary without ever touching console.error or the overlay.
const makeSafeRemote = (importFn: () => Promise<any>) =>
  lazy(() =>
    importFn().catch((err: Error) => ({
      default: () => { throw err; },
    }))
  );

const AuthApp = makeSafeRemote(() => import('mfeAuth/AuthApp'));
const StoreApp = makeSafeRemote(() => import('mfeStore/StoreApp'));
const CheckoutApp = makeSafeRemote(() => import('mfeCheckout/CheckoutApp'));

// ─── Wrap each MFE in its own error boundary + suspense ──────────────────────
// This way if ONE remote is down, only that section fails gracefully.
// The rest of the app keeps working normally.
const AuthAppWithBoundary = () => (
  <MFEErrorBoundary name="Auth">
    <Suspense fallback={<LoadingSpinner />}>
      <AuthApp />
    </Suspense>
  </MFEErrorBoundary>
);

const StoreAppWithBoundary = () => (
  <MFEErrorBoundary name="Store">
    <Suspense fallback={<LoadingSpinner />}>
      <StoreApp />
    </Suspense>
  </MFEErrorBoundary>
);

const CheckoutAppWithBoundary = () => (
  <MFEErrorBoundary name="Checkout">
    <Suspense fallback={<LoadingSpinner />}>
      <CheckoutApp />
    </Suspense>
  </MFEErrorBoundary>
);

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Navbar />
      <main>
        <Routes>
          {/* Auth routes — owned by mfe-auth */}
          <Route path="/login/*"    element={<AuthAppWithBoundary />} />
          <Route path="/register/*" element={<AuthAppWithBoundary />} />

          {/* Checkout routes — must come BEFORE the store catch-all */}
          <Route path="/checkout/*"           element={<CheckoutAppWithBoundary />} />
          <Route path="/payment/*"            element={<CheckoutAppWithBoundary />} />
          <Route path="/orders/*"             element={<CheckoutAppWithBoundary />} />
          <Route path="/order-confirmation/*" element={<CheckoutAppWithBoundary />} />

          {/* Store routes — the single catch-all mounts StoreApp for every
              remaining URL. StoreApp uses absolute paths internally so it
              receives the full pathname and matches correctly. */}
          <Route path="*" element={<StoreAppWithBoundary />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default App;
