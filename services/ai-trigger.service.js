// services/ai-trigger.service.js - AI-driven proactive messaging decision engine
const { logger } = require('../utils/logger');
const { sendWhatsAppMessage } = require('./whatsapp.service');
const messageTemplates = require('../utils/message-templates');

/**
 * AI-driven Trigger Service
 * Makes intelligent decisions about when and why to proactively message users
 * using the AI model rather than hard-coded rules
 */
class AITriggerService {
  constructor(scheduler) {
    this.scheduler = scheduler;
  }

  /**
   * Use AI to determine if and when to send a proactive message
   */
  async evaluateProactiveAction() {
    try {
      // Load user data and context
      const userData = await this.scheduler.loadUserData();
      
      // Create a context object with all relevant information for the AI
      const context = await this.buildContextObject(userData);
      
      // Use the AI model to decide whether to send a message and what type
      const decision = await this.getAIDecision(context);
      
      // If the AI decided to send a message, process it
      if (decision.shouldContact) {
        await this.processAIDecision(decision, userData);
        logger.info(`🤖 AI decided to send a ${decision.messageType} message to ${this.scheduler.userPhone}`);
        return true;
      } else {
        logger.info(`🤖 AI decided not to contact ${this.scheduler.userPhone} at this time`);
        return false;
      }
    } catch (error) {
      logger.error(`❌ Error in AI trigger evaluation for ${this.scheduler.userPhone}:`, error);
      return false;
    }
  }

  /**
   * Build a comprehensive context object for the AI to make decisions
   * @param {Object} userData - User data
   * @returns {Object} - Context object for AI
   */
  async buildContextObject(userData) {
    try {
      // Load schedule data
      const schedule = await this.scheduler.loadSchedule();
      
      // Current time information
      const now = new Date();
      const currentHour = now.getHours();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Calculate time since last interaction
      const lastInteractionDate = userData.lastInteraction ? new Date(userData.lastInteraction) : null;
      const hoursSinceLastInteraction = lastInteractionDate 
        ? Math.round((now - lastInteractionDate) / (1000 * 60 * 60))
        : null;
      
      // Recent symptoms - focus on last 3 days
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const recentSymptoms = (userData.symptoms || [])
        .filter(symptom => new Date(symptom.reportedAt) >= threeDaysAgo)
        .sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
      
      // Check if severe symptoms were recently reported
      const hasSevereSymptoms = recentSymptoms.some(symptom => 
        symptom.severity === 'severe' && !symptom.followedUp
      );
      
      // Get upcoming treatment (if any)
      const upcomingTreatment = userData.treatmentSchedule?.nextTreatment 
        ? new Date(userData.treatmentSchedule.nextTreatment)
        : null;
      
      const hoursTillTreatment = upcomingTreatment 
        ? Math.round((upcomingTreatment - now) / (1000 * 60 * 60))
        : null;
      
      // Last wellness rating
      const lastWellnessRating = userData.lastWellnessRating || null;
      const lastWellnessDate = userData.lastWellnessDate 
        ? new Date(userData.lastWellnessDate)
        : null;
      
      const daysSinceWellnessCheck = lastWellnessDate
        ? Math.round((now - lastWellnessDate) / (1000 * 60 * 60 * 24))
        : null;
      
      // Check if we've already sent a message today
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const lastCheckIn = schedule.lastCheckIn ? new Date(schedule.lastCheckIn) : null;
      const sentMessageToday = lastCheckIn && 
        new Date(lastCheckIn.getFullYear(), lastCheckIn.getMonth(), lastCheckIn.getDate()).getTime() === today;
      
      // Build the context object
      return {
        // User information
        userId: this.scheduler.userPhone,
        userName: userData.name || null,
        diagnosis: userData.diagnosis || null,
        age: userData.age || null,
        gender: userData.gender || null,
        
        // Treatment info
        treatmentType: userData.treatmentType || null,
        treatmentFrequency: userData.treatmentFrequency || null,
        treatmentStartDate: userData.treatmentStartDate || null,
        
        // Temporal information
        currentHour,
        dayOfWeek,
        hoursSinceLastInteraction,
        sentMessageToday,
        daysSinceWellnessCheck,
        
        // Upcoming events
        upcomingTreatment: upcomingTreatment ? upcomingTreatment.toISOString() : null,
        hoursTillTreatment,
        
        // Health information
        recentSymptoms: recentSymptoms.slice(0, 5), // Most recent 5 symptoms
        hasSevereSymptoms,
        lastWellnessRating,
        
        // User preferences
        reminderPreference: schedule.preferences?.reminderEnabled || false,
        checkInFrequency: schedule.preferences?.checkInFrequency || 'daily',
      };
    } catch (error) {
      logger.error(`❌ Error building context for ${this.scheduler.userPhone}:`, error);
      return {
        userId: this.scheduler.userPhone,
        error: true
      };
    }
  }

