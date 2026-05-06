import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

async def check_users():
    ROOT_DIR = Path(__file__).parent.parent / 'backend'
    load_dotenv(ROOT_DIR / '.env')
    
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'barbercraft')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"Connecting to {db_name}...")
    users = await db.users.find({}, {"email": 1, "role": 1, "name": 1}).to_list(100)
    
    if not users:
        print("No users found.")
    else:
        print("Users found:")
        for u in users:
            print(f"- {u.get('name')} ({u.get('email')}) - Role: {u.get('role')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_users())
