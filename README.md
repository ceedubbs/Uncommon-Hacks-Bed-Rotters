

# Chemo-Pal

Chemo-Pal is a WhatsApp-based healthcare pal specifically tailored to chemotherapy support. The chatbot provides information about chemotherapy treatments, side effects, and supportive care, accessible through WhatsApp.

Purpose:

- Chemotherapy is a long and gruling process. In the moments of discomfort, WebMD doesn't bring the certainty and attention that patients.
- Chemo-Pal provides accuate online-sourced medical remedies and OTC solutions based on a patient's immediate symptoms and needs
- Chemo-Pal takes note of symptoms and when they happen so that treatment progress can be tracked


## Features

- **WhatsApp Integration**: Accessible through WhatsApp using Twilio's API ✅
- **Context-aware Responses**: References specific chemotherapy knowledge from JSON context files ✅
- **Conversation Memory**: Maintains conversation history for personalized responses ✅
- **Admin Controls**: Endpoints for monitoring and maintenance 🚧
- **Agentic Reminders**: Scheduled message check-ups for symptoms and progress 🚧

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
