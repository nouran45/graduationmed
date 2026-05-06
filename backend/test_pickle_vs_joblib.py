import pickle
import joblib
import os

file_path = "xgboostweights/scaler_final.pkl"


print(f"🔍 Testing file: {file_path}")

# === First Try: Joblib ===
try:
    obj = joblib.load(file_path)
    print("✅ Loaded successfully with joblib.")
    print(f"Type: {type(obj)}")
except Exception as e:
    print(f"❌ joblib.load() failed: {e}")

# === Then Try: Pickle ===
try:
    with open(file_path, "rb") as f:
        obj2 = pickle.load(f)
        print("✅ Loaded successfully with pickle.")
        print(f"Type: {type(obj2)}")
except Exception as e:
    print(f"❌ pickle.load() failed: {e}")
