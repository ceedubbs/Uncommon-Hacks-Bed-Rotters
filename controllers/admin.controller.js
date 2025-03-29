// controllers/admin.controller.js - Admin endpoints
const { logger } = require('../utils/logger');
const { getContextData } = require('../services/context.service');
const { getSessionCount } = require('../services/session.service');

/**
 * View context data and session information
 */
function viewContextData(req, res) {
  // Check for API key authentication
  if (req.query.key !== process.env.ADMIN_API_KEY) {
    logger.warn('Unauthorized access attempt to admin endpoint');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  logger.info('Admin context data request');
  
  // Return context data and session count
  res.status(200).json({
    contextData: getContextData(),
    sessionCount: getSessionCount()
  });
}

module.exports = {
  viewContextData
};