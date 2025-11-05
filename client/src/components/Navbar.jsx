import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated, isFreelancer, isClient } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll on mobile
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [mobileMenuOpen]);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          Freelance Platform
        </h1>

        {/* Desktop Navigation */}
        <div className="navbar-links">
          {isAuthenticated ? (
            <>
              <Link to="/">Projects</Link>
              {isFreelancer && <Link to="/my-proposals">My Proposals</Link>}
              {isClient && <Link to="/my-projects">My Projects</Link>}
              <Link to="/contracts">Contracts</Link>
              <Link to="/profile">Profile</Link>
              <span className="navbar-user">
                {user.first_name} ({user.role})
              </span>
              <button onClick={handleLogout} className="navbar-logout-btn">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="navbar-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="navbar-mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Mobile Menu Panel */}
            <motion.div
              className="navbar-mobile-menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
            >
              {isAuthenticated ? (
                <>
                  <div className="navbar-mobile-user">
                    {user.first_name} ({user.role})
                  </div>
                  <Link to="/" onClick={() => setMobileMenuOpen(false)}>Projects</Link>
                  {isFreelancer && <Link to="/my-proposals" onClick={() => setMobileMenuOpen(false)}>My Proposals</Link>}
                  {isClient && <Link to="/my-projects" onClick={() => setMobileMenuOpen(false)}>My Projects</Link>}
                  <Link to="/contracts" onClick={() => setMobileMenuOpen(false)}>Contracts</Link>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
                  <button onClick={handleLogout} className="navbar-mobile-logout">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>Register</Link>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
