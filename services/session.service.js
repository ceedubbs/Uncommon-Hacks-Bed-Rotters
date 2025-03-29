// services/session.service.js - User session management
const { genAI, modelConfig, SYSTEM_PROMPT } = require('../config/ai.config');
const { logger } = require('../utils/logger');

// Chat history storage - using a simple in-memory store
const userSessionsMap = new Map();

// Helper function to get or create a chat session
const getChatSession = (userWhatsAppNumber) => {
  if (!userSessionsMap.has(userWhatsAppNumber)) {
    const model = genAI.getGenerativeModel(modelConfig);
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text:
                "Please follow these instructions for our conversation: " +
                SYSTEM_PROMPT,
            },
          ],
        },
        {
          role: "model",
          parts: [
            {
              text: "I understand and will follow these guidelines as a supportive healthcare chatbot specializing in chemotherapy information.",
            },
          ],
        },
      ],
    });

    userSessionsMap.set(userWhatsAppNumber, {
      chat,
      lastInteraction: Date.now(),
    });
  }

  // Update last interaction time
  const session = userSessionsMap.get(userWhatsAppNumber);
  session.lastInteraction = Date.now();
  return session.chat;
};

// Reset a user's chat session
const resetUserSession = (userWhatsAppNumber) => {
  userSessionsMap.delete(userWhatsAppNumber);
  return true;
};

// Get session count
const getSessionCount = () => {
  return userSessionsMap.size;
};

// Setup session cleanup interval
const setupSessionCleanup = () => {
  // Cleanup old sessions periodically (every hour)
  setInterval(() => {
    const currentTime = Date.now();
    const TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    let cleanedCount = 0;
    for (const [userNumber, session] of userSessionsMap.entries()) {
      if (currentTime - session.lastInteraction > TIMEOUT) {
        userSessionsMap.delete(userNumber);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} inactive sessions`);
    }
  }, 60 * 60 * 1000); // Check every hour
};

module.exports = {
  getChatSession,
  resetUserSession,
  getSessionCount,
  setupSessionCleanup
};