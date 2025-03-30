// test/mocks/whatsapp.service.js - Mock WhatsApp service for testing
const { logger } = require('../../utils/logger');

/**
 * Mock implementation of the WhatsApp service for testing
 * This prevents actual messages being sent during tests
 */

/**
 * Send a mock WhatsApp message (logs instead of actually sending)
 * @param {string} toNumber - The recipient's WhatsApp number
 * @param {string} messageBody - The message body
 * @returns {Promise<Object>} - Mock message object
 */
async function sendWhatsAppMessage(toNumber, messageBody) {
  // Log the message instead of sending
  console.log('\n===== MOCK WHATSAPP MESSAGE =====');
  console.log(`TO: ${toNumber}`);
  console.log(`MESSAGE: ${messageBody}`);
  console.log('=================================\n');
  
  // Return a mock message object similar to what Twilio would return
  return {
    sid: 'MOCK_MSG_' + Date.now(),
    to: toNumber,
    body: messageBody,
    status: 'delivered',
    dateCreated: new Date().toISOString()
  };
}

module.exports = {
  sendWhatsAppMessage
};