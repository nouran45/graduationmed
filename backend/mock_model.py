# Create this as create_mock_model.py to generate a test model

import pickle
import numpy as np
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

def create_mock_kidney_model():
    """Create a simple mock model for testing purposes"""
    
    # Create directories if they don't exist
    os.makedirs("xgboostweights", exist_ok=True)
    
    # Create a simple mock pipeline
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('classifier', RandomForestClassifier(n_estimators=10, random_state=42))
    ])
    
    # Create some dummy training data to fit the pipeline
    # 24 features matching the kidney disease dataset
    X_dummy = np.random.randn(100, 24)  # 100 samples, 24 features
    y_dummy = np.random.randint(0, 2, 100)  # binary classification
    
    # Fit the pipeline
    pipeline.fit(X_dummy, y_dummy)
    
    # Save the model
    model_path = "xgboostweights/ckd_xgb_pipeline.pkl"
    with open(model_path, 'wb') as f:
        pickle.dump(pipeline, f)
    
    # Save metadata
    feature_names = [
        'age', 'bp', 'sg', 'al', 'su', 'rbc', 'pc', 'pcc', 'ba', 'bgr',
        'bu', 'sc', 'sod', 'pot', 'hemo', 'pcv', 'wc', 'rc', 'htn', 'dm',
        'cad', 'appet', 'pe', 'ane'
    ]
    
    metadata = {'feature_names': feature_names}
    metadata_path = "xgboostweights/ckd_pipeline_metadata.pkl"
    with open(metadata_path, 'wb') as f:
        pickle.dump(metadata, f)
    
    print(f"✅ Mock model saved to: {model_path}")
    print(f"✅ Metadata saved to: {metadata_path}")
    print("You can now test your kidney disease prediction endpoint!")

if __name__ == "__main__":
    create_mock_kidney_model()