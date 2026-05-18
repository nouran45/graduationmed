"""
Run from the backend folder after copying model files to backend/ml_models/kidney_phase6:
    python test_kidney_phase6.py
"""

from utils.predict_kidney import predict_kidney_disease

sample_patient = {
    "age": 48,
    "bp": 80,
    "sg": 1.020,
    "al": 1,
    "su": 0,
    "rbc": "normal",
    "pc": "normal",
    "pcc": "notpresent",
    "ba": "notpresent",
    "bgr": 120,
    "bu": 36,
    "sc": 1.2,
    "sod": 138,
    "pot": 4.4,
    "hemo": 13.5,
    "pcv": 40,
    "wc": 9000,
    "rc": 4.8,
    "htn": "no",
    "dm": "no",
    "cad": "no",
    "appet": "good",
    "pe": "no",
    "ane": "no",
}

if __name__ == "__main__":
    result = predict_kidney_disease(sample_patient)
    print(result)
