// test/comprehensive.test.js
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

// Path to the data directory
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const SCHEDULES_DIR = path.join(DATA_DIR, 'schedules');

// Ensure test directories exist
async function setupTestEnvironment() {
  try {
    // Create directories
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(USERS_DIR, { recursive: true });
    await fs.mkdir(SCHEDULES_DIR, { recursive: true });
    
    console.log("Test environment set up");
    return true;
  } catch (error) {
    console.error("Error setting up test environment:", error);
    throw error;
  }
}

// Mock WhatsApp service
global.mockMessages = [];
jest.mock('../services/whatsapp.service', () => ({
  sendWhatsAppMessage: async (to, message) => {
    const mockMessage = {
      to,
      body: message,
      timestamp: new Date().toISOString()
    };
    global.mockMessages.push(mockMessage);
    console.log('\n===== MOCK MESSAGE SENT =====');
    console.log(`TO: ${to}`);
    console.log(`MESSAGE: ${message}`);
    console.log('=============================\n');
    return { sid: 'MOCK_SID_' + Date.now() };
  }
}));

// Test User Data
const TEST_PHONE = 'whatsapp:+1234567890';
const TEST_USER = {
  name: "Emily Johnson",
  phoneNumber: TEST_PHONE,
  diagnosis: "Stage 2 Breast Cancer",
  age: 42,
  gender: "Female",
  treatmentType: "AC-T Chemotherapy",
  treatmentStartDate: "2023-10-01",
  lastInteraction: new Date().toISOString(),
  symptoms: []
};

// Test Schedule Data
const TEST_SCHEDULE = {
  preferences: {
    checkInFrequency: "daily",
    checkInTime: "09:00",
    reminderEnabled: true
  },
  lastCheckIn: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
  upcomingCheckIns: []
};

// Create test user files
async function createTestUserFiles() {
  try {
    const userFilePath = path.join(USERS_DIR, `${TEST_PHONE.replace(/\W/g, '_')}.json`);
    const scheduleFilePath = path.join(SCHEDULES_DIR, `${TEST_PHONE.replace(/\W/g, '_')}.json`);
    
    await fs.writeFile(userFilePath, JSON.stringify(TEST_USER, null, 2));
    await fs.writeFile(scheduleFilePath, JSON.stringify(TEST_SCHEDULE, null, 2));
    
    console.log("Test user files created");
    return true;
  } catch (error) {
    console.error("Error creating test user files:", error);
    throw error;
  }
}

// Simulate user reporting symptoms
async function simulateSymptomReport() {
  try {
    // Load the scheduler module directly
    const { getSchedulerForUser } = require('../services/scheduler.service');
    
    // Get the scheduler for our test user
    const scheduler = await getSchedulerForUser(TEST_PHONE);
    
    // Report a severe symptom
    await scheduler.triggerService.recordSymptom({
      name: "nausea",
      severity: "severe",
      reportedAt: new Date().toISOString(),
      followedUp: false
    });
    
    console.log("Simulated symptom report");
    return true;
  } catch (error) {
    console.error("Error simulating symptom report:", error);
    throw error;
  }
}

// Simulate time passage
async function simulateTimePassage(hoursToAdvance) {
  try {
    // Load user data
    const userFilePath = path.join(USERS_DIR, `${TEST_PHONE.replace(/\W/g, '_')}.json`);
    const schedulePath = path.join(SCHEDULES_DIR, `${TEST_PHONE.replace(/\W/g, '_')}.json`);
    
    const userData = JSON.parse(await fs.readFile(userFilePath, 'utf8'));
    const scheduleData = JSON.parse(await fs.readFile(schedulePath, 'utf8'));
    
    // Adjust last interaction time
    const pastTime = new Date();
    pastTime.setHours(pastTime.getHours() - hoursToAdvance);
    userData.lastInteraction = pastTime.toISOString();
    
    // Also adjust last check-in time
    if (scheduleData.lastCheckIn) {
      scheduleData.lastCheckIn = pastTime.toISOString();
    }
    
    // Save the modified data
    await fs.writeFile(userFilePath, JSON.stringify(userData, null, 2));
    await fs.writeFile(schedulePath, JSON.stringify(scheduleData, null, 2));
    
    console.log(`Simulated ${hoursToAdvance} hours passing`);
    return true;
  } catch (error) {
    console.error("Error simulating time passage:", error);
    throw error;
  }
}

