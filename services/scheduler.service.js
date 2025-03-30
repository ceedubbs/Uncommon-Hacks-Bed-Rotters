// services/scheduler.service.js - Self-contained proactive messaging scheduler
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');
const { sendWhatsAppMessage } = require('./whatsapp.service');
const { generateResponse } = require('./ai.service');

/**
 * Agent-specific scheduler service that runs independently for each user instance
 * This design allows each agent to manage its own schedule without a central database
 */
class SchedulerService {
  constructor(userPhone) {
    this.userPhone = userPhone;
    this.scheduleFile = path.join(__dirname, '..', 'data', 'schedules', `${userPhone.replace(/\W/g, '_')}.json`);
    this.userDataFile = path.join(__dirname, '..', 'data', 'users', `${userPhone.replace(/\W/g, '_')}.json`);
    this.tasks = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the scheduler instance for this specific user
   */
  async init() {
    try {
      // Create directories if they don't exist
      await fs.mkdir(path.join(__dirname, '..', 'data', 'schedules'), { recursive: true });
      await fs.mkdir(path.join(__dirname, '..', 'data', 'users'), { recursive: true });
      
      // Load existing schedule if available
      await this.loadSchedule();
      
      // Load user data if available
      await this.loadUserData();
      
      // Set up the heartbeat task to check schedules every minute
      // This is a self-checking mechanism for each agent instance
      this.heartbeatTask = setInterval(() => this.checkSchedule(), 60000);
      
      // Initialize the AI-driven trigger service for this user
      const { createAITriggerService } = require('./ai-trigger.service');
      this.triggerService = createAITriggerService(this);
      
      logger.info(`🕒 Scheduler initialized for user ${this.userPhone}`);
      this.isInitialized = true;
      return true;
    } catch (error) {
      logger.error(`❌ Failed to initialize scheduler for ${this.userPhone}:`, error);
      return false;
    }
  }

  /**
   * Load the user's schedule from file
   */
  async loadSchedule() {
    try {
      const data = await fs.readFile(this.scheduleFile, 'utf8');
      this.schedule = JSON.parse(data);
      logger.info(`📅 Loaded schedule for ${this.userPhone}`);
    } catch (error) {
      // If file doesn't exist, create a default schedule
      if (error.code === 'ENOENT') {
        this.schedule = {
          checkIns: [],
          upcomingCheckIns: [],
          lastCheckIn: null,
          preferences: {
            checkInFrequency: 'daily', 
            checkInTime: '09:00',
            reminderEnabled: true
          }
        };
        await this.saveSchedule();
        logger.info(`📝 Created new schedule for ${this.userPhone}`);
      } else {
        logger.error(`❌ Error loading schedule for ${this.userPhone}:`, error);
        throw error;
      }
    }
  }

  /**
   * Save the schedule to file
   */
  async saveSchedule() {
    try {
      await fs.writeFile(this.scheduleFile, JSON.stringify(this.schedule, null, 2));
    } catch (error) {
      logger.error(`❌ Error saving schedule for ${this.userPhone}:`, error);
      throw error;
    }
  }

  /**
   * Load user data from file
   */
  async loadUserData() {
    try {
      const data = await fs.readFile(this.userDataFile, 'utf8');
      this.userData = JSON.parse(data);
      logger.info(`👤 Loaded user data for ${this.userPhone}`);
    } catch (error) {
      // If file doesn't exist, create default user data
      if (error.code === 'ENOENT') {
        this.userData = {
          phoneNumber: this.userPhone,
          createdAt: new Date().toISOString(),
          lastInteraction: new Date().toISOString(),
          name: '',
          diagnosis: '',
          symptoms: []
        };
        await this.saveUserData();
        logger.info(`📝 Created new user data for ${this.userPhone}`);
      } else {
        logger.error(`❌ Error loading user data for ${this.userPhone}:`, error);
        throw error;
      }
    }
  }

  /**
   * Save user data to file
   */
  async saveUserData() {
    try {
      await fs.writeFile(this.userDataFile, JSON.stringify(this.userData, null, 2));
    } catch (error) {
      logger.error(`❌ Error saving user data for ${this.userPhone}:`, error);
      throw error;
    }
  }

  /**
   * Update user information
   * @param {Object} updateData - Data to update
   */
  async updateUserData(updateData) {
    try {
      // Load latest data first
      await this.loadUserData();
      
      // Update with new data
      this.userData = { 
        ...this.userData, 
        ...updateData,
        lastInteraction: new Date().toISOString()
      };
      
      // Save updated data
      await this.saveUserData();
      logger.info(`📝 Updated user data for ${this.userPhone}`);
    } catch (error) {
      logger.error(`❌ Error updating user data for ${this.userPhone}:`, error);
    }
  }

  /**
   * Add a symptom report
   * @param {Object} symptomData - Symptom information
   */
  async addSymptom(symptomData) {
    try {
      // Load latest data first
      await this.loadUserData();
      
      // Add symptom with timestamp
      this.userData.symptoms = this.userData.symptoms || [];
      this.userData.symptoms.push({
        ...symptomData,
        reportedAt: new Date().toISOString()
      });
      
      // Save updated data
      await this.saveUserData();
      logger.info(`📝 Added symptom data for ${this.userPhone}`);
    } catch (error) {
      logger.error(`❌ Error adding symptom for ${this.userPhone}:`, error);
    }
  }

  /**
   * Set up the check-in schedule based on user preferences
   * @param {Object} preferences - Schedule preferences
   */
  async setupSchedule(preferences = null) {
    try {
      // Load latest schedule
      await this.loadSchedule();
      
      // Update preferences if provided
      if (preferences) {
        this.schedule.preferences = {
          ...this.schedule.preferences,
          ...preferences
        };
      }
      
      // Get current preferences
      const { checkInFrequency, checkInTime, reminderEnabled } = this.schedule.preferences;
      
      // Skip if reminders are disabled
      if (!reminderEnabled) {
        logger.info(`⏸️ Check-ins disabled for ${this.userPhone}`);
        this.schedule.upcomingCheckIns = [];
        await this.saveSchedule();
        return;
      }
      
      // Get current date
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Parse check-in time
      const [hours, minutes] = checkInTime.split(':').map(Number);
      
      // Create schedule based on frequency
      let checkInTimes = [];
      
      switch (checkInFrequency) {
        case 'daily':
          // Set next check-in for today at specified time
          const checkInTime = new Date(today);
          checkInTime.setHours(hours, minutes);
          
          // If check-in time has already passed for today, set for tomorrow
          if (checkInTime <= now) {
            checkInTime.setDate(checkInTime.getDate() + 1);
          }
          
          checkInTimes.push(checkInTime);
          break;
          
        case 'weekly':
          // Default to Monday if no day is specified
          const dayOfWeek = this.schedule.preferences.checkInDay || 1; // 0 = Sunday, 1 = Monday, etc.
          
          // Calculate next occurrence of that day
          const checkInDay = new Date(today);
          const currentDay = checkInDay.getDay();
          const daysToAdd = (dayOfWeek + 7 - currentDay) % 7;
          
          checkInDay.setDate(checkInDay.getDate() + daysToAdd);
          checkInDay.setHours(hours, minutes);
          
          // If the calculated day is today but time has passed, add a week
          if (daysToAdd === 0 && checkInDay <= now) {
            checkInDay.setDate(checkInDay.getDate() + 7);
          }
          
          checkInTimes.push(checkInDay);
          break;
          
        case 'custom':
          // Custom schedule from preferences
          if (this.schedule.preferences.customSchedule && Array.isArray(this.schedule.preferences.customSchedule)) {
            for (const schedule of this.schedule.preferences.customSchedule) {
              if (schedule.enabled) {
                const [scheduleHours, scheduleMinutes] = schedule.time.split(':').map(Number);
                const scheduleDate = new Date(today);
                scheduleDate.setHours(scheduleHours, scheduleMinutes);
                
                // Handle different frequency types
                if (schedule.type === 'daily' && scheduleDate <= now) {
                  scheduleDate.setDate(scheduleDate.getDate() + 1);
                } else if (schedule.type === 'weekly') {
                  const targetDay = schedule.day;
                  const dayDiff = (targetDay + 7 - scheduleDate.getDay()) % 7;
                  scheduleDate.setDate(scheduleDate.getDate() + dayDiff);
                  
                  // If it's today but time has passed, add a week
                  if (dayDiff === 0 && scheduleDate <= now) {
                    scheduleDate.setDate(scheduleDate.getDate() + 7);
                  }
                }
                
                checkInTimes.push(scheduleDate);
              }
            }
          }
          break;
      }
      
      // Sort check-in times chronologically
      checkInTimes.sort((a, b) => a - b);
      
      // Create upcoming check-ins
      this.schedule.upcomingCheckIns = checkInTimes.map(time => ({
        scheduledFor: time.toISOString(),
        checkInType: 'scheduled',
        status: 'pending'
      }));
      
      // Save the updated schedule
      await this.saveSchedule();
      
      logger.info(`📅 Generated schedule for ${this.userPhone} with ${checkInTimes.length} upcoming check-ins`);
    } catch (error) {
      logger.error(`❌ Error setting up schedule for ${this.userPhone}:`, error);
    }
  }

  /**
   * Check if any scheduled check-ins are due and also run AI trigger evaluation
   */
  async checkSchedule() {
    try {
      // Load latest schedule
      await this.loadSchedule();
      
      const now = new Date();
      
      // Filter for pending check-ins that are due
      const pendingCheckIns = (this.schedule.upcomingCheckIns || []).filter(checkIn => 
        checkIn.status === 'pending' && new Date(checkIn.scheduledFor) <= now
      );
      
      // Process each due check-in
      for (const checkIn of pendingCheckIns) {
        // Send the check-in message
        await this.sendCheckInMessage(checkIn);
        
        // Mark as processed
        checkIn.status = 'processed';
        
        // Add to history
        this.schedule.checkIns = this.schedule.checkIns || [];
        this.schedule.checkIns.push({
          type: checkIn.checkInType,
          timestamp: new Date().toISOString()
        });
        
        // Update last check-in time
        this.schedule.lastCheckIn = new Date().toISOString();
      }
      
      // If we processed any check-ins, save the schedule
      if (pendingCheckIns.length > 0) {
        // Save the updated schedule
        await this.saveSchedule();
        
        // Generate new schedule
        await this.setupSchedule();
        
        logger.info(`📤 Processed ${pendingCheckIns.length} scheduled check-ins for ${this.userPhone}`);
      }
      
      // Run the AI trigger service to evaluate if a proactive message should be sent
      if (this.triggerService) {
        await this.triggerService.evaluateProactiveAction();
      }
    } catch (error) {
      logger.error(`❌ Error checking schedule for ${this.userPhone}:`, error);
    }
  }

  /**
   * Send a scheduled check-in message
   * @param {Object} checkIn - Check-in details
   */
  async sendCheckInMessage(checkIn) {
    try {
      // Load latest user data
      await this.loadUserData();
      
      // Import message templates
      const messageTemplates = require('./message-templates');
      
      // Generate appropriate message based on check-in type and user data
      let message;
      
      // For the first check-in, get user name if we don't have it
      if (!this.userData.name) {
        message = messageTemplates.newUserWelcome();
      }
      // If we have the name but no diagnosis, ask for that
      else if (this.userData.name && !this.userData.diagnosis) {
        message = messageTemplates.diagnosisRequest(this.userData.name);
      }
      // Regular check-in
      else {
        // Use the correct message template based on check-in type
        switch(checkIn.checkInType) {
          case 'symptom_followup':
            const severeSymptoms = (this.userData.symptoms || [])
              .filter(symptom => symptom.severity === 'severe' && !symptom.followedUp);
            message = messageTemplates.symptomFollowUp(this.userData, severeSymptoms);
            break;
            
          case 'wellness_followup':
            message = messageTemplates.weeklyWellnessCheck(this.userData);
            break;
            
          case 'treatment_reminder':
            if (this.userData.treatmentSchedule && this.userData.treatmentSchedule.nextTreatment) {
              const nextTreatment = new Date(this.userData.treatmentSchedule.nextTreatment);
              message = messageTemplates.treatmentReminder(this.userData, nextTreatment);
            } else {
              message = messageTemplates.dailyCheckIn(this.userData);
            }
            break;
            
          case 'hydration_reminder':
            message = messageTemplates.hydrationReminder(this.userData);
            break;
            
          case 'positive_reinforcement':
            message = messageTemplates.positiveReinforcement(this.userData);
            break;
            
          case 'scheduled':
          default:
            // Regular daily check-in
            const recentSymptoms = (this.userData.symptoms || []).slice(-3);
            message = messageTemplates.dailyCheckIn(this.userData, recentSymptoms);
            break;
        }
      }
      
      // Send the message
      await sendWhatsAppMessage(this.userPhone, message);
      
      logger.info(`📱 Sent scheduled check-in to ${this.userPhone}`);
      return true;
    } catch (error) {
      logger.error(`❌ Error sending check-in to ${this.userPhone}:`, error);
      return false;
    }
  }
  
  /**
   * Schedule a follow-up for a specific issue
   * @param {string} followUpType - Type of follow-up
   * @param {number} delayHours - Hours to delay the follow-up
   */
  async scheduleFollowUp(followUpType, delayHours = 24) {
    try {
      // Load latest schedule
      await this.loadSchedule();
      
      // Calculate follow-up time
      const followUpTime = new Date();
      followUpTime.setHours(followUpTime.getHours() + delayHours);
      
      // Add follow-up to upcoming check-ins
      this.schedule.upcomingCheckIns = this.schedule.upcomingCheckIns || [];
      this.schedule.upcomingCheckIns.push({
        scheduledFor: followUpTime.toISOString(),
        checkInType: followUpType,
        status: 'pending'
      });
      
      // Save the updated schedule
      await this.saveSchedule();
      
      logger.info(`📅 Scheduled ${followUpType} follow-up for ${this.userPhone} in ${delayHours} hours`);
      return true;
    } catch (error) {
      logger.error(`❌ Error scheduling follow-up for ${this.userPhone}:`, error);
      return false;
    }
  }

  /**
   * Clean up resources when shutting down the scheduler
   */
  cleanup() {
    if (this.heartbeatTask) {
      clearInterval(this.heartbeatTask);
    }
    logger.info(`🧹 Cleaned up scheduler for ${this.userPhone}`);
  }
}

/**
 * Factory function to create and initialize a scheduler instance for a user
 * @param {string} userPhone - The user's phone number
 * @returns {Promise<SchedulerService>} - Initialized scheduler instance
 */
async function createSchedulerForUser(userPhone) {
  const scheduler = new SchedulerService(userPhone);
  await scheduler.init();
  return scheduler;
}

// Map to track scheduler instances by user phone number
const schedulerInstances = new Map();

/**
 * Get or create a scheduler instance for a user
 * @param {string} userPhone - The user's phone number
 * @returns {Promise<SchedulerService>} - Scheduler instance
 */
async function getSchedulerForUser(userPhone) {
  // Check if we already have a scheduler for this user
  if (!schedulerInstances.has(userPhone)) {
    // Create a new scheduler
    const scheduler = await createSchedulerForUser(userPhone);
    schedulerInstances.set(userPhone, scheduler);
  }
  
  return schedulerInstances.get(userPhone);
}

module.exports = {
  getSchedulerForUser
};