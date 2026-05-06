"""
Comprehensive test script for all prediction models
Run this to verify everything works before testing API endpoints
"""
import sys
import os
from pathlib import Path

print("=" * 60)
print("🧪 COMPREHENSIVE MODEL TEST")
print("=" * 60)
print()

# Test 1: Import all modules
print("📦 Test 1: Importing modules...")
try:
    from utils.predict import predict_skin_disease
    print("   ✅ Skin disease module imported")
except Exception as e:
    print(f"   ❌ Skin disease import failed: {e}")
    sys.exit(1)

try:
    from utils.predict_diabetes import predict_diabetes
    print("   ✅ Diabetes module imported")
except Exception as e:
    print(f"   ❌ Diabetes import failed: {e}")
    sys.exit(1)

try:
    from utils.predict_kidney import predict_kidney_disease
    print("   ✅ Kidney module imported")
except Exception as e:
    print(f"   ❌ Kidney import failed: {e}")
    sys.exit(1)

try:
    from utils.predict_fracture import predict_fracture
    print("   ✅ Fracture module imported")
except Exception as e:
    print(f"   ❌ Fracture import failed: {e}")
    sys.exit(1)

print()

# Test 2: Check model files exist
print("📁 Test 2: Checking model files...")
model_files = {
    "Skin (ViT)": "vitweights",
    "Diabetes": "xgboostweights/diabetes_pipeline (1).pkl",
    "Kidney": "xgboostweights/ckd_xgb_pipeline.pkl",
    "Fracture": "cnnweights/best_transfer_model_local.h5"
}

all_files_exist = True
for name, path in model_files.items():
    if os.path.exists(path):
        print(f"   ✅ {name}: Found at {path}")
    else:
        print(f"   ❌ {name}: NOT FOUND at {path}")
        all_files_exist = False

if not all_files_exist:
    print("\n⚠️  Some model files are missing. Predictions may fail.")
else:
    print("\n✅ All model files found!")

print()

# Test 3: Diabetes Prediction
print("🩺 Test 3: Testing Diabetes Prediction...")
try:
    test_data = {
        "age": 50,
        "bmi": 28.5,
        "hypertension": 0,
        "heart_disease": 0,
        "smoking_history": 0,
        "HbA1c_level": 6.5,
        "blood_glucose_level": 140,
        "gender": 1
    }
    result = predict_diabetes(test_data)
    if result.get("success"):
        print(f"   ✅ Diabetes prediction works!")
        print(f"   📊 Probability: {result.get('diabetes_probability')}")
        print(f"   📊 Prediction: {'Diabetes' if result.get('diabetes_prediction') else 'No Diabetes'}")
    else:
        print(f"   ❌ Diabetes prediction failed: {result.get('error')}")
except Exception as e:
    print(f"   ❌ Diabetes test failed: {e}")
    import traceback
    traceback.print_exc()

print()

# Test 4: Kidney Prediction
print("🫘 Test 4: Testing Kidney Prediction...")
try:
    test_data = {
        "age": 48, "bp": 80, "sg": 1.020, "al": 1, "su": 0,
        "rbc": "normal", "pc": "normal", "pcc": "notpresent",
        "ba": "notpresent", "bgr": 121, "bu": 36, "sc": 1.2,
        "sod": 137, "pot": 4.6, "hemo": 15.4, "pcv": 44,
        "wc": 7800, "rc": 5.2, "htn": "no", "dm": "no",
        "cad": "no", "appet": "good", "pe": "no", "ane": "no"
    }
    result = predict_kidney_disease(test_data)
    if result.get("success"):
        print(f"   ✅ Kidney prediction works!")
        print(f"   📊 Disease: {result.get('disease')}")
        print(f"   📊 Confidence: {result.get('confidence')}%")
    else:
        print(f"   ❌ Kidney prediction failed: {result.get('error')}")
except Exception as e:
    print(f"   ❌ Kidney test failed: {e}")
    import traceback
    traceback.print_exc()

print()

# Test 5: Check if image models can be initialized (without actual prediction)
print("🖼️  Test 5: Checking image models (skin & fracture)...")
print("   ℹ️  Skipping full prediction (requires image files)")
print("   ✅ Modules imported successfully (see Test 1)")

print()
print("=" * 60)
print("🎉 TEST SUMMARY")
print("=" * 60)
print("✅ Module imports: PASSED")
print("✅ Diabetes prediction: CHECK ABOVE")
print("✅ Kidney prediction: CHECK ABOVE")
print("ℹ️  Skin & Fracture: Need image files for full test")
print()
print("Next step: Test API endpoints")
print("Run: uvicorn app:app --reload")
print("=" * 60)