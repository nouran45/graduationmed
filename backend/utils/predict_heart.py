# utils/predict_heart.py
import os
import pickle
import joblib
import pandas as pd
import numpy as np
import logging
import traceback
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List

# ---------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------
# Globals (simple in-process cache)
# ---------------------------------------------------------------------
_model = None
_metadata: Optional[Dict[str, Any]] = None
_model_path: Optional[Path] = None
_metadata_path: Optional[Path] = None

# ---------------------------------------------------------------------
# Feature schema
# ---------------------------------------------------------------------
NUMERIC_FEATURES = ['age', 'trestbps', 'chol', 'thalach', 'oldpeak', 'ca']
CATEGORICAL_FEATURES = ['sex', 'cp', 'fbs', 'restecg', 'exang', 'slope', 'thal']

# Valid ranges for validation
VALID_RANGES = {
    'age': (0, 120),
    'trestbps': (40, 300),
    'chol': (100, 600),
    'thalach': (40, 250),
    'oldpeak': (0.0, 10.0),
    'ca': (0, 4),
    'sex': [0, 1],
    'cp': [0, 1, 2, 3],
    'fbs': [0, 1],
    'restecg': [0, 1, 2],
    'exang': [0, 1],
    'slope': [0, 1, 2],
    'thal': [0, 1, 2, 3, 7]
}

# ---------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------
def _resolve_paths() -> Tuple[Path, Path]:
    """
    Resolve model + metadata paths.
    Defaults to ../xgboostweights/heart_xgb_pipeline (1).pkl
    """
    base_dir = Path(__file__).resolve().parent
    default_model = base_dir.parent / "xgboostweights" / "heart_xgb_pipeline (1).pkl"
    default_meta = base_dir.parent / "xgboostweights" / "heart_pipeline_metadata (1).pkl"

    model_path = Path(os.getenv("HEART_MODEL_PATH", str(default_model))).resolve()
    metadata_path = Path(os.getenv("HEART_METADATA_PATH", str(default_meta))).resolve()
    return model_path, metadata_path


# ---------------------------------------------------------------------
# Helper to convert numpy scalars/lists into Python native types
# ---------------------------------------------------------------------
def _to_native(x):
    """Recursively convert numpy types to native Python types where needed."""
    if isinstance(x, (np.integer, )):
        return int(x)
    if isinstance(x, (np.floating, )):
        return float(x)
    if isinstance(x, (np.ndarray, )):
        return [_to_native(v) for v in x.tolist()]
    if isinstance(x, list):
        return [_to_native(v) for v in x]
    if isinstance(x, dict):
        return { _to_native(k): _to_native(v) for k, v in x.items() }
    return x


