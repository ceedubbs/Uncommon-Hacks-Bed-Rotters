from pymongo import MongoClient
from pymongo.errors import PyMongoError
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os

app = FastAPI()

class CreateUser(BaseModel):
    name: str
    email: str
    phone: str

def sign_up(name, email, phone):
    try:
        client = MongoClient(os.getenv("DATABASE_URL"))
        db = client["chemo_users_db"]
        collection = db["users"]

        # Check if phone number already exists
        existing_user = collection.find_one({"phone": phone})
        if existing_user:
            return {
                "success": False,
                "message": "Phone number already registered. Please use a different number or try logging in."
            }

        post = {
            "name": name,
            "email": email,
            "phone": phone,
            "diagnosis": "",
            "chat_history": [],
            "symptoms": [],
        }

        collection.insert_one(post)
        return {
            "success": True,
            "message": "Registration successful! Welcome to our platform."
        }
    except PyMongoError as e:
        print(f"An error occurred: {e}")
        return {
            "success": False,
            "message": "An error occurred during registration. Please try again later."
        }


@app.post("/sign_up")
async def sign_up_endpoint(user: CreateUser):
    result = sign_up(user.name, user.email, user.phone)
    if result ["success"]:
        return result
    else:
        raise HTTPException(status_code=400, detail=result["message"])