  /**
   * Use the AI model to make a decision about proactive messaging
   * @param {Object} context - Context object
   * @returns {Object} - AI decision
   */
  async getAIDecision(context) {
    try {
      // In a real implementation, this would call the AI model
      // For now, we'll implement a simplified decision logic
      
      // This would be replaced with an actual AI model call:
      // const { generateAIDecision } = require('../services/ai.service');
      // return await generateAIDecision(context);
      
      // Simplified logic for demonstration:
      
      // 1. If there are severe symptoms that need follow-up, prioritize that
      if (context.hasSevereSymptoms) {
        return {
          shouldContact: true,
          messageType: 'symptom_followup',
          urgency: 'high',
          reasoning: 'User reported severe symptoms that require follow-up'
        };
      }
      
      // 2. If treatment is coming up soon (within 24 hours), send a reminder
      if (context.hoursTillTreatment !== null && 
          context.hoursTillTreatment <= 24 && 
          context.hoursTillTreatment > 0) {
        return {
          shouldContact: true,
          messageType: 'treatment_reminder',
          urgency: 'medium',
          reasoning: 'User has treatment scheduled within 24 hours'
        };
      }
      
      // 3. If it's been more than 3 days since last interaction, check in
      if (context.hoursSinceLastInteraction !== null && 
          context.hoursSinceLastInteraction > 72) {
        return {
          shouldContact: true,
          messageType: 'inactivity_check',
          urgency: 'medium',
          reasoning: 'User has been inactive for more than 3 days'
        };
      }
      
      // 4. If last wellness rating was low (3 or below) and we haven't checked in today
      if (context.lastWellnessRating !== null && 
          context.lastWellnessRating <= 3 && 
          !context.sentMessageToday) {
        return {
          shouldContact: true,
          messageType: 'wellness_followup',
          urgency: 'medium',
          reasoning: 'User reported low wellness rating'
        };
      }
      
      // 5. For users who prefer daily check-ins, send one if we haven't already today
      if (context.reminderPreference && 
          context.checkInFrequency === 'daily' && 
          !context.sentMessageToday && 
          context.currentHour >= 9 && // Only send after 9 AM
          context.currentHour <= 20) { // Don't send after 8 PM
        return {
          shouldContact: true,
          messageType: 'daily_checkin',
          urgency: 'low',
          reasoning: 'Regular daily check-in'
        };
      }
      
      // 6. For users who prefer weekly check-ins
      if (context.reminderPreference && 
          context.checkInFrequency === 'weekly' && 
          (context.daysSinceWellnessCheck === null || context.daysSinceWellnessCheck >= 7) &&
          context.currentHour >= 9 && 
          context.currentHour <= 20) {
        return {
          shouldContact: true,
          messageType: 'weekly_wellness',
          urgency: 'low',
          reasoning: 'Regular weekly wellness check'
        };
      }
      
      // Default: don't send a message
      return {
        shouldContact: false,
        reasoning: 'No trigger conditions met'
      };
    } catch (error) {
      logger.error(`❌ Error getting AI decision for ${this.scheduler.userPhone}:`, error);
      return {
        shouldContact: false,
        error: true,
        reasoning: 'Error in AI decision process'
      };
    }
  }

