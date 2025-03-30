// server.js - Main application entry point
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { logger } = require('./utils/logger');
const { loadContextFiles } = require('./services/context.service');
const whatsappRoutes = require('./routes/whatsapp.routes');
const adminRoutes = require('./routes/admin.routes');
const { setupSessionCleanup } = require('./services/session.service');

// Initialize Express app
const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

// Routes
app.use(whatsappRoutes);
app.use(adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Service is running');
});

// Start the application
async function startApp() {
  try {
    // Load context files first
    await loadContextFiles();
    
    // Setup session cleanup
    setupSessionCleanup();
    
    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`🚀 Chemotherapy support chatbot running on port ${PORT}`);
      logger.info(`Make sure to configure Twilio webhook URL for /whatsapp endpoint`);
    });
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Start the app
startApp();