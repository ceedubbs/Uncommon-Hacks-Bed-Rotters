// server.js - Main application entry point with modular agent architecture
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./utils/logger');
const { loadContextFiles } = require('./services/context.service');
const whatsappRoutes = require('./routes/whatsapp.routes');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');
const { setupSessionCleanup } = require('./services/session.service');
const EnhancedUserService = require('./services/enhanced-user.service');

// Initialize Express app
const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

// Routes
app.use(whatsappRoutes);
app.use(adminRoutes);
app.use(userRoutes); // Add the user management routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Service is running');
});

// Create required directories for modular data storage
async function createDirectories() {
  try {
    // Create data directories
    await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
    await fs.mkdir(path.join(__dirname, 'data', 'users'), { recursive: true });
    await fs.mkdir(path.join(__dirname, 'data', 'schedules'), { recursive: true });
    
    logger.info('📁 Created data directories');
    return true;
  } catch (error) {
    logger.error('❌ Error creating data directories:', error);
    return false;
  }
}

// Start the application
async function startApp() {
  try {
    // Create required directories
    await createDirectories();
    
    // Initialize enhanced user service
    await EnhancedUserService.init();
    
    // Load context files
    await loadContextFiles();
    
    // Setup session cleanup
    setupSessionCleanup();
    
    // Load existing user agents if any (for production systems, you might want to delay this)
    // This step is optional and can be skipped for better startup performance
    // await restoreUserAgents();
    
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

// Optional: Restore user agents from filesystem
async function restoreUserAgents() {
  try {
    const { getSchedulerForUser } = require('./services/scheduler.service');
    
    // Read user directories
    const userDir = path.join(__dirname, 'data', 'users');
    const files = await fs.readdir(userDir);
    
    // Filter for JSON files
    const userFiles = files.filter(file => file.endsWith('.json'));
    
    logger.info(`Found ${userFiles.length} existing users, restoring agents...`);
    
    // Initialize scheduler for each user
    for (const file of userFiles) {
      try {
        const userData = JSON.parse(await fs.readFile(path.join(userDir, file), 'utf8'));
        if (userData.phoneNumber) {
          // Initialize scheduler (which will load the user's data and schedule)
          await getSchedulerForUser(userData.phoneNumber);
          logger.info(`✅ Restored agent for ${userData.phoneNumber}`);
        }
      } catch (userError) {
        logger.error(`Error restoring user from ${file}:`, userError);
      }
    }
    
    logger.info('🔄 User agent restoration complete');
  } catch (error) {
    logger.error('❌ Error restoring user agents:', error);
  }
}

// Start the app
startApp();