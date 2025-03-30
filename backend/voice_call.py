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
    user_input = form_data.get('SpeechResult', '')
    call_sid = form_data.get('CallSid', '')
    
    response = VoiceResponse()
    
    # Debug logging
    print(f"New call from {form_data.get('From', '')}")
    print(f"Call SID: {call_sid}")
    print(f"User input: {user_input}")

    if not user_input:
        # Initial greeting with gather
        response.say("Hello, I'm Emma, your personal cancer support assistant.", voice="woman")
        gather = Gather(
            input='speech',
            action=f"/voice?CallSid={call_sid}",
            method="POST",
            timeout=10,
            speechTimeout="auto",
            language="en-US"
        )
        gather.say("How are you feeling today? Please describe your symptoms or ask any questions.")
        response.append(gather)
        
        # If no input after gathering
        response.say("I didn't hear anything. Please speak clearly after the tone.")
        response.pause(length=2)
        return PlainTextResponse(content=str(response), media_type="application/xml")

    try:
        # Process user input with Gemini
        response_text = get_ai_response(
            f"""You are Emma, a compassionate cancer support assistant. 
            Respond to this patient in a caring, professional tone in 1-2 short sentences.
            Patient said: {user_input}"""
        )
        
        # Format the response for phone audio
        clean_response = response_text.replace('*', '').replace('#', '')
        
        # Continue conversation
        response.say(f"I understand you said: {user_input}. {clean_response}", voice="woman")
        
        gather = Gather(
            input='speech',
            action=f"/voice?CallSid={call_sid}",
            method="POST",
            timeout=5,
            speechTimeout="auto"
        )
        gather.say("Is there anything else I can help with? Please say yes or no.")
        response.append(gather)
        
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        response.say("I'm having trouble understanding. Let's try again.")
        response.redirect("/voice")

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