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


@voice_call_router.post("/voice")
async def voice(request: Request):
    form_data = await request.form()
    user_input = form_data.get('SpeechResult', '')  # Capture speech input
    user_phone = form_data.get('From', '')  # Capture phone number
    
    # Detect intent from Dialogflow
    response_text = detect_intent(os.getenv('DIALOGFLOW_PROJECT_ID'), user_phone, user_input, 'en')

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

def detect_intent(project_id, session_id, text, language_code):
    if private_key and "\\n" in private_key:
        private_key = private_key.replace("\\n", "\n")
    
    if not private_key:
        raise ValueError("""
        Missing Dialogflow private key. Check:
        1. .env file exists with correct key
        2. Docker-compose has 'env_file: .env'
        3. No typos in variable names
        """)
    
    credentials = service_account.Credentials.from_service_account_info({
        "type": "service_account",
        "project_id": os.getenv("DIALOGFLOW_PROJECT_ID"),
        "private_key": private_key,
        "client_email": os.getenv("DIALOGFLOW_CLIENT_EMAIL"),
        "token_uri": "https://oauth2.googleapis.com/token"
    })
    session_client = dialogflow.SessionsClient(credentials=credentials)
    session = session_client.session_path(project_id, session_id)

    text_input = dialogflow.types.TextInput(text=text, language_code=language_code)
    query_input = dialogflow.types.QueryInput(text=text_input)

    response = session_client.detect_intent(request={"session": session, "query_input": query_input})

    return response.query_result.fulfillment_text

print(os.getenv("DIALOGFLOW_PRIVATE_KEY"))