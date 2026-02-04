import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Atom, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('admin@radiopharma.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      const serverError = err.response?.data?.error;
      if (serverError === 'Invalid credentials') {
        setError('The email or password you entered is incorrect. Please try again.');
      } else if (err.response?.status === 401) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (err.response?.status === 403) {
        setError('Your account has been disabled. Please contact support.');
      } else if (!err.response) {
        setError('Unable to connect to the server. Please check your internet connection.');
      } else {
        setError(serverError || 'Login failed. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--bg-primary)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '24rem',
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '4rem',
              height: '4rem',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <Atom size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>RadioPharma OMS</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Order Management System
          </p>
        </div>

        {error && (
          <div
            data-testid="error-message"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '1rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Login Failed</div>
              <div style={{ color: '#b91c1c' }}>{error}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              data-testid="email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              data-testid="password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            data-testid="login-button"
            style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.75rem',
            color: '#94a3b8',
          }}
        >
          Demo: admin@radiopharma.com / admin123
        </p>
      </div>
    </div>
  );
}
