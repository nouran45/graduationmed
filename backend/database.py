import os

from dotenv import load_dotenv
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi


load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI is not configured.")


client = MongoClient(
    MONGO_URI,
    server_api=ServerApi("1"),
    serverSelectionTimeoutMS=5000,
)

db = client["database"]


# Existing MediCheck collections
users = db["users"]
history_collection = db["history"]


# Person 4 collections
inventory_collection = db["inventory"]
stock_movements_collection = db["stock_movements"]
orders_collection = db["orders"]