# test_actual_files.py
import joblib
import pickle
import os

# These are the actual files from your predict_diabetes.py
files_to_test = [
    "xgboostweights/diabetes_pipeline (1).pkl",
    "xgboostweights/best_threshold (2).pkl", 
    "xgboostweights/selected_feature_names (1).pkl"
]

for file_path in files_to_test:
    print(f"\n🔍 Testing: {file_path}")
    
    # Check if file exists
    if not os.path.exists(file_path):
        print(f"❌ File does not exist: {file_path}")
        continue
        
    # Try joblib
    try:
        obj = joblib.load(file_path)
        print(f"✅ joblib.load() successful")
        print(f"   Type: {type(obj)}")
        print(f"   Object: {str(obj)[:100]}...")  # First 100 chars
    except Exception as e:
        print(f"❌ joblib.load() failed: {e}")
    
    # Try pickle
    try:
        with open(file_path, "rb") as f:
            obj2 = pickle.load(f)
        print(f"✅ pickle.load() successful")  
        print(f"   Type: {type(obj2)}")
        print(f"   Object: {str(obj2)[:100]}...")
    except Exception as e:
        print(f"❌ pickle.load() failed: {e}")