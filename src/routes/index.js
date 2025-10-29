const express = require('express');
const router = express.Router();

const authRouter = require('./auth');
const usersRouter = require('./users');
const projectsRouter = require('./projects');
const proposalsRouter = require('./proposals');
const contractsRouter = require('./contracts');

// Mount routers
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/projects', projectsRouter);
router.use('/proposals', proposalsRouter);
router.use('/contracts', contractsRouter);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