// Check AI trigger
async function testAITrigger() {
  try {
    // Load the scheduler module
    const { getSchedulerForUser } = require('../services/scheduler.service');
    
    // Get the scheduler for our test user
    const scheduler = await getSchedulerForUser(TEST_PHONE);
    
    // Run the schedule check, which includes AI trigger evaluation
    await scheduler.checkSchedule();
    
    console.log("AI trigger evaluation complete");
    
    // Check if any messages were sent
    if (global.mockMessages.length > 0) {
      console.log(`${global.mockMessages.length} messages were sent by the AI trigger:`);
      global.mockMessages.forEach((msg, i) => {
        console.log(`\nMessage #${i+1}:`);
        console.log(`To: ${msg.to}`);
        console.log(`Sent at: ${msg.timestamp}`);
        console.log(`Body: ${msg.body}`);
      });
    } else {
      console.log("No messages were sent by the AI trigger");
    }
    
    return true;
  } catch (error) {
    console.error("Error testing AI trigger:", error);
    throw error;
  }
}

// Run all tests in sequence
async function runComprehensiveTest() {
  try {
    console.log("Starting comprehensive test...\n");
    
    // Clear module cache to get fresh instances
    Object.keys(require.cache).forEach(key => {
      if (key.includes('/services/') || key.includes('\\services\\')) {
        delete require.cache[key];
      }
    });
    
    // Set up test environment
    await setupTestEnvironment();
    
    // Create test user
    await createTestUserFiles();
    
    // Test scenario 1: User reports a severe symptom
    console.log("\n=== SCENARIO 1: User reports a severe symptom ===");
    global.mockMessages = []; // Reset mock messages
    await simulateSymptomReport();
    await testAITrigger();
    
    // Test scenario 2: Last interaction was 48 hours ago
    console.log("\n=== SCENARIO 2: User has been inactive for 48 hours ===");
    global.mockMessages = []; // Reset mock messages
    await simulateTimePassage(48);
    await testAITrigger();
    
    // Test scenario 3: Daily check-in time
    console.log("\n=== SCENARIO 3: It's time for daily check-in ===");
    global.mockMessages = []; // Reset mock messages
    
    // Modify the schedule to make it look like it's time for a check-in
    const schedulePath = path.join(SCHEDULES_DIR, `${TEST_PHONE.replace(/\W/g, '_')}.json`);
    const scheduleData = JSON.parse(await fs.readFile(schedulePath, 'utf8'));
    
    // Set last check-in to 24+ hours ago
    const checkInTime = new Date();
    checkInTime.setHours(checkInTime.getHours() - 25);
    scheduleData.lastCheckIn = checkInTime.toISOString();
    
    // Update the file
    await fs.writeFile(schedulePath, JSON.stringify(scheduleData, null, 2));
    
    await testAITrigger();
    
    // Test scenario 4: User has an upcoming treatment
    console.log("\n=== SCENARIO 4: User has treatment in 23 hours ===");
    global.mockMessages = []; // Reset mock messages
    
    // Add treatment schedule
    const userFilePath = path.join(USERS_DIR, `${TEST_PHONE.replace(/\W/g, '_')}.json`);
    const userData = JSON.parse(await fs.readFile(userFilePath, 'utf8'));
    
    // Set treatment for 23 hours from now
    const treatmentTime = new Date();
    treatmentTime.setHours(treatmentTime.getHours() + 23);
    userData.treatmentSchedule = {
      nextTreatment: treatmentTime.toISOString(),
      reminderSent: false
    };
    
    // Update the file
    await fs.writeFile(userFilePath, JSON.stringify(userData, null, 2));
    
    await testAITrigger();
    
    console.log("\n=== Comprehensive test completed successfully ===");
  } catch (error) {
    console.error("Comprehensive test failed:", error);
  }
}

// For environments without Jest
if (typeof jest === 'undefined') {
  global.jest = {
    mock: (modulePath, mockImplementation) => {
      const mockPath = path.resolve(__dirname, '..', modulePath);
      jest.mockedModules = jest.mockedModules || {};
      jest.mockedModules[mockPath] = mockImplementation;
    },
    mockedModules: {}
  };
  
  // Set up the WhatsApp service mock
  jest.mock('../services/whatsapp.service', {
    sendWhatsAppMessage: async (to, message) => {
      const mockMessage = {
        to,
        body: message,
        timestamp: new Date().toISOString()
      };
      global.mockMessages = global.mockMessages || [];
      global.mockMessages.push(mockMessage);
      console.log('\n===== MOCK MESSAGE SENT =====');
      console.log(`TO: ${to}`);
      console.log(`MESSAGE: ${message}`);
      console.log('=============================\n');
      return { sid: 'MOCK_SID_' + Date.now() };
    }
  });
  
  // Monkey patch require
  const originalRequire = module.require;
  module.require = function(path) {
    if (jest.mockedModules && jest.mockedModules[path]) {
      return jest.mockedModules[path];
    }
    return originalRequire.apply(this, arguments);
  };
}

// Run the comprehensive test
runComprehensiveTest();