// test/user-registration.test.js
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

// Path to the data directory
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const SCHEDULES_DIR = path.join(DATA_DIR, 'schedules');

// Ensure directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(USERS_DIR, { recursive: true });
    await fs.mkdir(SCHEDULES_DIR, { recursive: true });
    console.log("Directories created/verified");
  } catch (error) {
    console.error("Error creating directories:", error);
    throw error;
  }
}

// Mock the scheduler service to avoid actual scheduling
jest.mock('../services/scheduler.service', () => ({
  getSchedulerForUser: (phoneNumber) => {
    console.log(`Mock scheduler created for ${phoneNumber}`);
    return {
      setupSchedule: async (preferences) => {
        console.log("Mock scheduler setup with preferences:", preferences);
        return true;
      },
      triggerService: {
        addTreatmentSchedule: async (date) => {
          console.log(`Mock treatment scheduled for ${date}`);
          return true;
        }
      }
    };
  }
}));

// Test user registration
async function testUserRegistration() {
  try {
    await ensureDirectories();
    
    // Reset module cache to load fresh modules
    if (require.cache[require.resolve('../services/enhanced-user.service')]) {
      delete require.cache[require.resolve('../services/enhanced-user.service')];
    }
    
    // Import the user service
    const EnhancedUserService = require('../services/enhanced-user.service');
    
    // Initialize the service
    await EnhancedUserService.init();
    
    // Create test user data
    const testUser = {
      name: "Test Patient",
      phone: "+1234567890",
      email: "test@example.com",
      diagnosis: "Breast Cancer Stage 2",
      age: 45,
      gender: "Female",
      treatmentType: "AC-T Chemotherapy",
      treatmentStartDate: "2023-10-15",
      treatmentFrequency: "Every 3 weeks",
      medications: [
        { name: "Doxorubicin", schedule: "Day 1 of cycle" },
        { name: "Cyclophosphamide", schedule: "Day 1 of cycle" }
      ],
      allergies: ["Penicillin"],
      emergencyContact: {
        name: "John Smith",
        relationship: "Husband",
        phone: "+19876543210"
      },
      careTeam: [
        { name: "Dr. Sarah Johnson", role: "Oncologist", phone: "+15551234567" }
      ],
      checkInFrequency: "daily",
      checkInTime: "09:00",
      reminderEnabled: true,
      upcomingTreatmentDates: [
        "2023-11-05T09:30:00",
        "2023-11-26T09:30:00",
        "2023-12-17T09:30:00"
      ]
    };
    
    console.log("Registering test user...");
    const result = await EnhancedUserService.registerUser(testUser);
    
    console.log("Registration result:", result);
    
    if (result.success) {
      console.log("User registered successfully!");
      
      // Verify user file was created
      const formattedPhone = testUser.phone.startsWith('whatsapp:') 
        ? testUser.phone 
        : `whatsapp:${testUser.phone}`;
      
      const fileName = `${formattedPhone.replace(/\W/g, '_')}.json`;
      const userFilePath = path.join(USERS_DIR, fileName);
      
      console.log("Checking if user file exists at:", userFilePath);
      try {
        const fileData = await fs.readFile(userFilePath, 'utf8');
        const userData = JSON.parse(fileData);
        console.log("User data file created successfully:", userData);
      } catch (error) {
        console.error("Error reading user file:", error);
        throw error;
      }
    } else {
      console.error("User registration failed:", result.message);
    }
  } catch (error) {
    console.error("Test failed:", error);
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
  
  jest.mock('../services/scheduler.service', {
    getSchedulerForUser: (phoneNumber) => {
      console.log(`Mock scheduler created for ${phoneNumber}`);
      return {
        setupSchedule: async (preferences) => {
          console.log("Mock scheduler setup with preferences:", preferences);
          return true;
        },
        triggerService: {
          addTreatmentSchedule: async (date) => {
            console.log(`Mock treatment scheduled for ${date}`);
            return true;
          }
        }
      };
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

// Run the test
testUserRegistration();