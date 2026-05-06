import asyncio
import os
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

async def reset_password(email, new_password):
    ROOT_DIR = Path(__file__).parent.parent / 'backend'
    load_dotenv(ROOT_DIR / '.env')
    
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'barbercraft')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"Connecting to {db_name}...")
    
    # Hash the new password
    password_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    
    # Update the user
    result = await db.users.update_one(
        {"email": email.lower()},
        {"$set": {"password_hash": password_hash}}
    )
    
    if result.matched_count > 0:
        print(f"Successfully reset password for {email} to: {new_password}")
    else:
        print(f"User with email {email} not found.")
    
    client.close()

if __name__ == "__main__":
    email_to_reset = "toji771411@gmail.com"
    new_pass = "Password123"
    asyncio.run(reset_password(email_to_reset, new_pass))
