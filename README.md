# Chemopal: Chemotherapy Support via WhatsApp and Voice Call

A healthcare chatbot and voice assistant designed to provide dedicated support to chemotherapy patients. Accessible through WhatsApp and voice calls, Chemopal offers vital information on chemotherapy treatments, side effects, and emotional support, ensuring patients receive the care they need at any time.

## Features

- **WhatsApp Integration**: Accessible through WhatsApp using Twilio's API and Gemini API
- **Context-aware Responses**: References specific chemotherapy knowledge from JSON context files
- **Conversation Memory**: Maintains conversation history for personalized responses
- **Admin Controls**: Endpoints for monitoring and maintenance
- **Call Functionality**: Voice interaction via phone number, utilizing Twilio's voice API and Gemini API for real-time communication and personalized support

## Project Structure

```
chemotherapy-chatbot/
├── config/               # Application configuration
├── context/              # Context JSON files
├── controllers/          # Request handlers
├── services/             # Business logic
├── utils/                # Utility functions
├── middleware/           # Express middleware
├── routes/               # Route definitions
├── .env                  # Environment variables
└── server.js             # Main application entry point
```

## Setup Instructions

1. **Install dependencies**:
   ```
   npm install
   ```

2. **Configure environment variables**:
   - Copy `.env.example` to `.env`
   - Add your Gemini API key and other configuration options

3. **Prepare context files**:
   Create JSON files in the `/context` directory:
   - `side_effects.json`: Information about chemotherapy side effects
   - `treatments.json`: Treatment protocols and regimens
   - `medications.json`: Medication details and usage 
   - `emergency_guidelines.json`: Emergency instructions
   - `nutrition_guidelines.json`: Nutrition advice

4. **Start the server**:
   ```
   npm start
   ```

5. **Configure Twilio WhatsApp**:
   - Set up a Twilio WhatsApp Sandbox
   - Point the webhook URL to your server's `/whatsapp` endpoint

## Context File Format

Each context file should follow a specific format:

```json
{
  "keyword": {
    "description": "Description text",
    "management": ["Step 1", "Step 2"],
    "otherInfo": "Additional details"
  }
}
```

## Usage

Patients can interact with the chatbot through WhatsApp by:
- Asking questions about chemotherapy treatments
- Inquiring about side effect management
- Seeking general guidance during treatment

## Admin Features

- `/admin/context?key=YOUR_ADMIN_API_KEY`: View loaded context data
- Send "admin:reload" message from authorized number to reload context files
- Send "reset" message to restart conversation

## Development

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

[MIT License](LICENSE)