# ---------------------------------------------------------------------
# Model loader
# ---------------------------------------------------------------------
def load_heart_model():
    """
    Load the heart disease prediction model and metadata.
    Returns in-memory cached model + metadata on subsequent calls.
    """
    global _model, _metadata, _model_path, _metadata_path

    if _model is not None:
        return _model, _metadata

    _model_path, _metadata_path = _resolve_paths()

    if not _model_path.exists():
        msg = (
            f"Model file not found at: {_model_path}\n"
            "Set HEART_MODEL_PATH to an absolute path or place the file at the default location:\n"
            "  <repo_root>/xgboostweights/heart_xgb_pipeline.pkl"
        )
        logger.error(msg)
        raise FileNotFoundError(msg)

    logger.info(f"Loading heart disease model from: {_model_path}")

    strategies = [
        ("joblib", lambda: joblib.load(str(_model_path))),
        ("pickle", lambda: pickle.load(open(_model_path, "rb"))),
        ("pickle_latin1", lambda: pickle.load(open(_model_path, "rb"), encoding="latin1")),
    ]

    last_err: Optional[Exception] = None
    _model = None
    for name, loader in strategies:
        try:
            logger.info(f"Trying loading strategy: {name}")
            _model = loader()
            logger.info(f"✅ Successfully loaded model via {name}")
            break
        except Exception as e:
            last_err = e
            logger.warning(f"Strategy {name} failed: {e}")

    if _model is None:
        err_msg = (
            "Failed to load heart disease model: All loading strategies failed.\n"
            f"Path: {_model_path}\n"
            f"Last error: {last_err}"
        )
        logger.error(err_msg)
        raise RuntimeError(err_msg)

    _metadata = {}
    if _metadata_path.exists():
        logger.info(f"Loading metadata from: {_metadata_path}")
        try:
            try:
                _metadata = joblib.load(str(_metadata_path))
                logger.info("Loaded metadata using joblib")
            except Exception:
                with open(_metadata_path, "rb") as f:
                    _metadata = pickle.load(f)
                logger.info("Loaded metadata using pickle")
        except Exception as e:
            logger.warning(f"Could not load metadata: {e}")
            _metadata = {}
    else:
        logger.warning(f"Metadata file not found at: {_metadata_path}")
        _metadata = {}

    # Normalize common metadata entries to native python types to avoid JSON encoding issues
    if isinstance(_metadata, dict):
        # normalize model_classes if present
        if "model_classes" in _metadata:
            try:
                mc = _metadata["model_classes"]
                # convert list-like to native ints/str
                mc_native = []
                if isinstance(mc, (list, tuple, np.ndarray)):
                    for v in mc:
                        if isinstance(v, (np.integer, )):
                            mc_native.append(int(v))
                        elif isinstance(v, (np.floating, )):
                            mc_native.append(float(v))
                        else:
                            mc_native.append(v)
                else:
                    mc_native = mc
                _metadata["model_classes"] = mc_native
            except Exception:
                pass
        # normalize best_threshold
        if "best_threshold" in _metadata:
            try:
                _metadata["best_threshold"] = float(_metadata["best_threshold"])
            except Exception:
                pass
        # normalize label_mapping keys/values
        if "label_mapping" in _metadata and isinstance(_metadata["label_mapping"], dict):
            try:
                lm = {}
                for k, v in _metadata["label_mapping"].items():
                    try:
                        new_k = int(k) if not isinstance(k, str) and isinstance(k, (np.integer,)) else (int(k) if isinstance(k, str) and k.isdigit() else k)
                    except Exception:
                        new_k = k
                    lm[_to_native(new_k)] = _to_native(v)
                _metadata["label_mapping"] = lm
            except Exception:
                pass

    logger.info(f"✅ Heart disease model ready")
    return _model, _metadata


