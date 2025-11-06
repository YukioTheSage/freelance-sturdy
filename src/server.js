const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// TEMPORARY HARDCODED SECRETS - FOR TESTING ONLY!
// WARNING: Never commit real secrets to production!
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'c193e0b6db03de31445d3aeb0a24b7b5e4b7f908e670ef39af2144bb5686294f1ab3a3dcaa9dcfe8b652d8671e357ccd777a5d91cea621a983e16697a546b6d8';
  console.log('⚠️  Using hardcoded JWT_SECRET (TEMP ONLY!)');
}

if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = '66cb715a72735df9694811982592e4eb869734181b0975a5d4fcab7d52efab4d402e8e1c6c3ca20133d5dac8eb1c55c04abf92302d4fe1ed675a72c9cfba74e1';
  console.log('⚠️  Using hardcoded JWT_REFRESH_SECRET (TEMP ONLY!)');
}

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})); // Enable CORS with specific origin
app.use(morgan('dev')); // Request logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// API Routes
app.use('/api', routes);

// Health check endpoint (for Docker and monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Freelancing Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      users: '/api/users',
      projects: '/api/projects',
      proposals: '/api/proposals'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server only if not in serverless environment (Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API URL: http://localhost:${PORT}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
  });
}

// Export for Vercel serverless
module.exports = app;
