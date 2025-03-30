// test/ai-trigger.test.js
const fs = require('fs').promises;
const path = require('path');

// Mock the logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn((...args) => console.log('[INFO]', ...args)),
    error: jest.fn((...args) => console.log('[ERROR]', ...args)),
    warn: jest.fn((...args) => console.log('[WARN]', ...args)),
    debug: jest.fn((...args) => console.log('[DEBUG]', ...args))
  }
}));

// Mock the WhatsApp service
jest.mock('../services/whatsapp.service', () => ({
  sendWhatsAppMessage: jest.fn((to, message) => {
    console.log('\n===== MOCK MESSAGE SENT =====');
    console.log(`TO: ${to}`);
    console.log(`MESSAGE: ${message}`);
    console.log('=============================\n');
    return Promise.resolve({ sid: 'MOCK_SID_' + Date.now() });
  })
}));

// Simple mock scheduler for testing
class MockScheduler {
  constructor(userPhone) {
    this.userPhone = userPhone;
    this.userData = {
      phoneNumber: userPhone,
      name: "Test User",
      diagnosis: "Breast Cancer Stage 2",
      age: 45,
      treatmentType: "AC-T Chemotherapy",
      lastInteraction: new Date().toISOString(),
      symptoms: [
        {
          name: "nausea",
          severity: "moderate",
          reportedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          followedUp: false
        },
        {
          name: "fatigue",
          severity: "severe",
          reportedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          followedUp: false
        }
      ],
      treatmentSchedule: {
        nextTreatment: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        reminderSent: false
      }
    };
    
    this.schedule = {
      preferences: {
        checkInFrequency: "daily",
        checkInTime: "09:00",
        reminderEnabled: true
      },
      lastCheckIn: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      upcomingCheckIns: []
    };
  }
  
  async loadUserData() {
    return this.userData;
  }
  
  async loadSchedule() {
    return this.schedule;
  }
  
  async updateUserData(data) {
    this.userData = { ...this.userData, ...data };
    return this.userData;
  }
  
  async saveSchedule(data) {
    if (data) {
      this.schedule = data;
    }
    return this.schedule;
  }
  
  async addSymptom(symptom) {
    this.userData.symptoms = this.userData.symptoms || [];
    this.userData.symptoms.push(symptom);
    return true;
  }
  
  async recordCheckIn(checkInType) {
    console.log(`Recording check-in of type ${checkInType}`);
    this.schedule.lastCheckIn = new Date().toISOString();
    return true;
  }
}

// Define function to load message templates module
function loadMessageTemplates() {
  return {
    dailyCheckIn: (userData, recentSymptoms = []) => {
      const userName = userData.name || "there";
      const uniqueSymptoms = Array.isArray(recentSymptoms) 
        ? [...new Set(recentSymptoms.map(s => s.name))]
        : [];
      
      if (uniqueSymptoms.length > 0) {
        return `Hi ${userName}, checking in for the day. How are you feeling? Have your ${uniqueSymptoms.join(', ')} improved since yesterday?`;
      } else {
        return `Good morning ${userName}. How are you feeling today? Any side effects from your treatment I should know about?`;
      }
    },
    
    symptomFollowUp: (userData, symptoms = []) => {
      const userName = userData.name || "there";
      const symptomNames = Array.isArray(symptoms) 
        ? [...new Set(symptoms.map(s => s.name))]
        : [];
      
      if (symptomNames.length === 0) {
        return `Hi ${userName}, I wanted to follow up on how you're feeling today. Have your symptoms improved?`;
      } else if (symptomNames.length === 1) {
        return `Hi ${userName}, I wanted to follow up about your ${symptomNames[0]} that you mentioned earlier. How are you feeling now? Has there been any improvement?`;
      } else {
        return `Hi ${userName}, I wanted to follow up about the ${symptomNames.join(', ')} that you mentioned earlier. Have any of these symptoms improved?`;
      }
    },
    
    treatmentReminder: (userData, treatmentDate) => {
      const userName = userData.name || "there";
      const formattedDate = treatmentDate.toLocaleString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      });
      
      return `Hi ${userName}, just a reminder that you have your next treatment scheduled for ${formattedDate}. Remember to stay hydrated before your appointment and to bring any questions you have for your care team.`;
    },
    
    inactivityCheck: (userData) => {
      const userName = userData.name || "there";
      return `Hi ${userName}, I noticed we haven't spoken in a few days. Just checking in to see how you're doing. How has your treatment been going?`;
    },
    
    weeklyWellnessCheck: (userData) => {
      const userName = userData.name || "there";
      return `Hi ${userName}, it's time for your weekly wellness check-in. How would you rate your overall well-being this week on a scale of 1-10? Any particular challenges or victories you'd like to share?`;
    }
  };
}

// Mock the message templates module
jest.mock('../utils/message-templates', () => {
  return loadMessageTemplates();
});

// Run the test
describe('AI Trigger Service', () => {
  test('AI decision making with various contexts', async () => {
    try {
      // Create the mock scheduler
      const mockScheduler = new MockScheduler('whatsapp:+1234567890');
      
      // Import the AI trigger service
      const { createAITriggerService } = require('../services/ai-trigger.service');
      
      // Create the AI trigger service with our mock scheduler
      const triggerService = createAITriggerService(mockScheduler);
      
      console.log("Building context object...");
      const context = await triggerService.buildContextObject(mockScheduler.userData);
      console.log("Context built:", JSON.stringify(context, null, 2));
      
      console.log("\nGetting AI decision...");
      const decision = await triggerService.getAIDecision(context);
      console.log("AI Decision:", JSON.stringify(decision, null, 2));
      
      // Test that a decision was made
      expect(decision).toBeDefined();
      expect(typeof decision.shouldContact).toBe('boolean');
      
      if (decision.shouldContact) {
        console.log("\nProcessing AI decision...");
        await triggerService.processAIDecision(decision, mockScheduler.userData);
        console.log("Decision processed successfully");
      } else {
        console.log("\nAI decided not to send a message at this time");
      }
      
      console.log("\nTest completed successfully");
    } catch (error) {
      console.error("Test failed:", error);
      // Fail the test if there was an error
      expect(error).toBeUndefined();
    }
  });
});