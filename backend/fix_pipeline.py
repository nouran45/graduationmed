# fix_pipeline.py
import joblib
from xgboost import XGBClassifier
from sklearn.pipeline import Pipeline
import os

def fix_pipeline():
    try:
        # Load the old pipeline (this might work on your local machine)
        old_pipeline = joblib.load('xgboostweights/diabetes_pipeline (1).pkl')
        print("✅ Successfully loaded old pipeline")
        
        # Extract the preprocessor
        preprocessor = old_pipeline.named_steps['preprocessor']
        
        # Create new pipeline with same preprocessor but new XGBoost
        new_pipeline = Pipeline([
            ('preprocessor', preprocessor),
            ('classifier', XGBClassifier())  # Fresh XGBoost instance
        ])
        
        # Save the new pipeline
        joblib.dump(new_pipeline, 'xgboostweights/diabetes_pipeline_new.pkl')
        print("✅ New pipeline created successfully!")
        
    except Exception as e:
        print(f"❌ Failed: {e}")
        print("Trying alternative approach...")
        try_alternative_approach()

def try_alternative_approach():
    # Alternative: Create simple pipeline from scratch
    from sklearn.preprocessing import StandardScaler
    from sklearn.impute import SimpleImputer
    from sklearn.compose import ColumnTransformer
    from sklearn.pipeline import Pipeline
    
    # Create a simple preprocessor (adjust based on your feature types)
    numeric_features = ['age', 'bmi', 'HbA1c_level', 'blood_glucose_level']
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    categorical_features = ['gender', 'smoking_history', 'hypertension', 'heart_disease']
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ])
    
    # Create new pipeline
    new_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', XGBClassifier())
    ])
    
    joblib.dump(new_pipeline, 'xgboostweights/diabetes_pipeline_new.pkl')
    print("✅ Created new pipeline from scratch!")

if __name__ == "__main__":
    fix_pipeline()