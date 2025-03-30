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

    print(f"User input: {user_input}")  # Log for debugging

    response = VoiceResponse()

    # Step 1: Bot greets the user
    response.say("Hello, I am Emma, your personal cancer support bot. How can I assist you today?")

    # Step 2: Start gathering speech input, allow enough time for the user to respond
    gather = Gather(input='speech', timeout=20, speech_model='phone_call', language='en-US')
    gather.say("Please tell me how you're feeling today or ask any questions. I'm here to listen.")
    response.append(gather)

    # Step 3: If no input is captured, re-prompt the user (give a retry option)
    response.say("I didn't quite catch that. Could you please try again? I'm here for you.")

    # Step 4: If speech input is captured, process and respond in a caring manner
    if user_input:
        response_text = get_ai_response(user_input)  # Process the input and get a response from Gemini
        response.say(f"Thank you for sharing that with me. I understand how you're feeling, and here's how I can assist you: {response_text}")
    else:
        response.say("It seems I couldn't hear you. Please feel free to try again. I'm ready to listen.")

    # Step 5: End the call with a friendly closing message
    response.say("Thank you for reaching out. Take care, and goodbye for now.")

    return PlainTextResponse(content=str(response), media_type="application/xml")


def get_ai_response(prompt):
    """Get response from Gemini"""
    if not prompt.strip():  # If the prompt is empty, return a default message
        return "I'm sorry, I couldn't understand that. Could you please say it again?"

    response = model.generate_content(prompt)
    return response.text


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