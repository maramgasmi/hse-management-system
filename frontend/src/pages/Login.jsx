// =============================================================
// Login.jsx  — high-fidelity industrial dark theme
// -------------------------------------------------------------
// This version replaces the generic light-blue gradient with
// a professional dark surface matching the HSE dashboard.
// =============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheckIcon } from '@heroicons/react/24/solid';

// ---------------------------------------------------------------
// Theme tokens
// ---------------------------------------------------------------
const BG        = '#0B0E14';
const CARD_BG   = '#151921';
const BORDER    = '#232933';
const BLUE      = '#3498DB';
const INSET_BG  = '#0D1117';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: BG }}>
      <div className="max-w-md w-full space-y-8">
        {/* Branding section */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 64,
                height: 64,
                background: 'linear-gradient(135deg, #2980B9 0%, #3498DB 100%)',
                boxShadow: '0 0 20px rgba(52, 152, 219, 0.3)'
              }}
            >
              <ShieldCheckIcon className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            SafetyFirst <span style={{ color: BLUE }}>HSE</span>
          </h2>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            Health, Safety & Environment Management
          </p>
        </div>
        
        {/* Login form card */}
        <div
          className="rounded-lg p-8 shadow-2xl"
          style={{
            background: CARD_BG,
            border: `1px solid ${BORDER}`
          }}
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div
                className="rounded-md px-4 py-3 text-xs font-semibold"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#FCA5A5'
                }}
              >
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 tracking-widest mb-1.5 uppercase">
                  Username
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 text-sm rounded-md focus:outline-none transition-all"
                  style={{
                    background: INSET_BG,
                    border: `1px solid ${BORDER}`,
                    color: '#FFF',
                    focusBorderColor: BLUE
                  }}
                  onFocus={(e) => e.target.style.borderColor = BLUE}
                  onBlur={(e) => e.target.style.borderColor = BORDER}
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 tracking-widest mb-1.5 uppercase">
                  Password
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2.5 text-sm rounded-md focus:outline-none transition-all"
                  style={{
                    background: INSET_BG,
                    border: `1px solid ${BORDER}`,
                    color: '#FFF',
                    focusBorderColor: BLUE
                  }}
                  onFocus={(e) => e.target.style.borderColor = BLUE}
                  onBlur={(e) => e.target.style.borderColor = BORDER}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(90deg, #2980B9 0%, #3498DB 100%)',
                }}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </div>
            
            {/* Demo guide */}
            <div className="text-center pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
              <p className="text-[11px] text-gray-600 font-bold tracking-widest uppercase mb-1">Demo Access</p>
              <code className="text-[10px]" style={{ color: BLUE }}>admin / admin123</code>
            </div>
          </form>
        </div>

        {/* Legal footer */}
        <p className="text-center text-[10px] text-gray-600 uppercase tracking-[2px]">
          Secure Industrial Gateway &copy; 2026
        </p>
      </div>
    </div>
  );
};

export default Login;