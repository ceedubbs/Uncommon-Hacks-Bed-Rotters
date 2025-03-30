// routes/user.routes.js - User management routes
const express = require('express');
const router = express.Router();
const {
  registerUser,
  updateUser,
  getUser,
  sendMessage,
  addTreatmentDate
} = require('../controllers/user.controller');

// User registration route
router.post('/users', registerUser);

// Get user information
router.get('/users/:phoneNumber', getUser);

// Update user information
router.put('/users/:phoneNumber', updateUser);

// Send a manual message to a user
router.post('/users/:phoneNumber/messages', sendMessage);

// Add a treatment date for a user
router.post('/users/:phoneNumber/treatments', addTreatmentDate);

module.exports = router;