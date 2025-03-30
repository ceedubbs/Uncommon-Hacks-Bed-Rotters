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
    user_input = form_data.get('SpeechResult', '').strip().lower()
    call_sid = form_data.get('CallSid', '')
    
    response = VoiceResponse()
    
    # Debug logging
    print(f"Call from {form_data.get('From', '')}")
    print(f"User input: {user_input}")

    # End conversation if user says goodbye
    end_phrases = ['goodbye', 'bye', "that's all", 'no thanks', "i'm done"]
    if any(phrase in user_input for phrase in end_phrases):
        response.say("Thank you for speaking with me today. Remember I'm here whenever you need support.", voice="woman")
        response.hangup()
        return PlainTextResponse(content=str(response), media_type="application/xml")

    if not user_input:
        # Initial greeting or re-prompt
        if 'redirect_count' not in request.query_params:
            response.say("Hello, this is Emma. I'm here to listen and help with your cancer care questions.", voice="woman")
        
        gather = Gather(
            input='speech',
            action=f"/voice?CallSid={call_sid}",
            method="POST",
            timeout=10,
            speechTimeout="auto",
            language="en-US"
        )
        gather.say("How are you feeling today? Please share what's on your mind.")
        response.append(gather)
        return PlainTextResponse(content=str(response), media_type="application/xml")

    try:
        # Generate natural, compassionate response
        prompt = f"""As Emma, a compassionate cancer support nurse, respond naturally to:
        Patient: {user_input}
        Respond in 1-2 caring sentences, then ask a relevant follow-up question.
        Keep your tone warm and professional."""
        
        ai_response = get_ai_response(prompt)
        clean_response = ' '.join(ai_response.split())  # Normalize whitespace
        
        # Continue the conversation naturally
        gather = Gather(
            input='speech',
            action=f"/voice?CallSid={call_sid}",
            method="POST",
            timeout=15,  # Give users more time to respond
            speechTimeout="auto",
            language="en-US"
        )
        gather.say(clean_response, voice="woman")
        response.append(gather)
        
        # Add natural conversational pause
        response.pause(length=1)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        response.say("I'm having some trouble understanding. Let's try again.")
        response.redirect(f"/voice?CallSid={call_sid}&redirect_count=1")

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