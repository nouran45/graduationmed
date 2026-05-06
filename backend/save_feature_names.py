import joblib

full_feature_names = [
    'age', 'bmi', 'hypertension', 'heart_disease',
    'smoking_history', 'HbA1c_level', 'blood_glucose_level', 'gender',
    'bmi_age', 'bp_bmi', 'heart_smoke'
]

joblib.dump(full_feature_names, 'xgboostweights/full_feature_names.pkl')
