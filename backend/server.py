from pymongo import MongoClient
from pymongo.errors import PyMongoError
import os


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
            "diagnosis": ""
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

sign_up("John Doe", "john.doe@example.com", "1234567890", "Cancer")

