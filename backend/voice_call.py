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


from twilio.twiml.voice_response import VoiceResponse, Gather, Hangup

@voice_call_router.post("/voice")
async def voice(request: Request):
    form_data = await request.form()
    user_input = form_data.get('SpeechResult', '').lower()
    digits = form_data.get('Digits', '')  # For keypad input
    call_sid = form_data.get('CallSid', '')
    
    response = VoiceResponse()
    
    # Debug logging
    print(f"Call from {form_data.get('From', '')}")
    print(f"User said: {user_input}")
    print(f"Digits pressed: {digits}")

    # End call if user pressed # or said goodbye
    if 'goodbye' in user_input or '#' in digits:
        response.say("Thank you for calling. Remember I'm here whenever you need support. Goodbye.", voice="woman")
        response.hangup()
        return PlainTextResponse(content=str(response), media_type="application/xml")

    if not user_input and not digits:
        # Initial greeting
        response.say("Hello, this is Emma. I'm here to listen and help with your cancer care questions.", voice="woman")
        gather = Gather(
            input='speech dtmf',  # Accept both voice and keypad
            action=f"/voice?CallSid={call_sid}",
            method="POST",
            timeout=10,
            speechTimeout="auto",
            numDigits=1,
            language="en-US"
        )
        gather.say("How are you feeling today? You can speak freely or press any key when ready.")
        response.append(gather)
        return PlainTextResponse(content=str(response), media_type="application/xml")

    # Process user input
    try:
        if user_input:
            # Generate natural response
            prompt = f"""As Emma, a compassionate cancer nurse, respond naturally to:
            Patient: {user_input}
            Respond conversationally in 1-2 sentences, then ask a follow-up question."""
            
            ai_response = get_ai_response(prompt)
            clean_response = ai_response.replace('*', '').replace('#', '')
            
            # Continue conversation
            gather = Gather(
                input='speech dtmf',
                action=f"/voice?CallSid={call_sid}",
                method="POST",
                timeout=10,
                speechTimeout="auto",
                numDigits=1
            )
            gather.say(clean_response, voice="woman")
            response.append(gather)
            
        elif digits:
            response.say("Please tell me how you're feeling or ask your question.", voice="woman")
            response.redirect("/voice")
            
    except Exception as e:
        print(f"Error: {str(e)}")
        response.say("Let me connect you to a human specialist. One moment please.")
        # Here you'd add actual transfer logic
        response.hangup()

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