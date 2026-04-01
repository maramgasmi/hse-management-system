import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Eager load the login page (needed immediately on first visit)
import Login from './pages/Login';

// Lazy load the authenticated pages so the initial JS bundle stays small.
// These are the NEW high-fidelity HSE pages we built.
const HSEDashboard    = lazy(() => import('./pages/HSEDashboard'));
const HSEIncidentLog  = lazy(() => import('./pages/HSEIncidentLog'));
const Analytics       = lazy(() => import('./pages/Analytics'));

// Loading fallback — dark themed to avoid a white flash when the
// lazy chunk is fetching. Matches our #0B0E14 page background.
const PageLoader = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0E14' }}>
    <div className="text-center">
      <div
        className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 mb-3"
        style={{ borderColor: '#3498DB' }}
      />
      <p className="text-sm" style={{ color: '#6B7280' }}>Loading…</p>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { background: '#151921', color: '#E5E7EB', border: '1px solid #232933' } }} />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes — new HSE design */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <HSEDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/incidents"
                element={
                  <ProtectedRoute>
                    <HSEIncidentLog />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                }
              />

              {/* Default redirects */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;