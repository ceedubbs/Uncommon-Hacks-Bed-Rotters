// controllers/user.controller.js - User management endpoints
const EnhancedUserService = require('../services/enhanced-user.service');
const { logger } = require('../utils/logger');

/**
 * Register a new user with data from sign-up
 */
async function registerUser(req, res) {
  try {
    logger.info('🔔 User registration request received');
    
    // Get user data from request body
    const userData = req.body;
    
    // Validate required fields
    if (!userData.phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      });
    }
    
    // Register the user
    const result = await EnhancedUserService.registerUser(userData);
    
    if (result.success) {
      return res.status(201).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error('❌ Error in user registration:', error);
    return res.status(500).json({
      success: false,
      message: "Server error during registration: " + error.message
    });
  }
}

/**
 * Update a user's information
 */
async function updateUser(req, res) {
  try {
    const { phoneNumber } = req.params;
    const updateData = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      });
    }
    
    const result = await EnhancedUserService.updateUser(phoneNumber, updateData);
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error(`❌ Error updating user:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error updating user: " + error.message
    });
  }
}

/**
 * Get user information
 */
async function getUser(req, res) {
  try {
    const { phoneNumber } = req.params;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      });
    }
    
    const result = await EnhancedUserService.getUser(phoneNumber);
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(404).json(result);
    }
  } catch (error) {
    logger.error(`❌ Error getting user:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error getting user: " + error.message
    });
  }
}

/**
 * Send a manual message to a user (useful for admin tools or testing)
 */
async function sendMessage(req, res) {
  try {
    const { phoneNumber } = req.params;
    const { message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: "Phone number and message are required"
      });
    }
    
    const result = await EnhancedUserService.sendManualMessage(phoneNumber, message);
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error(`❌ Error sending message:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error sending message: " + error.message
    });
  }
}

/**
 * Add a treatment date for a user
 */
async function addTreatmentDate(req, res) {
  try {
    const { phoneNumber } = req.params;
    const { treatmentDate } = req.body;
    
    if (!phoneNumber || !treatmentDate) {
      return res.status(400).json({
        success: false,
        message: "Phone number and treatment date are required"
      });
    }
    
    const dateObj = new Date(treatmentDate);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid treatment date format"
      });
    }
    
    const result = await EnhancedUserService.addTreatmentDate(phoneNumber, dateObj);
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error(`❌ Error adding treatment date:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error adding treatment date: " + error.message
    });
  }
}

module.exports = {
  registerUser,
  updateUser,
  getUser,
  sendMessage,
  addTreatmentDate
};