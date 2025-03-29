// routes/whatsapp.routes.js - WhatsApp routes
const express = require('express');
const router = express.Router();
const { handleWhatsAppMessage } = require('../controllers/whatsapp.controller');

// WhatsApp webhook endpoint
router.post('/whatsapp', handleWhatsAppMessage);

module.exports = router;