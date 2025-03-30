// services/whatsapp.service.js - WhatsApp messaging service
const twilio = require('twilio');
const { logger } = require('../utils/logger');

// Initialize Twilio client
let twilioClient;
try {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  logger.info('✅ Twilio client initialized');
} catch (error) {
  logger.error('❌ Failed to initialize Twilio client:', error);
}

/**
 * Send a WhatsApp message to a user
 * @param {string} toNumber - The recipient's WhatsApp number
 * @param {string} messageBody - The message body
 * @returns {Promise<Object>} - Twilio message object
 */
async function sendWhatsAppMessage(toNumber, messageBody) {
  try {
    // Ensure the number is in proper WhatsApp format
    let formattedNumber = toNumber;
    if (!toNumber.startsWith('whatsapp:')) {
      formattedNumber = `whatsapp:${toNumber}`;
    }
    
    // Send the message via Twilio
    const message = await twilioClient.messages.create({
      body: messageBody,
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: formattedNumber
    });
    
    logger.info(`📤 Sent WhatsApp message to ${toNumber}: ${message.sid}`);
    return message;
  } catch (error) {
    logger.error(`❌ Error sending WhatsApp message to ${toNumber}:`, error);
    throw error;
  }
}

module.exports = {
  sendWhatsAppMessage
};