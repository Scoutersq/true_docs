import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Menu, X, LogOut, LayoutDashboard, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import '../styles/Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { startNewDocument, theme, setTheme } = useApp();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isWorkspace = location.pathname === '/workspace';
  const isLanding = location.pathname === '/';

  const handleAnchorClick = (hash) => {
    if (isLanding) {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/' + hash);
    }
  };

  const handleCtaClick = () => {
    if (isWorkspace) {
      startNewDocument();
    } else {
      navigate('/workspace');
    }
  };

  return (
    <motion.nav
      className={`navbar ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -72, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to="/" className="navbar__brand">
        <div className="navbar__logo">
          <FileText strokeWidth={2.5} />
        </div>
        <h1 className="navbar__title">
          True<span>Docs</span>
        </h1>
      </Link>

      <div className="navbar__nav">
        {!isWorkspace && (
          <>
            <button className="navbar__link" onClick={() => handleAnchorClick('#features')}>Features</button>
            <button className="navbar__link" onClick={() => handleAnchorClick('#how-it-works')}>How It Works</button>
          </>
        )}

        {isAuthenticated && !isWorkspace && <div className="navbar__divider" />}

        {isAuthenticated ? (
          <>
            <button
              className="navbar__link"
              onClick={() => navigate('/dashboard')}
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>

            <div className="navbar__divider" />

            <div className="navbar__user">
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="navbar__avatar"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="navbar__user-name">{user.name?.split(' ')[0]}</span>
            </div>
            <button className="navbar__link" onClick={logout}>
              <LogOut size={16} /> Logout
            </button>
          </>
        ) : (
          <button
            className="navbar__link"
            onClick={() => navigate('/auth')}
          >
            Log In
          </button>
        )}

        {/* Theme toggle */}
        <button
          className="navbar__theme-btn"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button
          className="navbar__cta"
          onClick={handleCtaClick}
        >
          {isWorkspace ? 'New Document' : 'Get Started'}
        </button>
      </div>

      <button
        className="navbar__menu-btn"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile panel */}
      <div className={`navbar__mobile-panel ${mobileOpen ? 'open' : ''}`}>
        <div className="navbar__mobile-inner">
          <div className="navbar__mobile-links">
            {!isWorkspace && (
              <>
                <button className="navbar__mobile-link" onClick={() => { handleAnchorClick('#features'); setMobileOpen(false); }}>Features</button>
                <button className="navbar__mobile-link" onClick={() => { handleAnchorClick('#how-it-works'); setMobileOpen(false); }}>How It Works</button>
              </>
            )}

            {isAuthenticated ? (
              <>
                <button className="navbar__mobile-link" onClick={() => { navigate('/dashboard'); setMobileOpen(false); }}>
                  Dashboard
                </button>
                <div className="navbar__mobile-user">
                  {user?.avatar && <img src={user.avatar} alt={user.name} className="navbar__avatar" referrerPolicy="no-referrer" />}
                  <span className="navbar__user-name">{user?.name?.split(' ')[0]}</span>
                </div>
                <button className="navbar__mobile-link" onClick={() => { logout(); setMobileOpen(false); }}>
                  Logout
                </button>
              </>
            ) : (
              <button className="navbar__mobile-link" onClick={() => { navigate('/auth'); setMobileOpen(false); }}>
                Log In
              </button>
            )}

            <button className="navbar__mobile-cta" onClick={() => { handleCtaClick(); setMobileOpen(false); }}>
              {isWorkspace ? 'New Document' : 'Get Started'}
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
