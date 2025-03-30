// services/enhanced-user.service.js - Handles user registration and data integration
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');
const { getSchedulerForUser } = require('./scheduler.service');

/**
 * Enhanced User Service
 * Handles user registration, data storage, and integration with the scheduler
 */
class EnhancedUserService {
  /**
   * Initialize the user service
   */
  static async init() {
    try {
      // Ensure data directories exist
      const dataDir = path.join(__dirname, '..', 'data');
      const usersDir = path.join(dataDir, 'users');
      
      await fs.mkdir(dataDir, { recursive: true });
      await fs.mkdir(usersDir, { recursive: true });
      
      logger.info('📁 Enhanced user service initialized');
      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize enhanced user service:', error);
      return false;
    }
  }

  /**
   * Register a new user with all the information from signup
   * @param {Object} userData - Complete user information
   * @returns {Object} - Result of the registration
   */
  static async registerUser(userData) {
    try {
      // Validate required fields
      if (!userData.phone) {
        return {
          success: false,
          message: "Phone number is required"
        };
      }
      
      // Format phone number for WhatsApp
      let phoneNumber = userData.phone;
      if (!phoneNumber.startsWith('whatsapp:')) {
        phoneNumber = `whatsapp:${phoneNumber}`;
      }
      
      // Check if the user already exists
      const userDataPath = path.join(__dirname, '..', 'data', 'users', `${phoneNumber.replace(/\W/g, '_')}.json`);
      
      try {
        await fs.access(userDataPath);
        // File exists, user already registered
        return {
          success: false,
          message: "User with this phone number is already registered"
        };
      } catch (accessError) {
        // File doesn't exist, continue with registration
      }
      
      // Prepare user data with all the fields from sign-up
      const userObj = {
        phoneNumber: phoneNumber,
        name: userData.name || '',
        email: userData.email || '',
        diagnosis: userData.diagnosis || '',
        age: userData.age || null,
        gender: userData.gender || '',
        treatmentType: userData.treatmentType || '',
        treatmentStartDate: userData.treatmentStartDate || null,
        treatmentFrequency: userData.treatmentFrequency || '',
        medications: userData.medications || [],
        allergies: userData.allergies || [],
        emergencyContact: userData.emergencyContact || null,
        careTeam: userData.careTeam || [],
        preferences: {
          checkInFrequency: userData.checkInFrequency || 'daily',
          checkInTime: userData.checkInTime || '09:00',
          reminderEnabled: userData.reminderEnabled !== false // Default to true
        },
        createdAt: new Date().toISOString(),
        lastInteraction: new Date().toISOString(),
        symptoms: []
      };
      
      // Save the user data
      await fs.writeFile(userDataPath, JSON.stringify(userObj, null, 2));
      
      // Initialize a scheduler for this user
      const scheduler = await getSchedulerForUser(phoneNumber);
      
      // Set up the user's scheduler with their preferences
      await scheduler.setupSchedule(userObj.preferences);
      
      // If treatment dates are provided, add them to the scheduler
      if (userData.upcomingTreatmentDates && Array.isArray(userData.upcomingTreatmentDates)) {
        for (const dateStr of userData.upcomingTreatmentDates) {
          try {
            const treatmentDate = new Date(dateStr);
            if (!isNaN(treatmentDate.getTime())) {
              // Valid date
              await scheduler.triggerService.addTreatmentSchedule(treatmentDate);
              break; // Just add the earliest one for now
            }
          } catch (dateError) {
            logger.error(`Invalid treatment date format: ${dateStr}`);
          }
        }
      }
      
      logger.info(`👤 Registered new user: ${phoneNumber}`);
      
      return {
        success: true,
        message: "User registered successfully",
        userId: phoneNumber
      };
    } catch (error) {
      logger.error('❌ Error registering user:', error);
      return {
        success: false,
        message: "Error registering user: " + error.message
      };
    }
  }

