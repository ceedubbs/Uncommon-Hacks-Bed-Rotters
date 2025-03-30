// services/session.service.js - User session management
const { genAI, modelConfig, SYSTEM_PROMPT } = require('../config/ai.config');
const { logger } = require('../utils/logger');
<<<<<<< HEAD
const { MongoClient } = require("mongodb");

=======
>>>>>>> origin/sara

// Chat history storage - using a simple in-memory store
const userSessionsMap = new Map();

<<<<<<< HEAD


async function analyzeSymptomsWithGemini(message) {
  const prompt = `You are an AI trained to analyze patient conversations and extract relevant medical symptoms. Please read the following text and identify any symptoms that might be mentioned. If you find any, return them as a list of symptoms.\n\nMessage: "${message}"\n\nPlease return the symptoms as a list of strings.`;

  try {
      const response = await GeminiAPI.analyzeTextForSymptoms(prompt);
      
      if (response && response.symptoms) {
          return response.symptoms; // return detected symptoms
      }
      
      return []; // return empty array if no symptoms detected
  } catch (err) {
      console.error("Error analyzing with Gemini:", err);
      return [];
  }
}
=======
>>>>>>> origin/sara
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

<<<<<<< HEAD


async function getChatHistory(phone) {
    const url = process.env.DATABASE_URL; // Ensure your environment variable is set correctly
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        // Connect to MongoDB
        await client.connect();
        const db = client.db("chemo_users_db");
        const collection = db.collection("users");

        // Find the user by phone number
        const user = await collection.findOne({ phone: phone });

        if (!user) {
            return {
                success: false,
                message: "User not found with this phone number."
            };
        }

        // Return the user's chat history
        return {
            success: true,
            chat_history: user.chat_history,
            symptoms: user.symptoms,
          
        };
    } catch (err) {
        console.error("An error occurred:", err);
        return {
            success: false,
            message: "An error occurred while retrieving the chat history."
        };
    } finally {
        // Close the connection
        await client.close();
    }
}



async function appendChatHistory(phone, message) {
    const url = process.env.DATABASE_URL; // Ensure your environment variable is set correctly
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        // Connect to MongoDB
        await client.connect();
        const db = client.db("chemo_users_db");
        const collection = db.collection("users");

        // Find the user by phone number
        const user = await collection.findOne({ phone: phone });

        if (!user) {
            return {
                success: false,
                message: "User not found with this phone number."
            };
        }

        const newChat = {
          timestamp: new Date().toISOString(),  // Adds a timestamp
          message: message              // The actual chat message
      };

      // Append new chat to the chat_history
      user.chat_history.push(newChat);

        // Update the user's chat_history in the database
        const result = await collection.updateOne(
            { phone: phone },
            { $set: { chat_history: user.chat_history } }
        );

        if (result.modifiedCount === 1) {
            return {
                success: true,
                message: "Chat history updated successfully!"
            };
        } else {
            return {
                success: false,
                message: "Failed to update chat history."
            };
        }
    } catch (err) {
        console.error("An error occurred:", err);
        return {
            success: false,
            message: "An error occurred while updating the chat history."
        };
    } finally {
        // Close the connection
        await client.close();
    }
}



=======
>>>>>>> origin/sara
module.exports = {
  getChatSession,
  resetUserSession,
  getSessionCount,
<<<<<<< HEAD
  setupSessionCleanup,
  getChatHistory,
  appendChatHistory
};

=======
  setupSessionCleanup
};
>>>>>>> origin/sara
