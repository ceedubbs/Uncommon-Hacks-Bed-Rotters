// utils/logger.js - Logging utility
const logger = {
    info: (message, ...args) => {
      console.log(message, ...args);
    },
    warn: (message, ...args) => {
      console.warn(`⚠️ ${message}`, ...args);
    },
    error: (message, ...args) => {
      console.error(`❌ ${message}`, ...args);
    },
    debug: (message, ...args) => {
      if (process.env.DEBUG === 'true') {
        console.log(`🔍 ${message}`, ...args);
      }
    }
  };
  
  module.exports = {
    logger
  };