# ---------------------------------------------------------------------
# Preprocessing & Validation
# ---------------------------------------------------------------------
def validate_input(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate input data ranges and types"""
    validated = {}
    
    for feature in NUMERIC_FEATURES:
        if feature not in input_data or input_data[feature] is None:
            raise ValueError(f"Missing required numeric feature: {feature}")
        
        val = float(input_data[feature])
        min_val, max_val = VALID_RANGES[feature]
        if not (min_val <= val <= max_val):
            logger.warning(f"{feature}={val} outside expected range [{min_val}, {max_val}]")
        validated[feature] = val
    
    for feature in CATEGORICAL_FEATURES:
        if feature not in input_data or input_data[feature] is None:
            raise ValueError(f"Missing required categorical feature: {feature}")
        
        val = int(input_data[feature])
        valid_vals = VALID_RANGES[feature]
        if val not in valid_vals:
            logger.warning(f"{feature}={val} not in expected values {valid_vals}")
        validated[feature] = val
    
    return validated


def preprocess_heart_data(input_data: Dict[str, Any], metadata: Dict[str, Any]) -> pd.DataFrame:
    """Preprocess input data for the model"""
    try:
        validated = validate_input(input_data)
        features_order = metadata.get("features_order", NUMERIC_FEATURES + CATEGORICAL_FEATURES)
        
        df = pd.DataFrame([validated])
        df = df.reindex(columns=features_order, fill_value=0)
        
        logger.info(f"Preprocessed shape: {df.shape} | columns: {list(df.columns)}")
        return df

    except Exception as e:
        logger.error(f"Preprocessing failed: {e}")
        raise Exception(f"Data preprocessing failed: {e}") from e


# ---------------------------------------------------------------------
# Prediction - WITH PROBABILITY ARRAY SWAP (MODEL IS INVERTED)
# ---------------------------------------------------------------------
def predict_heart_disease(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict heart disease based on input parameters.
    
    Model Labels (Cleveland dataset):
    - 0 = No heart disease
    - 1 = Heart disease present
    
    CRITICAL: The model's probability array is INVERTED
    - proba[0] actually contains disease probability
    - proba[1] actually contains no-disease probability
    We swap them when extracting.
    
    Returns a dict with probabilities, prediction, and recommendations.
    """
    try:
        logger.info("❤️ Starting heart disease prediction")

        model, metadata = load_heart_model()
        df = preprocess_heart_data(input_data, metadata)

        # -------------------------
        # Get raw predictions & probabilities
        # -------------------------
        raw_pred = None
        prob_no_disease = 0.5
        prob_disease = 0.5
        conf = 0.5

        # load classes from metadata or model
        meta_model_classes = metadata.get("model_classes") if metadata else None
        
        model_classes = None
        if meta_model_classes:
            model_classes = list(meta_model_classes)
        elif hasattr(model, "classes_"):
            model_classes = list(model.classes_)
        else:
            model_classes = [0, 1]

        logger.info(f"Model classes: {model_classes}")

        # Get probability predictions
        if hasattr(model, "predict_proba"):
            try:
                proba = model.predict_proba(df)[0]
                logger.info(f"Raw proba array: {proba}")
                
                # CRITICAL FIX: SWAP THE PROBABILITIES
                # The model's array is inverted, so:
                # proba[0] = disease probability (confusingly labeled as class 0)
                # proba[1] = no-disease probability (confusingly labeled as class 1)
                prob_disease = float(proba[0])        # Swap: take first element as disease
                prob_no_disease = float(proba[1])     # Swap: take second element as no-disease
                conf = float(max(prob_no_disease, prob_disease))
                
                logger.info(f"After SWAP - disease prob: {prob_disease:.4f}, no-disease prob: {prob_no_disease:.4f}")
                
            except Exception as e:
                logger.warning(f"Failed to extract probabilities: {e}")
                logger.warning(traceback.format_exc())
                try:
                    raw_pred = int(model.predict(df)[0])
                except Exception as e2:
                    logger.error(f"Also failed to predict: {e2}")

        if raw_pred is None:
            try:
                raw_pred = int(model.predict(df)[0])
                logger.info(f"Raw prediction value: {raw_pred}")
            except Exception as e:
                logger.error(f"Failed to get raw prediction: {e}")
                raise

        # Determine if patient has disease based on probability threshold
        try:
            best_threshold = float(metadata.get("best_threshold", 0.5))
        except Exception:
            best_threshold = 0.5

        has_heart_disease = prob_disease >= best_threshold
        pred = 1 if has_heart_disease else 0

        logger.info(f"Threshold: {best_threshold}, Disease prob: {prob_disease:.4f}, Has disease: {has_heart_disease}")

        # -------------------------
        # Risk, recommendations, output packaging
        # -------------------------
        risk_level = determine_risk_level(prob_disease, input_data)
        recs = generate_heart_recommendations(has_heart_disease, input_data, prob_disease)

        # Convert input_features dict to native Python types
        input_features_dict = {}
        for k, v in df.iloc[0].to_dict().items():
            if isinstance(v, (np.integer, np.floating)):
                input_features_dict[k] = float(v)
            elif isinstance(v, np.bool_):
                input_features_dict[k] = bool(v)
            else:
                input_features_dict[k] = v

        # Normalize model_classes into fully native list
        try:
            model_classes_native = []
            for v in model_classes:
                if isinstance(v, (np.integer, )):
                    model_classes_native.append(int(v))
                elif isinstance(v, (np.floating, )):
                    model_classes_native.append(float(v))
                else:
                    model_classes_native.append(v)
        except Exception:
            model_classes_native = _to_native(model_classes)

        # Build result with correct probabilities
        result = {
            "success": True,
            "prediction": int(pred) if isinstance(pred, (int, np.integer)) else _to_native(pred),
            "has_heart_disease": bool(has_heart_disease),
            "confidence": float(round(conf * 100, 2)),
            "probability_no_disease": float(round(prob_no_disease * 100, 2)),
            "probability_disease": float(round(prob_disease * 100, 2)),
            "risk_level": str(risk_level),
            "disease": "Heart Disease Detected" if has_heart_disease else "No Heart Disease Detected",
            "diagnosis": get_heart_diagnosis(has_heart_disease, conf, prob_disease),
            "recommendations": recs,
            "input_features": input_features_dict,
            "all_probabilities": {
                "0": float(round(prob_no_disease * 100, 2)),
                "1": float(round(prob_disease * 100, 2))
            },
            "model_classes": model_classes_native,
            "used_threshold": float(best_threshold)
        }

        logger.info(f"✅ Final result - {result['disease']}")
        logger.info(f"   prediction={result['prediction']}, has_disease={result['has_heart_disease']}, prob_disease={prob_disease*100:.1f}%")
        return result

    except FileNotFoundError as e:
        logger.error(str(e))
        return {"success": False, "error": str(e), "prediction": None, "confidence": 0}
    except ValueError as e:
        logger.error(str(e))
        return {"success": False, "error": str(e), "prediction": None, "confidence": 0}
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        logger.error(traceback.format_exc())
        return {"success": False, "error": str(e), "prediction": None, "confidence": 0}


# ---------------------------------------------------------------------
# Risk assessment
# ---------------------------------------------------------------------
def determine_risk_level(prob_disease: float, input_data: Dict[str, Any]) -> str:
    """Determine risk level based on disease probability"""
    if prob_disease >= 0.8:
        return "Very High"
    elif prob_disease >= 0.6:
        return "High"
    elif prob_disease >= 0.4:
        return "Moderate"
    elif prob_disease >= 0.2:
        return "Low"
    else:
        return "Very Low"


# ---------------------------------------------------------------------
# Recommendations & diagnosis text
# ---------------------------------------------------------------------
def generate_heart_recommendations(has_disease: bool, input_data: Dict[str, Any], prob: float) -> list:
    """Generate personalized recommendations"""
    recs = []
    
    if has_disease or prob > 0.5:
        recs.extend([
            "🥼 Immediate consultation with a cardiologist is strongly recommended.",
            "💊 Discuss starting or adjusting cardiac medications with your doctor.",
            "🩺 Schedule comprehensive cardiac evaluation including ECG and echocardiogram.",
            "🚭 If you smoke, quitting is the single most important step you can take.",
            "💪 Begin supervised cardiac rehabilitation if recommended by your doctor.",
        ])
        
        if input_data.get('trestbps', 0) > 140:
            recs.append("⚠️ High blood pressure detected - strict BP control is critical for heart health.")
        
        if input_data.get('chol', 0) > 240:
            recs.append("📊 Elevated cholesterol - discuss statin therapy with your physician.")
        
        if input_data.get('fbs', 0) == 1:
            recs.append("🩸 Elevated blood sugar - diabetes management is crucial for cardiac protection.")
        
        if input_data.get('thalach', 0) < 100:
            recs.append("❤️ Low maximum heart rate - may indicate reduced cardiac fitness.")
        
        if input_data.get('oldpeak', 0) > 2.0:
            recs.append("📈 Significant ST depression - indicates potential myocardial ischemia.")
        
        if input_data.get('exang', 0) == 1:
            recs.append("⚡ Exercise-induced angina detected - avoid strenuous activity until cleared by cardiologist.")
        
        if input_data.get('ca', 0) >= 1:
            recs.append("🔬 Major vessel blockage suspected - immediate cardiac intervention may be needed.")
    
    else:
        recs.extend([
            "✅ Low risk detected, but continue heart-healthy lifestyle habits.",
            "🥗 Maintain a balanced diet rich in fruits, vegetables, and whole grains.",
            "🏃 Regular physical activity: aim for 150 minutes of moderate exercise weekly.",
            "⚖️ Maintain healthy weight and BMI.",
            "🩺 Regular health checkups and monitoring of blood pressure and cholesterol.",
            "😴 Ensure adequate sleep (7-9 hours) and manage stress effectively.",
        ])
        
        if input_data.get('age', 0) > 55:
            recs.append("👴 Age-related risk - consider more frequent cardiac screening.")
        
        if input_data.get('sex', 0) == 1:
            recs.append("👨 Males have higher baseline risk - maintain vigilant cardiovascular monitoring.")
        
        if input_data.get('trestbps', 0) > 120:
            recs.append("📊 Prehypertension detected - lifestyle modifications to prevent progression.")
    
    recs.append("⚠️ This is an AI-assisted screening tool. Always consult healthcare professionals for diagnosis.")
    
    return recs


def get_heart_diagnosis(has_disease: bool, confidence: float, prob: float) -> str:
    """Generate diagnosis text"""
    if has_disease:
        if confidence > 0.90:
            return f"High probability ({prob*100:.1f}%) of coronary heart disease detected. Immediate medical evaluation is strongly recommended. This prediction is based on clinical cardiac indicators."
        elif confidence > 0.75:
            return f"Moderate-high probability ({prob*100:.1f}%) of heart disease. Medical consultation advised for comprehensive cardiac evaluation."
        else:
            return f"Possible heart disease detected ({prob*100:.1f}% probability). Further diagnostic testing recommended."
    else:
        if confidence > 0.90:
            return f"Low probability ({(1-prob)*100:.1f}%) of heart disease. Continue preventive cardiac care and regular monitoring."
        elif confidence > 0.75:
            return f"Cardiac function appears normal ({(1-prob)*100:.1f}% confidence). Maintain heart-healthy lifestyle."
        else:
            return f"Uncertain result. Consider additional cardiac testing for definitive assessment."