import os

from dotenv import load_dotenv
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi


load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI is not configured.")


# ONE shared client for the whole backend.
# (app.py used to create its own second MongoClient; that duplicate is removed.)
client = MongoClient(
    MONGO_URI,
    server_api=ServerApi("1"),
    serverSelectionTimeoutMS=5000,
)

# Name kept as "database" so existing data keeps working.
# Phase 3 will add a SEPARATE security database (medicheck_security).
db = client[os.getenv("MONGO_DB_NAME", "database")]


# Existing MediCheck collections
users = db["users"]
history_collection = db["history"]


# Person 2 collections
pharmacies_collection = db["pharmacies"]
branches_collection = db["branches"]
verification_collection = db["verification"]

# Person 3 collections
prescriptions_collection = db["prescriptions"]



# Person 4 collections
inventory_collection = db["inventory"]
stock_movements_collection = db["stock_movements"]
orders_collection = db["orders"]
carts_collection = db["carts"]


# ---- Grad 2 / Phase 1 collections ---------------------------------------
# Server-side sessions: lets us revoke ONE session (logout, password change,
# and later the automated response engine).
sessions_collection = db["sessions"]

# Persistent failed-login records (works across multiple backend instances).
login_attempts_collection = db["login_attempts"]

# Who works at which pharmacy / branch, and in what capacity.
# Before this existed the backend had NO representation of a pharmacist.
pharmacy_staff_collection = db["pharmacy_staff"]


# ---- Grad 2 / Phase 2 ------------------------------------------------------
# Security events live in their OWN database so that (a) application
# credentials can later be denied access to it, and (b) the dataset used for
# training detectors is never mixed with patient data.
security_db = client[os.getenv("SECURITY_DB_NAME", "medicheck_security")]
security_events_collection = security_db["security_events"]
