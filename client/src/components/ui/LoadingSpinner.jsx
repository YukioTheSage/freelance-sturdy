import React from 'react';
import { motion } from 'framer-motion';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', color = '#3498db' }) => {
  const sizes = {
    small: 16,
    medium: 24,
    large: 40
  };

  const dimension = sizes[size] || sizes.medium;

  return (
    <motion.div
      className="loading-spinner"
      style={{ width: dimension, height: dimension }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      aria-label="Loading"
      role="status"
    >
      <svg viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ color: '#e0e0e0' }}
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
          strokeDashoffset="0"
          style={{ color }}
        />
      </svg>
    </motion.div>
  );
};

export default LoadingSpinner;
