const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { MessagingResponse } = require("twilio").twiml;
const bodyParser = require("body-parser");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

// Initialize Express app
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Chat history storage - using a simple in-memory store
const userSessionsMap = new Map();

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
    console.log("📚 Loading context files...");

    // Define the path to the context directory
    const contextDir = path.join(__dirname, "context");

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

        console.log(`  ✅ Loaded ${file}`);
      } catch (fileError) {
        console.error(`  ❌ Error loading ${file}:`, fileError.message);
      }
    }

    // Check if any context was loaded
    const contextSize = Object.values(contextData).reduce(
      (sum, obj) => sum + Object.keys(obj).length,
      0
    );
    if (contextSize === 0) {
      console.warn(
        "⚠️ No context data was loaded. Please ensure context files exist in the context directory."
      );
    } else {
      console.log(
        `✅ Context files loaded successfully: ${contextSize} items across ${
          Object.keys(contextData).length
        } categories`
      );
    }
  } catch (error) {
    console.error("❌ Error accessing context directory:", error.message);
    console.warn(
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

// Configure the model with safety settings appropriate for healthcare
const modelConfig = {
  model: "gemini-2.0-flash",
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
  ],
  generationConfig: {
    temperature: 0.3,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 1024,
  },
};

// Initialize system prompt for chemotherapy assistance
const SYSTEM_PROMPT = `You are a supportive healthcare companion specializing in chemotherapy information and support. 
Your role is to provide accurate, compassionate information about:
- Common chemotherapy side effects and management strategies
- General information about chemotherapy treatments and protocols
- Supportive care during treatment
- When patients should contact their healthcare provider immediately
- General wellness tips during treatment
Your role is also to be a supportive companion to the user, and to be a friend. So try to speak less like a chatbot and more like a human companion.

Important guidelines:
1. Never provide specific medical advice or diagnosis
2. Encourage patients to contact their healthcare provider for significant medical concerns
3. Be empathetic and supportive, acknowledging the challenges of cancer treatment
4. Provide evidence-based information only
5. If unsure about any information, acknowledge limitations
6. For any urgent medical concerns (severe pain, fever, bleeding, etc.), always advise immediate contact with healthcare providers

Remember that patients may be experiencing physical and emotional distress. Be kind, clear, and supportive in all interactions.

You will be provided with context information about chemotherapy treatments, medications, side effects, and guidelines based on user queries. Incorporate this information into your responses where relevant.`;

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

// Cleanup old sessions periodically (every hour)
setInterval(() => {
  const currentTime = Date.now();
  const TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  for (const [userNumber, session] of userSessionsMap.entries()) {
    if (currentTime - session.lastInteraction > TIMEOUT) {
      userSessionsMap.delete(userNumber);
      console.log(`Removed inactive session for ${userNumber}`);
    }
  }
}, 60 * 60 * 1000); // Check every hour

// WhatsApp webhook endpoint
app.post("/whatsapp", async (req, res) => {
  console.log("🔔 Incoming request from Twilio:");

  try {
    const userMessage = req.body.Body;
    const userWhatsAppNumber = req.body.From;

    if (!userMessage || !userWhatsAppNumber) {
      console.error("❌ Missing message or sender info:", req.body);
      const errorTwiml = new MessagingResponse();
      errorTwiml.message("I couldn't process your message. Please try again.");
      return res.type("text/xml").send(errorTwiml.toString());
    }

    console.log(`📥 Message from ${userWhatsAppNumber}: ${userMessage}`);

    // Check for reset command
    if (
      userMessage.toLowerCase() === "reset" ||
      userMessage.toLowerCase() === "restart"
    ) {
      userSessionsMap.delete(userWhatsAppNumber);
      const resetTwiml = new MessagingResponse();
      resetTwiml.message(
        "Your conversation has been reset. How can I help you with your chemotherapy care today?"
      );
      return res.type("text/xml").send(resetTwiml.toString());
    }

    // Check for admin commands to reload context
    if (
      userMessage.toLowerCase() === "admin:reload" &&
      process.env.ADMIN_NUMBER === userWhatsAppNumber
    ) {
      await loadContextFiles();
      const adminTwiml = new MessagingResponse();
      adminTwiml.message("Context files have been reloaded.");
      return res.type("text/xml").send(adminTwiml.toString());
    }

    // Get chat session for this user
    const chat = getChatSession(userWhatsAppNumber);

    // Build context enrichment
    const contextEnrichment = buildContextEnrichment(userMessage);
    let messageToSend = userMessage;

    // Add context if available
    if (contextEnrichment) {
      messageToSend = `User query: ${userMessage}\n\nRelevant information to consider in your response (do not repeat all of this verbatim):\n${contextEnrichment}`;
    }

    // Process with safety checks
    try {
      // Send user message with context enrichment and get response
      const result = await chat.sendMessage(messageToSend);
      const botResponse = result.response.text();

      console.log("🤖 Bot response:", botResponse);

      // Format response for WhatsApp
      let formattedResponse = botResponse;
      if (formattedResponse.length > 1600) {
        formattedResponse =
          formattedResponse.substring(0, 1550) +
          "... (Message truncated due to length. Please ask for more specific information.)";
      }

      // Send response
      const twiml = new MessagingResponse();
      twiml.message(formattedResponse);

      console.log("📤 Sending TwiML response");
      return res.type("text/xml").send(twiml.toString());
    } catch (error) {
      console.error("❌ Error from Gemini API:", error);

      // Handle safety filter blocks
      let errorMessage = "I'm sorry, I couldn't process that request.";
      if (error.message && error.message.includes("safety")) {
        errorMessage =
          "I'm unable to respond to that query as it may involve sensitive healthcare information. Please contact your healthcare provider directly for specific medical advice.";
      }

      const errorTwiml = new MessagingResponse();
      errorTwiml.message(errorMessage);
      return res.type("text/xml").send(errorTwiml.toString());
    }
  } catch (error) {
    console.error("❌ Server error:", error);
    const fallbackTwiml = new MessagingResponse();
    fallbackTwiml.message(
      "I'm sorry, something went wrong. Please try again later."
    );
    return res.type("text/xml").status(500).send(fallbackTwiml.toString());
  }
});

// Simple health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("Service is running");
});

// Admin endpoint to view context data
app.get("/admin/context", async (req, res) => {
  // In production, you would add authentication here
  if (req.query.key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.status(200).json({
    contextData,
    sessionCount: userSessionsMap.size,
  });
});

// Start the application
async function startApp() {
  // Load context files first
  await loadContextFiles();

  // Start server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Chemotherapy support chatbot running on port ${PORT}`);
    console.log(
      `Make sure to configure Twilio webhook URL: https://your-domain.com/whatsapp`
    );
  });
}

// Start the app
startApp();
