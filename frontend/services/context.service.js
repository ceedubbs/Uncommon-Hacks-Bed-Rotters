// services/context.service.js - Context file management
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

// Context files storage
let contextData = {
  sideEffects: {},
  treatments: {},
  medications: {},
  emergencyGuidelines: {},
  nutritionGuidelines: {},
};

// Load context files
async function loadContextFiles() {
  try {
    logger.info('📚 Loading context files...');

    // Define the path to the context directory
    const contextDir = path.join(__dirname, '..', 'context');

    // Get list of all JSON files in the context directory
    const files = await fs.readdir(contextDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    // Load each JSON file based on naming pattern
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(contextDir, file);
        const fileContent = await fs.readFile(filePath, "utf8");
        const data = JSON.parse(fileContent);

        // Map file to appropriate context category
        if (file.includes("side_effects")) {
          contextData.sideEffects = data;
        } else if (file.includes("treatments")) {
          contextData.treatments = data;
        } else if (file.includes("medications")) {
          contextData.medications = data;
        } else if (file.includes("emergency")) {
          contextData.emergencyGuidelines = data;
        } else if (file.includes("nutrition")) {
          contextData.nutritionGuidelines = data;
        } else {
          // Store other files by their name without extension
          const contextKey = file.replace(".json", "");
          contextData[contextKey] = data;
        }

        logger.info(`  ✅ Loaded ${file}`);
      } catch (fileError) {
        logger.error(`  ❌ Error loading ${file}:`, fileError.message);
      }
    }

    // Check if any context was loaded
    const contextSize = Object.values(contextData).reduce(
      (sum, obj) => sum + Object.keys(obj).length,
      0
    );
    if (contextSize === 0) {
      logger.warn(
        "⚠️ No context data was loaded. Please ensure context files exist in the context directory."
      );
    } else {
      logger.info(
        `✅ Context files loaded successfully: ${contextSize} items across ${
          Object.keys(contextData).length
        } categories`
      );
    }
  } catch (error) {
    logger.error("❌ Error accessing context directory:", error.message);
    logger.warn(
      '⚠️ The bot will run without context data. Create a "context" directory with appropriate JSON files.'
    );
  }
}

// Build context enrichment for Gemini based on user query
function buildContextEnrichment(userMessage) {
  // Convert user message to lowercase for case-insensitive matching
  const lowerMessage = userMessage.toLowerCase();
  let relevantContext = [];

  // Check for side effects mentions
  for (const [effect, data] of Object.entries(contextData.sideEffects || {})) {
    if (lowerMessage.includes(effect.toLowerCase())) {
      relevantContext.push(
        `Information about ${effect}: ${JSON.stringify(data)}`
      );
    }
  }

  // Check for treatment mentions
  for (const [treatment, data] of Object.entries(
    contextData.treatments || {}
  )) {
    if (lowerMessage.includes(treatment.toLowerCase())) {
      relevantContext.push(
        `Information about ${treatment} treatment: ${JSON.stringify(data)}`
      );
    }
  }

  // Check for medication mentions
  for (const [medication, data] of Object.entries(
    contextData.medications || {}
  )) {
    if (lowerMessage.includes(medication.toLowerCase())) {
      relevantContext.push(
        `Information about ${medication}: ${JSON.stringify(data)}`
      );
    }
  }

  // Check for emergency keywords
  const emergencyKeywords = [
    "emergency",
    "urgent",
    "fever",
    "bleeding",
    "pain",
    "hospital",
  ];
  if (
    emergencyKeywords.some((keyword) => lowerMessage.includes(keyword)) &&
    Object.keys(contextData.emergencyGuidelines || {}).length > 0
  ) {
    relevantContext.push(
      `Emergency guidelines: ${JSON.stringify(contextData.emergencyGuidelines)}`
    );
  }

  // Check for nutrition keywords
  const nutritionKeywords = [
    "food",
    "eat",
    "diet",
    "nutrition",
    "meal",
    "appetite",
  ];
  if (
    nutritionKeywords.some((keyword) => lowerMessage.includes(keyword)) &&
    Object.keys(contextData.nutritionGuidelines || {}).length > 0
  ) {
    relevantContext.push(
      `Nutrition guidelines: ${JSON.stringify(contextData.nutritionGuidelines)}`
    );
  }

  // If no specific context was found but message mentions common chemotherapy terms
  const chemoKeywords = [
    "chemo",
    "treatment",
    "therapy",
    "side effect",
    "symptom",
  ];
  if (
    relevantContext.length === 0 &&
    chemoKeywords.some((keyword) => lowerMessage.includes(keyword)) &&
    Object.keys(contextData.sideEffects || {}).length > 0
  ) {
    // Only include a brief summary, not the full side effects context
    const sideEffectsList = Object.keys(contextData.sideEffects).join(", ");
    relevantContext.push(
      `Common chemotherapy side effects include: ${sideEffectsList}`
    );
  }

  return relevantContext.join("\n\n");
}

// Get current context data
function getContextData() {
  return contextData;
}

module.exports = {
  loadContextFiles,
  buildContextEnrichment,
  getContextData
};