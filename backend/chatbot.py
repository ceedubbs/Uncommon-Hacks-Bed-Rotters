import google.generativeai as genai
from typing import Optional, Dict, Any
import os
from dotenv import load_dotenv
from twilio.rest import Client
from fastapi import FastAPI, Request
from twilio.twiml.messaging_response import MessagingResponse
from pydantic import BaseModel
from fastapi import APIRouter


load_dotenv()


chatbot_router = APIRouter()

class MessageRequest(BaseModel):
    phone: str
    body: str

@chatbot_router.post("/send_message/")
def send_message(request: MessageRequest):
    try:
        client = Client(os.getenv('TWILLIO_ACCOUNT_SID'), os.getenv('TWILLIO_AUTH_TOKEN'))
        message = client.messages.create(
            body=request.body,
            from_="whatsapp:+14155238886",
            to=f"whatsapp:{request.phone}",
        )
        return {"success": True, "message": message.body}
    except Exception as e:
        print(f"Error sending message: {e}")
        return {"success": False, "error": str(e)}
    
@chatbot_router.post("/receive_sms")
async def receive_sms(request: Request):
    form_data = await request.form()
    user_message = form_data.get('Body', '')
    user_phone = form_data.get('From', '')
    
    response = generate_response(user_message)
    
    twilio_response = MessagingResponse()
    twilio_response.message(response['response'])
    
    return str(twilio_response)




def generate_response(message: str, user_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
    try:
        # Initialize the model
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Build context-aware prompt
      
        prompt = f"""
        You are a compassionate and knowledgeable cancer support chatbot. Your role is to provide emotional support,
        accurate information, and practical guidance to cancer patients and their caregivers.


        Guidelines for your response:
        1. Be empathetic and supportive while maintaining professional boundaries
        2. Provide accurate, evidence-based information when appropriate
        3. Encourage seeking professional medical advice for specific medical questions
        4. Use clear, simple language
        5. Keep responses concise but warm
        6. Avoid making promises or guarantees
        7. Focus on emotional support and practical coping strategies

        User Message: "{message}"

        Please provide a supportive and appropriate response.
        """
        
        response = model.generate_content(
            prompt)
        
        formatted_response = response.text.strip()
        
        return {
            "success": True,
            "response": formatted_response,
        }

    except Exception as e:
        error_message = f"Error generating response: {str(e)}"
        print(error_message)
        return {
            "success": False,
            "error": error_message,
            "fallback_response": "I apologize, but I'm having trouble processing your message right now. Please try again in a moment, or reach out to your healthcare provider for immediate support."
        }






