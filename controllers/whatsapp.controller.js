// controllers/whatsapp.controller.js - WhatsApp message handling with self-contained agents
const { MessagingResponse } = require('twilio').twiml;
const { logger } = require('../utils/logger');
const { generateResponse } = require('../services/ai.service');
const { resetUserSession } = require('../services/session.service');
const { loadContextFiles } = require('../services/context.service');
const { getSchedulerForUser } = require('../services/scheduler.service');
const { sendWhatsAppMessage } = require('../services/whatsapp.service');

// Map to track active user sessions
const activeUsers = new Map();

/**
 * Analyze message for symptom information and user details
 * @param {string} userMessage - The user's message
 * @param {string} userPhone - User's phone number
 * @param {Object} scheduler - User's scheduler instance
 */
async function analyzeUserMessage(userMessage, userPhone, scheduler) {
  try {
    // Check for name information
    const nameMatch = userMessage.match(/my name is ([A-Za-z]+)/i) || 
                      userMessage.match(/i am ([A-Za-z]+)/i) ||
                      userMessage.match(/call me ([A-Za-z]+)/i);
    
    if (nameMatch && nameMatch[1]) {
      await scheduler.updateUserData({ name: nameMatch[1] });
      logger.info(`📝 Updated name for ${userPhone} to ${nameMatch[1]}`);
    }
    
    // Check for diagnosis information
    const diagnosisMatch = userMessage.match(/diagnosed with ([^\.]+)/i) ||
                          userMessage.match(/I have ([^\.]+) cancer/i) ||
                          userMessage.match(/treating ([^\.]+)/i);
    
    if (diagnosisMatch && diagnosisMatch[1]) {
      await scheduler.updateUserData({ diagnosis: diagnosisMatch[1].trim() });
      logger.info(`📝 Updated diagnosis for ${userPhone} to ${diagnosisMatch[1].trim()}`);
    }
    
    // Check for symptom mentions
    const commonSymptoms = [
      'nausea', 'vomiting', 'diarrhea', 'constipation', 'fatigue', 
      'tired', 'pain', 'ache', 'headache', 'fever', 'chills', 'numbness',
      'tingling', 'rash', 'sore', 'mouth sores'
    ];
    
    const lowerMessage = userMessage.toLowerCase();
    
    for (const symptom of commonSymptoms) {
      if (lowerMessage.includes(symptom)) {
        // Extract severity if mentioned
        let severity = "not specified";
        if (lowerMessage.includes(`severe ${symptom}`) || lowerMessage.includes(`bad ${symptom}`)) {
          severity = "severe";
        } else if (lowerMessage.includes(`mild ${symptom}`) || lowerMessage.includes(`slight ${symptom}`)) {
          severity = "mild";
        } else if (lowerMessage.includes(`moderate ${symptom}`)) {
          severity = "moderate";
        }
        
        // Store the symptom
        await scheduler.addSymptom({
          name: symptom,
          severity
        });
        
        // If severe symptom, schedule follow-up
        if (severity === "severe") {
          await scheduler.scheduleFollowUp("symptom_followup", 3); // Follow up in 3 hours
        }
      }
    }
  } catch (error) {
    logger.error(`❌ Error analyzing message for ${userPhone}:`, error);
  }
}

/**
 * Handle incoming WhatsApp messages
 */
async function handleWhatsAppMessage(req, res) {
  logger.info('🔔 Incoming request from Twilio');
  
  try {
    const userMessage = req.body.Body;
    const userWhatsAppNumber = req.body.From;

    if (!userMessage || !userWhatsAppNumber) {
      logger.error('❌ Missing message or sender info:', req.body);
      const errorTwiml = new MessagingResponse();
      errorTwiml.message("I couldn't process your message. Please try again.");
      return res.type("text/xml").send(errorTwiml.toString());
    }

    logger.info(`📥 Message from ${userWhatsAppNumber}: ${userMessage}`);
    
    // Get or create scheduler for this user
    const scheduler = await getSchedulerForUser(userWhatsAppNumber);
    
    // Track active users
    activeUsers.set(userWhatsAppNumber, new Date());
    
    // Check for reset command
    if (userMessage.toLowerCase() === "reset" || userMessage.toLowerCase() === "restart") {
      resetUserSession(userWhatsAppNumber);
      const resetTwiml = new MessagingResponse();
      resetTwiml.message("Your conversation has been reset. How can I help you with your chemotherapy care today?");
      return res.type("text/xml").send(resetTwiml.toString());
    }
    
    // Check for scheduler commands
    if (userMessage.toLowerCase().includes("reminders on") || userMessage.toLowerCase().includes("turn on reminders")) {
      await scheduler.setupSchedule({ reminderEnabled: true });
      const reminderTwiml = new MessagingResponse();
      reminderTwiml.message("I've turned on your check-in reminders. I'll check in with you regularly to see how you're doing.");
      return res.type("text/xml").send(reminderTwiml.toString());
    }
    
    if (userMessage.toLowerCase().includes("reminders off") || userMessage.toLowerCase().includes("turn off reminders")) {
      await scheduler.setupSchedule({ reminderEnabled: false });
      const reminderTwiml = new MessagingResponse();
      reminderTwiml.message("I've turned off your check-in reminders. You won't receive scheduled check-ins, but you can still message me anytime for support.");
      return res.type("text/xml").send(reminderTwiml.toString());
    }
    
    // Check for admin commands to reload context
    if (userMessage.toLowerCase() === "admin:reload" && process.env.ADMIN_NUMBER === userWhatsAppNumber) {
      await loadContextFiles();
      const adminTwiml = new MessagingResponse();
      adminTwiml.message("Context files have been reloaded.");
      return res.type("text/xml").send(adminTwiml.toString());
    }

    // Analyze the message for user information and symptoms
    await analyzeUserMessage(userMessage, userWhatsAppNumber, scheduler);

    // Generate response
    const botResponse = await generateResponse(userMessage, userWhatsAppNumber);
    
    // Send response
    const twiml = new MessagingResponse();
    twiml.message(botResponse);
    
    logger.info('📤 Sending TwiML response');
    return res.type("text/xml").send(twiml.toString());
    
  } catch (error) {
    logger.error('❌ Server error:', error);
    const fallbackTwiml = new MessagingResponse();
    fallbackTwiml.message("I'm sorry, something went wrong. Please try again later.");
    return res.type("text/xml").status(500).send(fallbackTwiml.toString());
  }
}

/**
 * Cleanup inactive user sessions
 * Run this periodically (e.g., once per day)
 */
function cleanupInactiveUsers() {
  const now = new Date();
  const INACTIVE_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  
  for (const [userPhone, lastActive] of activeUsers.entries()) {
    if (now - lastActive > INACTIVE_THRESHOLD) {
      // User has been inactive for more than the threshold
      activeUsers.delete(userPhone);
      logger.info(`🧹 Removed inactive user ${userPhone} from memory`);
    }
  }
}

// Set up periodic cleanup
setInterval(cleanupInactiveUsers, 24 * 60 * 60 * 1000); // Run once per day

module.exports = {
  handleWhatsAppMessage
};