// controllers/whatsapp.controller.js - WhatsApp message handling
const { MessagingResponse } = require('twilio').twiml;
const { logger } = require('../utils/logger');
const { generateResponse } = require('../services/ai.service');
const { resetUserSession } = require('../services/session.service');
const { loadContextFiles } = require('../services/context.service');

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
    
    // Check for reset command
    if (userMessage.toLowerCase() === "reset" || userMessage.toLowerCase() === "restart") {
      resetUserSession(userWhatsAppNumber);
      const resetTwiml = new MessagingResponse();
      resetTwiml.message("Your conversation has been reset. How can I help you with your chemotherapy care today?");
      return res.type("text/xml").send(resetTwiml.toString());
    }
    
    // Check for admin commands to reload context
    if (userMessage.toLowerCase() === "admin:reload" && process.env.ADMIN_NUMBER === userWhatsAppNumber) {
      await loadContextFiles();
      const adminTwiml = new MessagingResponse();
      adminTwiml.message("Context files have been reloaded.");
      return res.type("text/xml").send(adminTwiml.toString());
    }

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

module.exports = {
  handleWhatsAppMessage
};