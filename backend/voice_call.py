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
load_dotenv()

voice_call_router = APIRouter()

client = Client(os.getenv('TWILLIO_ACCOUNT_SID'), os.getenv('TWILLIO_AUTH_TOKEN'))
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-pro')

@voice_call_router.post("/voice")
async def voice(request: Request):
    form_data = await request.form()
    user_input = form_data.get('SpeechResult', '')  # Capture speech input
    user_phone = form_data.get('From', '')  # Capture phone number
    
    # Detect intent from Dialogflow
    response_text = get_ai_response(user_input)
    
    response = VoiceResponse()

    # If the response from Dialogflow is long, split it
    response.say(response_text, voice="alice")

    return PlainTextResponse(content=str(response), media_type="application/xml")

class CallRequest(BaseModel):
    to_phone: str
    from_phone: str = "whatsapp:+14155238886"

@voice_call_router.post("/make_call/")
async def make_call(call_data: CallRequest):
    call = client.calls.create(
        to=call_data.to_phone,
        from_=call_data.from_phone,
        url="http://your-server.com/voice/"
    )

    return {"message": "Call initiated", "call_sid": call.sid}


def get_ai_response(prompt):
    """Get response from Gemini"""
    response = model.generate_content(prompt)
    return response.text