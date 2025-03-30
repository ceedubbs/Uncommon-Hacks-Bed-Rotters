// utils/message-templates.js - Templates for proactive messages

/**
 * Message templates for different types of proactive communications
 */
const messageTemplates = {
    /**
     * Generate a daily check-in message
     * @param {Object} userData - User data
     * @param {Array} recentSymptoms - Recent symptoms
     * @returns {string} - Formatted message
     */
    dailyCheckIn: (userData, recentSymptoms = []) => {
      const userName = userData.name || "there";
      const uniqueSymptoms = Array.isArray(recentSymptoms) 
        ? [...new Set(recentSymptoms.map(s => s.name))]
        : [];
      
      if (uniqueSymptoms.length > 0) {
        return `Hi ${userName}, checking in for the day. How are you feeling? Have your ${uniqueSymptoms.join(', ')} improved since yesterday?`;
      } else {
        const greetings = [
          `Good morning ${userName}`,
          `Hello ${userName}`,
          `Hi ${userName}`
        ];
        
        const questions = [
          "How are you feeling today?",
          "How are you doing today?",
          "How's your energy level today?"
        ];
        
        const followUps = [
          "Any side effects I should know about?",
          "Are you experiencing any symptoms today?",
          "Anything I can help with today?"
        ];
        
        // Randomize the components for variety
        const greeting = greetings[Math.floor(Math.random() * greetings.length)];
        const question = questions[Math.floor(Math.random() * questions.length)];
        const followUp = followUps[Math.floor(Math.random() * followUps.length)];
        
        return `${greeting}. ${question} ${followUp}`;
      }
    },
    
    /**
     * Generate a symptom follow-up message
     * @param {Object} userData - User data
     * @param {Array} symptoms - Symptoms to follow up on
     * @returns {string} - Formatted message
     */
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
    
    /**
     * Generate a treatment reminder message
     * @param {Object} userData - User data
     * @param {Date} treatmentDate - Date of the treatment
     * @returns {string} - Formatted message
     */
    treatmentReminder: (userData, treatmentDate) => {
      const userName = userData.name || "there";
      const formattedDate = treatmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      });
      
      return `Hi ${userName}, just a reminder that you have your next treatment scheduled for ${formattedDate}. Remember to stay hydrated before your appointment and to bring any questions you have for your care team.`;
    },
    
    /**
     * Generate an inactivity check message
     * @param {Object} userData - User data
     * @returns {string} - Formatted message
     */
    inactivityCheck: (userData) => {
      const userName = userData.name || "there";
      
      return `Hi ${userName}, I noticed we haven't spoken in a few days. Just checking in to see how you're doing. How has your treatment been going?`;
    },
    
    /**
     * Generate a weekly wellness check message
     * @param {Object} userData - User data
     * @returns {string} - Formatted message
     */
    weeklyWellnessCheck: (userData) => {
      const userName = userData.name || "there";
      
      return `Hi ${userName}, it's time for your weekly wellness check-in. How would you rate your overall well-being this week on a scale of 1-10? Any particular challenges or victories you'd like to share?`;
    },
    
    /**
     * Generate a medication reminder message
     * @param {Object} userData - User data
     * @param {Object} medication - Medication details
     * @returns {string} - Formatted message
     */
    medicationReminder: (userData, medication) => {
      const userName = userData.name || "there";
      
      return `Hi ${userName}, this is a reminder to take your ${medication.name}. ${medication.instructions ? `Remember: ${medication.instructions}` : ''}`;
    },
    
    /**
     * Generate a hydration reminder message
     * @param {Object} userData - User data
     * @returns {string} - Formatted message
     */
    hydrationReminder: (userData) => {
      const userName = userData.name || "there";
      const reminders = [
        `Hi ${userName}, just a gentle reminder to stay hydrated today. Drinking enough water can help manage some treatment side effects.`,
        `Don't forget to drink water today, ${userName}! Staying hydrated is important during your treatment.`,
        `Hi ${userName}, have you been drinking enough water today? Staying hydrated can help your body process chemo medications more effectively.`
      ];
      
      return reminders[Math.floor(Math.random() * reminders.length)];
    },
    
    /**
     * Generate a positive reinforcement message
     * @param {Object} userData - User data
     * @returns {string} - Formatted message
     */
    positiveReinforcement: (userData) => {
      const userName = userData.name || "there";
      const messages = [
        `Hi ${userName}, I just wanted to remind you how strong you are. Each day you're fighting this battle is a victory.`,
        `${userName}, your resilience is inspiring. I'm here with you every step of this journey.`,
        `Just checking in to say you're doing great, ${userName}. Treatment isn't easy, but you're handling it with incredible strength.`
      ];
      
      return messages[Math.floor(Math.random() * messages.length)];
    },
    
    /**
     * Generate a new user welcome message
     * @returns {string} - Formatted message
     */
    newUserWelcome: () => {
      return "Hi there! I'm your chemo support assistant. I'll be checking in with you occasionally to see how you're doing. Could you please share your name with me so I can personalize our conversations?";
    },
    
    /**
     * Generate a diagnosis request message
     * @param {string} userName - User's name
     * @returns {string} - Formatted message
     */
    diagnosisRequest: (userName) => {
      return `Hi ${userName}, I'm here to support you through your treatment. So I can provide more relevant information, could you tell me a bit about your diagnosis and what type of chemotherapy you're receiving?`;
    }
  };
  
  module.exports = messageTemplates;