import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated, isFreelancer, isClient } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          Freelance Platform
        </h1>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {isAuthenticated ? (
            <>
              <Link to="/">Projects</Link>
              {isFreelancer && <Link to="/my-proposals">My Proposals</Link>}
              {isClient && <Link to="/my-projects">My Projects</Link>}
              <Link to="/contracts">Contracts</Link>
              <Link to="/profile">Profile</Link>
              <span style={{ color: '#ecf0f1' }}>
                {user.first_name} ({user.role})
              </span>
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
