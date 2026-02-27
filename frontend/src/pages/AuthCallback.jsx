import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * This page is hit after Google redirects back.
 * URL will look like: /auth/callback?token=xxx
 * We extract the token, store it, and redirect to /workspace.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { handleAuthCallback } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (token) {
      handleAuthCallback(token);
      navigate('/workspace', { replace: true });
    } else {
      // Auth failed — go back to login
      navigate(`/auth${error ? `?error=${error}` : ''}`, { replace: true });
    }
  }, [searchParams, handleAuthCallback, navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-body)',
        color: 'var(--text-secondary)',
      }}
    >
      <p>Authenticating…</p>
    </div>
  );
}
