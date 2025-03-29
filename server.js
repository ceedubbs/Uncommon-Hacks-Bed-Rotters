const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { MessagingResponse } = require('twilio').twiml;
const bodyParser = require('body-parser');
require('dotenv').config();

// Initialize Express app
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Chat history storage - using a simple in-memory store (consider a database for production)
const userSessionsMap = new Map();

// Configure the model with safety settings appropriate for healthcare
const modelConfig = {
  model: 'gemini-2.0-flash',
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
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
const SYSTEM_PROMPT = `You are a supportive healthcare chatbot specializing in chemotherapy information and support. 
Your role is to provide accurate, compassionate information about:
- Common chemotherapy side effects and management strategies
- General information about chemotherapy treatments and protocols
- Supportive care during treatment
- When patients should contact their healthcare provider immediately
- General wellness tips during treatment

Important guidelines:
1. Always clarify you are an AI assistant, not a medical professional
2. Never provide specific medical advice, diagnosis, or treatment recommendations
3. Encourage patients to contact their healthcare provider for medical concerns
4. Be empathetic and supportive, acknowledging the challenges of cancer treatment
5. Provide evidence-based information only
6. If unsure about any information, acknowledge limitations
7. For any urgent medical concerns (severe pain, fever, bleeding, etc.), always advise immediate contact with healthcare providers

Remember that patients may be experiencing physical and emotional distress. Be kind, clear, and supportive in all interactions.`;

// Helper function to get or create a chat session
const getChatSession = (userWhatsAppNumber) => {
  if (!userSessionsMap.has(userWhatsAppNumber)) {
    const model = genAI.getGenerativeModel(modelConfig);
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: 'Please follow these instructions for our conversation: ' + SYSTEM_PROMPT }],
        },
        {
          role: 'model',
          parts: [{ text: 'I understand and will follow these guidelines as a supportive healthcare chatbot specializing in chemotherapy information.' }],
        }
      ],
    });
    
    userSessionsMap.set(userWhatsAppNumber, {
      chat,
      lastInteraction: Date.now()
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
app.post('/whatsapp', async (req, res) => {
  console.log('🔔 Incoming request from Twilio:');
  
  try {
    const userMessage = req.body.Body;
    const userWhatsAppNumber = req.body.From;

    if (!userMessage || !userWhatsAppNumber) {
      console.error('❌ Missing message or sender info:', req.body);
      const errorTwiml = new MessagingResponse();
      errorTwiml.message("I couldn't process your message. Please try again.");
      return res.type('text/xml').send(errorTwiml.toString());
    }

    console.log(`📥 Message from ${userWhatsAppNumber}: ${userMessage}`);
    
    // Check for reset command
    if (userMessage.toLowerCase() === 'reset' || userMessage.toLowerCase() === 'restart') {
      userSessionsMap.delete(userWhatsAppNumber);
      const resetTwiml = new MessagingResponse();
      resetTwiml.message("Your conversation has been reset. How can I help you with your chemotherapy care today?");
      return res.type('text/xml').send(resetTwiml.toString());
    }

    // Get chat session for this user
    const chat = getChatSession(userWhatsAppNumber);
    
    // Process with safety checks
    try {
      // Send user message and get response
      const result = await chat.sendMessage(userMessage);
      const botResponse = result.response.text();
      
      console.log('🤖 Bot response:', botResponse);
      
      // Format response for WhatsApp
      let formattedResponse = botResponse;
      if (formattedResponse.length > 1600) {
        formattedResponse = formattedResponse.substring(0, 1550) + "... (Message truncated due to length. Please ask for more specific information.)";
      }

      // Send response
      const twiml = new MessagingResponse();
      twiml.message(formattedResponse);
      
      console.log('📤 Sending TwiML response');
      return res.type('text/xml').send(twiml.toString());
      
    } catch (error) {
      console.error('❌ Error from Gemini API:', error);
      
      // Handle safety filter blocks
      let errorMessage = "I'm sorry, I couldn't process that request.";
      if (error.message && error.message.includes('safety')) {
        errorMessage = "I'm unable to respond to that query as it may involve sensitive healthcare information. Please contact your healthcare provider directly for specific medical advice.";
      }
      
      const errorTwiml = new MessagingResponse();
      errorTwiml.message(errorMessage);
      return res.type('text/xml').send(errorTwiml.toString());
    }
    
  } catch (error) {
    console.error('❌ Server error:', error);
    const fallbackTwiml = new MessagingResponse();
    fallbackTwiml.message("I'm sorry, something went wrong. Please try again later.");
    return res.type('text/xml').status(500).send(fallbackTwiml.toString());
  }
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Service is running');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Chemotherapy support chatbot running on port ${PORT}`);
  console.log(`Make sure to configure Twilio webhook URL: https://your-domain.com/whatsapp`);
});