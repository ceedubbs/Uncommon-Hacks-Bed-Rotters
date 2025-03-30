import google.generativeai as genai
from google.cloud import dialogflow
from google.oauth2 import service_account
import os
from dotenv import load_dotenv
from twilio.rest import Client
from fastapi import APIRouter, Request
from twilio.twiml.voice_response import VoiceResponse
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from twilio.twiml.voice_response import VoiceResponse, Gather

load_dotenv()

voice_call_router = APIRouter()

client = Client(os.getenv('TWILLIO_ACCOUNT_SID'), os.getenv('TWILLIO_AUTH_TOKEN'))
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")


from twilio.twiml.voice_response import VoiceResponse, Gather

@voice_call_router.post("/voice")
async def voice(request: Request):
    form_data = await request.form()
    user_input = form_data.get('SpeechResult', '')  # Capture speech input
    user_phone = form_data.get('From', '')  # Capture phone number

    # Log to check the speech input
    print(f"User input: {user_input}")

    # Process speech input with Gemini AI
    response_text = get_ai_response(user_input)  # Process the input and get a response from Gemini

    response = VoiceResponse()

    # Initial greeting message
    response.say("Hello, I am Emma, your personalcancer support bot. How can I assist you today?")

    # Create a 'Gather' to listen for speech input
    gather = Gather(input='speech', timeout=10, speech_model='phone_call', language='en-US')
    gather.say("Please tell me how you're feeling today or ask any questions.")
    response.append(gather)

    # If no speech input is detected, repeat the question
    response.say("Sorry, I didn't catch that. Please try again.")
    
    # Respond with a message from Gemini AI if speech is detected
    if user_input:  # If there's speech input from the user
        response.say(f"Thank you for sharing. You said: {user_input}. Here is what I can do for you: {response_text}")
    
    # Add a final message that keeps the call alive and doesn't end it immediately
    response.say("Thank you for your call.")

    return PlainTextResponse(content=str(response), media_type="application/xml")


class CallRequest(BaseModel):
    to_phone: str
    from_phone: str 

@voice_call_router.post("/make_call/")
async def make_call(call_data: CallRequest):
    call = client.calls.create(
        to=call_data.to_phone,
        from_=call_data.from_phone,
        url="http://18.216.1.232:8000/voice"
    )

    return {"message": "Call initiated", "call_sid": call.sid}


def get_ai_response(prompt):
    """Get response from Gemini"""
    response = model.generate_content(prompt)
    return response.text