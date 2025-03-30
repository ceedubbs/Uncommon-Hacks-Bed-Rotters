// utils/logger.js - Logging utility
const logger = {
    info: (message, ...args) => {
      console.log(`[INFO] ${message}`, ...args);
    },
    warn: (message, ...args) => {
      console.warn(`[WARNING] ⚠️ ${message}`, ...args);
    },
    error: (message, ...args) => {
      console.error(`[ERROR] ❌ ${message}`, ...args);
    },
    debug: (message, ...args) => {
      if (process.env.DEBUG === 'true') {
        console.log(`[DEBUG] 🔍 ${message}`, ...args);
      }
    }
  };
  
  module.exports = {
    logger
  };