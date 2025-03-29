from pymongo import MongoClient
from pymongo.errors import PyMongoError
import os


def sign_up(name, email, phone, diagnosis):
    try:
        client = MongoClient(os.getenv("DATABASE_URL"))
        db = client["chemo_users_db"]
        collection = db["users"]

        post = {
            "name": name,
            "email": email,
            "phone": phone,
            "diagnosis": diagnosis
        }

        collection.insert_one(post)
        return True
    except PyMongoError as e:
        print(f"An error occurred: {e}")
        return False

sign_up("John Doe", "john.doe@example.com", "1234567890", "Cancer")

