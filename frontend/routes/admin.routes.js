// routes/admin.routes.js - Admin routes
const express = require('express');
const router = express.Router();
const { viewContextData } = require('../controllers/admin.controller');

// Admin endpoint to view context data
router.get('/admin/context', viewContextData);

module.exports = router;