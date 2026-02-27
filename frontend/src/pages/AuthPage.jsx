import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/AuthPage.css';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/workspace';
  const { loginWithGoogle, loginWithGoogleFrom, loginWithCredentials, signupWithCredentials } = useAuth();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await loginWithCredentials(form.email, form.password);
      } else {
        if (!form.name.trim()) {
          setError('Please enter your name');
          setIsSubmitting(false);
          return;
        }
        await signupWithCredentials(form.name, form.email, form.password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <div className="auth">
      {/* Background */}
      <div className="auth__bg">
        <div className="auth__bg-orb auth__bg-orb--1" />
        <div className="auth__bg-orb auth__bg-orb--2" />
        <div className="auth__bg-grid" />
      </div>

      {/* Card */}
      <motion.div
        className="auth__card"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="auth__card-accent" />
        <div className="auth__card-inner">
          {/* Header */}
          <div className="auth__header">
            <motion.div
              className="auth__logo"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <FileText size={24} strokeWidth={2.5} />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.h1
                key={mode + '-title'}
                className="auth__title"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                {isLogin ? 'Welcome back' : 'Create account'}
              </motion.h1>
            </AnimatePresence>
            <p className="auth__subtitle">
              {isLogin
                ? 'Sign in to continue to TrueDocs'
                : 'Get started with intelligent document analysis'}
            </p>
          </div>

          {/* Tabs */}
          <div className="auth__tabs">
            <button
              className={`auth__tab ${isLogin ? 'auth__tab--active' : ''}`}
              onClick={() => setMode('login')}
            >
              Log In
            </button>
            <button
              className={`auth__tab ${!isLogin ? 'auth__tab--active' : ''}`}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form className="auth__form" onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="name-field"
                  className="auth__field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <label className="auth__label">Full Name</label>
                  <div className="auth__input-wrapper">
                    <User size={18} />
                    <input
                      className="auth__input"
                      type="text"
                      name="name"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={handleChange}
                      autoComplete="name"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="auth__field">
              <label className="auth__label">Email</label>
              <div className="auth__input-wrapper">
                <Mail size={18} />
                <input
                  className="auth__input"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="auth__field">
              <label className="auth__label">Password</label>
              <div className="auth__input-wrapper">
                <Lock size={18} />
                <input
                  className="auth__input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
                  value={form.password}
                  onChange={handleChange}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                />
                <button
                  type="button"
                  className="auth__password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="auth__extras">
                <label className="auth__remember">
                  <input type="checkbox" />
                  Remember me
                </label>
                <button type="button" className="auth__forgot">
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <motion.div
                className="auth__error"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              className="auth__submit"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}</span>
              {!isSubmitting && <ArrowRight size={18} />}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="auth__divider">
            <div className="auth__divider-line" />
            <span className="auth__divider-text">or continue with</span>
            <div className="auth__divider-line" />
          </div>

          {/* Social Buttons */}
          <div className="auth__socials">
            <button
              className="auth__social-btn"
              type="button"
              onClick={() => loginWithGoogleFrom(from)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="auth__footer">
          <p className="auth__footer-text">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              className="auth__footer-link"
              onClick={() => setMode(isLogin ? 'signup' : 'login')}
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