  /**
   * Process the AI's decision by sending the appropriate message
   * @param {Object} decision - AI decision
   * @param {Object} userData - User data
   */
  async processAIDecision(decision, userData) {
    try {
      // Determine which message to send based on message type
      let message;
      
      switch (decision.messageType) {
        case 'symptom_followup':
          // Get the severe symptoms that need follow-up
          const severeSymptoms = (userData.symptoms || [])
            .filter(symptom => symptom.severity === 'severe' && !symptom.followedUp);
          
          message = messageTemplates.symptomFollowUp(userData, severeSymptoms);
          
          // Mark these symptoms as followed up
          await this.markSymptomsAsFollowedUp(severeSymptoms);
          break;
          
        case 'treatment_reminder':
          const treatmentDate = new Date(userData.treatmentSchedule.nextTreatment);
          message = messageTemplates.treatmentReminder(userData, treatmentDate);
          
          // Mark the reminder as sent
          if (userData.treatmentSchedule) {
            userData.treatmentSchedule.reminderSent = true;
            await this.scheduler.updateUserData(userData);
          }
          break;
          
        case 'inactivity_check':
          message = messageTemplates.inactivityCheck(userData);
          break;
          
        case 'wellness_followup':
          message = messageTemplates.weeklyWellnessCheck(userData);
          break;
          
        case 'daily_checkin':
          const recentSymptoms = (userData.symptoms || []).slice(-3);
          message = messageTemplates.dailyCheckIn(userData, recentSymptoms);
          break;
          
        case 'weekly_wellness':
          message = messageTemplates.weeklyWellnessCheck(userData);
          
          // Update the last weekly check timestamp
          const schedule = await this.scheduler.loadSchedule();
          schedule.lastWeeklyCheck = new Date().toISOString();
          await this.scheduler.saveSchedule(schedule);
          break;
          
        default:
          // If no specific type or unknown type, use daily check-in
          message = messageTemplates.dailyCheckIn(userData);
      }
      
      // Send the message
      await sendWhatsAppMessage(this.scheduler.userPhone, message);
      
      // Record the check-in
      await this.scheduler.recordCheckIn(decision.messageType);
      
      logger.info(`📱 Sent AI-triggered ${decision.messageType} message to ${this.scheduler.userPhone}`);
      return true;
    } catch (error) {
      logger.error(`❌ Error processing AI decision for ${this.scheduler.userPhone}:`, error);
      return false;
    }
  }

  /**
   * Mark symptoms as followed up
   * @param {Array} symptoms - Symptoms to mark
   */
  async markSymptomsAsFollowedUp(symptoms) {
    try {
      if (!symptoms || symptoms.length === 0) {
        return;
      }
      
      const userData = await this.scheduler.loadUserData();
      
      if (userData.symptoms && userData.symptoms.length > 0) {
        // Map each symptom in userData to mark those that match the provided symptoms
        userData.symptoms = userData.symptoms.map(userSymptom => {
          // Check if this symptom is in the list to be marked
          const matchingSymptom = symptoms.find(s => 
            s.name === userSymptom.name && 
            s.reportedAt === userSymptom.reportedAt
          );
          
          if (matchingSymptom) {
            return {
              ...userSymptom,
              followedUp: true,
              followUpDate: new Date().toISOString()
            };
          }
          
          return userSymptom;
        });
        
        // Save the updated user data
        await this.scheduler.updateUserData(userData);
      }
    } catch (error) {
      logger.error(`❌ Error marking symptoms as followed up for ${this.scheduler.userPhone}:`, error);
    }
  }

  /**
   * Record a new symptom and potentially trigger a follow-up
   * @param {Object} symptomData - The symptom data
   */
  async recordSymptom(symptomData) {
    try {
      // Add the symptom to user data
      await this.scheduler.addSymptom(symptomData);
      
      // Immediately evaluate if we should follow up
      if (symptomData.severity === 'severe') {
        // Force an evaluation to consider an immediate follow-up
        setTimeout(() => this.evaluateProactiveAction(), 5000);
      }
      
      return true;
    } catch (error) {
      logger.error(`❌ Error recording symptom for ${this.scheduler.userPhone}:`, error);
      return false;
    }
  }

  /**
   * Add a treatment schedule
   * @param {Date} treatmentDate - Date of the treatment
   */
  async addTreatmentSchedule(treatmentDate) {
    try {
      const userData = await this.scheduler.loadUserData();
      
      // Add or update treatment schedule
      userData.treatmentSchedule = {
        nextTreatment: treatmentDate.toISOString(),
        reminderSent: false
      };
      
      // Save updated user data
      await this.scheduler.updateUserData(userData);
      
      logger.info(`📅 Added treatment schedule for ${this.scheduler.userPhone}`);
      return true;
    } catch (error) {
      logger.error(`❌ Error adding treatment schedule for ${this.scheduler.userPhone}:`, error);
      return false;
    }
  }
}

/**
 * Create an AI trigger service for a scheduler
 * @param {Object} scheduler - The user's scheduler instance
 * @returns {AITriggerService} - The AI trigger service
 */
function createAITriggerService(scheduler) {
  return new AITriggerService(scheduler);
}

module.exports = {
  createAITriggerService
};