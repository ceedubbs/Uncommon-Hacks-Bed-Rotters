// services/ai.service.js - AI interaction service
const { logger } = require('../utils/logger');
const { getChatSession } = require('./session.service');
const { buildContextEnrichment } = require('./context.service');

/**
 * Generate a response from the AI based on user message
 * @param {string} userMessage - The user's message
 * @param {string} userWhatsAppNumber - The user's WhatsApp number
 * @returns {Promise<string>} - The AI's response
 */
async function generateResponse(userMessage, userWhatsAppNumber) {
  try {
    // Get chat session for this user
    const chat = getChatSession(userWhatsAppNumber);
    
    // Build context enrichment
    const contextEnrichment = buildContextEnrichment(userMessage);
    let messageToSend = userMessage;
    
    // Add context if available
    if (contextEnrichment) {
      messageToSend = `User query: ${userMessage}\n\nRelevant information to consider in your response (do not repeat all of this verbatim):\n${contextEnrichment}`;
      logger.debug('Added context enrichment to message');
    }
    
    // Send user message with context enrichment and get response
    const result = await chat.sendMessage(messageToSend);
    const botResponse = result.response.text();
    
    logger.info('🤖 Generated AI response');
    
    // Format response for WhatsApp
    let formattedResponse = botResponse;
    if (formattedResponse.length > 1600) {
      formattedResponse = formattedResponse.substring(0, 1550) + 
        "... (Message truncated due to length. Please ask for more specific information.)";
      logger.debug('Response truncated due to length');
    }
    
    return formattedResponse;
  } catch (error) {
    logger.error('❌ Error generating AI response:', error);
    
    // Handle safety filter blocks
    if (error.message && error.message.includes("safety")) {
      return "I'm unable to respond to that query as it may involve sensitive healthcare information. Please contact your healthcare provider directly for specific medical advice.";
    }
    
    // Generic error message
    return "I'm sorry, I couldn't process that request.";
  }
}

module.exports = {
  generateResponse
};