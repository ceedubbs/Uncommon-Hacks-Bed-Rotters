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

    print(f"User input: {user_input}")

    # Create a Twilio response object
    response = VoiceResponse()

    # If no input is provided, ask the user to speak
    if not user_input:
        response.say("Sorry, I didn't hear anything. Please try again.")
        return PlainTextResponse(content=str(response), media_type="application/xml")

    # Process speech input with Gemini AI
    response_text = get_ai_response(user_input)  # Process the input and get a response from Gemini

    # Respond with the AI response
    response.say(f"Thank you for sharing. You said: {user_input}. Here is what I can do for you: {response_text}")

    # Add a final message that keeps the call alive and doesn't end it immediately
    response.say("Thank you for your call.")

    return PlainTextResponse(content=str(response), media_type="application/xml")


def get_ai_response(prompt):
    """Get response from Gemini"""
    if not prompt.strip():  # If the prompt is empty, return a default message
        return "I'm sorry, I couldn't understand that. Could you please say it again?"

    response = model.generate_content(prompt)
    return response.text


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