  /**
   * Update a user's information
   * @param {string} phoneNumber - User's phone number
   * @param {Object} updateData - Data to update
   * @returns {Object} - Result of the update
   */
  static async updateUser(phoneNumber, updateData) {
    try {
      // Format phone number if needed
      if (!phoneNumber.startsWith('whatsapp:')) {
        phoneNumber = `whatsapp:${phoneNumber}`;
      }
      
      // Get the user's scheduler
      const scheduler = await getSchedulerForUser(phoneNumber);
      
      // Load existing user data
      await scheduler.loadUserData();
      
      // Merge with update data (without overwriting createdAt)
      const { createdAt, ...userDataToUpdate } = updateData;
      const updatedUserData = {
        ...scheduler.userData,
        ...userDataToUpdate,
        lastInteraction: new Date().toISOString()
      };
      
      // If preferences are being updated, also update the scheduler
      if (updateData.preferences) {
        await scheduler.setupSchedule(updateData.preferences);
      }
      
      // Save the updated user data
      await scheduler.updateUserData(updatedUserData);
      
      logger.info(`👤 Updated user: ${phoneNumber}`);
      
      return {
        success: true,
        message: "User updated successfully"
      };
    } catch (error) {
      logger.error(`❌ Error updating user ${phoneNumber}:`, error);
      return {
        success: false,
        message: "Error updating user: " + error.message
      };
    }
  }

  /**
   * Get a user's information
   * @param {string} phoneNumber - User's phone number
   * @returns {Object} - User data
   */
  static async getUser(phoneNumber) {
    try {
      // Format phone number if needed
      if (!phoneNumber.startsWith('whatsapp:')) {
        phoneNumber = `whatsapp:${phoneNumber}`;
      }
      
      // Get the user's data file path
      const userDataPath = path.join(__dirname, '..', 'data', 'users', `${phoneNumber.replace(/\W/g, '_')}.json`);
      
      // Read the user data
      const userData = JSON.parse(await fs.readFile(userDataPath, 'utf8'));
      
      return {
        success: true,
        user: userData
      };
    } catch (error) {
      logger.error(`❌ Error getting user ${phoneNumber}:`, error);
      return {
        success: false,
        message: "User not found or error retrieving data"
      };
    }
  }

  /**
   * Add a symptom report for a user
   * @param {string} phoneNumber - User's phone number
   * @param {Object} symptomData - Symptom information
   * @returns {Object} - Result of the addition
   */
  static async addSymptom(phoneNumber, symptomData) {
    try {
      // Format phone number if needed
      if (!phoneNumber.startsWith('whatsapp:')) {
        phoneNumber = `whatsapp:${phoneNumber}`;
      }
      
      // Get the user's scheduler
      const scheduler = await getSchedulerForUser(phoneNumber);
      
      // Use the AI trigger service to record the symptom
      await scheduler.triggerService.recordSymptom(symptomData);
      
      return {
        success: true,
        message: "Symptom recorded successfully"
      };
    } catch (error) {
      logger.error(`❌ Error adding symptom for ${phoneNumber}:`, error);
      return {
        success: false,
        message: "Error recording symptom: " + error.message
      };
    }
  }

  /**
   * Add a treatment date for a user
   * @param {string} phoneNumber - User's phone number
   * @param {Date} treatmentDate - Treatment date
   * @returns {Object} - Result of the addition
   */
  static async addTreatmentDate(phoneNumber, treatmentDate) {
    try {
      // Format phone number if needed
      if (!phoneNumber.startsWith('whatsapp:')) {
        phoneNumber = `whatsapp:${phoneNumber}`;
      }
      
      // Get the user's scheduler
      const scheduler = await getSchedulerForUser(phoneNumber);
      
      // Add the treatment date
      await scheduler.triggerService.addTreatmentSchedule(treatmentDate);
      
      return {
        success: true,
        message: "Treatment date added successfully"
      };
    } catch (error) {
      logger.error(`❌ Error adding treatment date for ${phoneNumber}:`, error);
      return {
        success: false,
        message: "Error adding treatment date: " + error.message
      };
    }
  }

  /**
   * Send a manual message to a user
   * @param {string} phoneNumber - User's phone number
   * @param {string} message - Message to send
   * @returns {Object} - Result of the message sending
   */
  static async sendManualMessage(phoneNumber, message) {
    try {
      // Format phone number if needed
      if (!phoneNumber.startsWith('whatsapp:')) {
        phoneNumber = `whatsapp:${phoneNumber}`;
      }
      
      // Import WhatsApp service
      const { sendWhatsAppMessage } = require('./whatsapp.service');
      
      // Send the message
      await sendWhatsAppMessage(phoneNumber, message);
      
      // Get the user's scheduler to update the last interaction
      const scheduler = await getSchedulerForUser(phoneNumber);
      await scheduler.updateUserData({ lastInteraction: new Date().toISOString() });
      
      return {
        success: true,
        message: "Message sent successfully"
      };
    } catch (error) {
      logger.error(`❌ Error sending message to ${phoneNumber}:`, error);
      return {
        success: false,
        message: "Error sending message: " + error.message
      };
    }
  }
}

module.exports = EnhancedUserService;