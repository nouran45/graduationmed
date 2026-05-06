import os
import pickle
import joblib
import pandas as pd
import logging
import traceback
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Feature schema (5 features) ---
SCHEMA_5 = [
    "Gender",
    "Hemoglobin",
    "MCH",
    "MCHC",
    "MCV",
]

# Accept various key formats -> map to canonical names
ALIASES = {
    # Direct matches
    "gender": "Gender",
    "Gender": "Gender",
    "hemoglobin": "Hemoglobin",
    "Hemoglobin": "Hemoglobin",
    "mch": "MCH",
    "MCH": "MCH",
    "mchc": "MCHC",
    "MCHC": "MCHC",
    "mcv": "MCV",
    "MCV": "MCV",
}

# Gender mapping
GENDER_MAP = {
    "male": 1,
    "female": 0,
    "m": 1,
    "f": 0,
    "1": 1,
    "0": 0,
}

_model = None
_expected_feats: Optional[List[str]] = None


def _resolve_paths() -> Tuple[Path, Path]:
    """Resolve model and metadata paths"""
    base = Path(__file__).resolve().parent
    model = Path(
        os.getenv(
            "ANEMIA_MODEL_PATH",
            str(base.parent / "xgboostweights" / "anemia_xgb_pipeline.pkl"),
        )
    ).resolve()
    meta = Path(
        os.getenv(
            "ANEMIA_METADATA_PATH",
            str(base.parent / "xgboostweights" / "anemia_pipeline_metadata.pkl"),
        )
    ).resolve()
    return model, meta


def _extract_feature_names_from_model(model) -> Optional[List[str]]:
    """Extract feature names from model if available"""
    try:
        if hasattr(model, "feature_names_in_"):
            return list(model.feature_names_in_)
        if hasattr(model, "steps"):  # sklearn Pipeline
            for _, step in model.steps:
                if hasattr(step, "feature_names_in_"):
                    return list(step.feature_names_in_)
                if hasattr(step, "transformers_"):
                    for _, tr, _ in step.transformers_:
                        if hasattr(tr, "feature_names_in_"):
                            return list(tr.feature_names_in_)
        for attr in ("preprocessor_", "preprocess_", "processor_", "imputer_"):
            if hasattr(model, attr) and hasattr(getattr(model, attr), "feature_names_in_"):
                return list(getattr(model, attr).feature_names_in_)
    except Exception:
        pass
    return None


def load_anemia_model():
    """Load the anemia prediction model and metadata"""
    global _model, _expected_feats
    if _model is not None:
        return _model, _expected_feats or SCHEMA_5

    model_path, meta_path = _resolve_paths()
    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found at: {model_path}")

    logger.info(f"Loading anemia prediction model from: {model_path}")

    for name, fn in [
        ("joblib", lambda: joblib.load(str(model_path))),
        ("pickle", lambda: pickle.load(open(model_path, "rb"))),
        ("pickle_latin1", lambda: pickle.load(open(model_path, "rb"), encoding="latin1")),
    ]:
        try:
            _model = fn()
            logger.info(f"✅ Loaded model via {name}")
            break
        except Exception as e:
            logger.warning(f"{name} loader failed: {e}")

    if _model is None:
        raise RuntimeError("Failed to load anemia model.")

    feats = _extract_feature_names_from_model(_model)
    if feats is None:
        if meta_path.exists():
            try:
                meta = joblib.load(str(meta_path))
                feats = meta.get("feature_names")
            except Exception as e:
                logger.warning(f"Metadata load failed: {e}")

    _expected_feats = list(feats) if isinstance(feats, list) else SCHEMA_5

    logger.info(f"✅ Expected feature names ({len(_expected_feats)}): {_expected_feats}")
    return _model, _expected_feats


def _to_canonical_5(inp: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize input keys to canonical 5-feature schema"""
    norm = {str(k).strip().replace(" ", "_").lower(): v for k, v in inp.items()}
    out: Dict[str, Any] = {}

    for k, v in norm.items():
        target = ALIASES.get(k, None)
        if target is None:
            continue
        out[target] = v

    return out


def preprocess_anemia_data(
    input_data: Dict[str, Any], expected_feats: List[str]
) -> pd.DataFrame:
    """Preprocess input data for anemia model"""
    try:
        data = _to_canonical_5(input_data)

        # Process Gender: convert string to 0/1
        if "Gender" in expected_feats:
            val = data.get("Gender", "")
            if isinstance(val, str):
                data["Gender"] = GENDER_MAP.get(val.lower(), 0)
            else:
                data["Gender"] = int(val) if val in (0, 1) else 0

        # Numeric coercion for all features
        for k in expected_feats:
            if k not in data:
                data[k] = 0.0
            elif k != "Gender":
                try:
                    v = data[k]
                    data[k] = 0.0 if v in (None, "") else float(v)
                except Exception:
                    logger.warning(f"Cannot convert {k}={data[k]} to float; default 0.0")
                    data[k] = 0.0
            else:
                data[k] = int(data[k])

        df = pd.DataFrame([data], columns=expected_feats)
        logger.info(f"Preprocessed columns: {list(df.columns)}")
        return df

    except Exception as e:
        logger.error(f"Preprocessing failed: {e}")
        raise


def predict_anemia(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict anemia based on blood work parameters
    
    Args:
        input_data: Dictionary containing Gender, Hemoglobin, MCH, MCHC, MCV
    
    Returns:
        Dictionary with prediction results
    """
    try:
        logger.info("🩸 Starting anemia prediction")
        model, expected_feats = load_anemia_model()
        df = preprocess_anemia_data(input_data, expected_feats)

        pred = model.predict(df)[0]
        has_anemia = bool(int(pred) == 1)

        prob_no = prob_yes = conf = 0.5
        if hasattr(model, "predict_proba"):
            try:
                proba = model.predict_proba(df)[0]
                if hasattr(model, "classes_"):
                    classes = list(model.classes_)
                    idx_yes = classes.index(1) if 1 in classes else 1
                    idx_no = classes.index(0) if 0 in classes else (0 if idx_yes != 0 else 1)
                else:
                    idx_no, idx_yes = 0, 1
                prob_no, prob_yes = float(proba[idx_no]), float(proba[idx_yes])
                conf = max(prob_no, prob_yes)
            except Exception as e:
                logger.warning(f"predict_proba failed: {e}")

        risk_level = (
            "High" if prob_yes > 0.7 else "Moderate" if prob_yes > 0.4 else "Low"
        )

        diagnosis = (
            f"High probability ({prob_yes*100:.1f}%) of anemia detected. Medical consultation recommended."
            if has_anemia
            else f"Low probability ({prob_no*100:.1f}%) of anemia. Continue routine health monitoring."
        )

        logger.info(f"✅ Prediction: {has_anemia} (confidence: {conf*100:.1f}%)")

        return {
            "success": True,
            "prediction": int(pred),
            "has_anemia": has_anemia,
            "confidence": round(conf * 100, 2),
            "probability_no_anemia": round(prob_no * 100, 2),
            "probability_anemia": round(prob_yes * 100, 2),
            "risk_level": risk_level,
            "disease": "Anemia Detected" if has_anemia else "No Anemia Detected",
            "diagnosis": diagnosis,
            "notes": "This is an AI-assisted screening tool. Always consult healthcare professionals for proper diagnosis.",
        }

    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        return {"success": False, "error": str(e), "prediction": None, "confidence": 0}
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        logger.error(traceback.format_exc())
        return {"success": False, "error": str(e), "prediction": None, "confidence": 0}


def generate_anemia_recommendations(has_anemia: bool, input_data: Dict[str, Any]) -> list:
    """Generate personalized recommendations based on anemia prediction"""
    recs = []

    if has_anemia:
        recs.extend([
            "Consult a hematologist or physician for comprehensive evaluation.",
            "Complete blood count (CBC) and iron studies recommended.",
            "Dietary assessment: ensure adequate iron, B12, and folate intake.",
            "Consider iron supplementation if iron deficiency anemia is confirmed.",
            "Monitor for symptoms: fatigue, shortness of breath, dizziness.",
            "Regular follow-up testing to track hemoglobin levels.",
            "Avoid blood donation until anemia is resolved.",
        ])
        
        hemoglobin = float(input_data.get("Hemoglobin", 0))
        if hemoglobin < 7:
            recs.append("⚠️ Severe anemia detected - immediate medical attention may be needed.")
        elif hemoglobin < 10:
            recs.append("Moderate anemia - prompt medical evaluation is important.")

        mch = float(input_data.get("MCH", 0))
        if mch < 27:
            recs.append("Low MCH suggests microcytic anemia - iron deficiency likely.")
        elif mch > 33:
            recs.append("High MCH suggests macrocytic anemia - B12/folate deficiency possible.")

    else:
        recs.extend([
            "Hemoglobin levels appear normal - continue healthy lifestyle.",
            "Maintain balanced diet rich in iron, vitamins B12, and folate.",
            "Regular physical activity supports cardiovascular health.",
            "Annual health checkups including complete blood count.",
            "Adequate sleep and stress management support blood health.",
        ])

        hemoglobin = float(input_data.get("Hemoglobin", 0))
        gender = input_data.get("Gender", 0)
        
        if gender == 1 and hemoglobin < 13.5:
            recs.append("For males, hemoglobin is on the lower end of normal - monitor levels.")
        elif gender == 0 and hemoglobin < 12:
            recs.append("For females, hemoglobin is on the lower end of normal - monitor levels.")

    recs.append("⚠️ This is an AI-assisted screening tool. Always consult healthcare professionals for diagnosis.")
    return recs


def get_anemia_diagnosis(has_anemia: bool, confidence: float, prob_yes: float) -> str:
    """Generate detailed diagnosis text"""
    if has_anemia:
        if confidence > 90:
            return f"High probability ({prob_yes*100:.1f}%) of anemia detected. Immediate medical evaluation is strongly recommended."
        elif confidence > 75:
            return f"Moderate-high probability ({prob_yes*100:.1f}%) of anemia. Medical consultation advised."
        else:
            return f"Possible anemia detected ({prob_yes*100:.1f}% probability). Further diagnostic testing recommended."
    else:
        if confidence > 90:
            return f"Low probability ({(1-prob_yes)*100:.1f}%) of anemia. Continue preventive health care and regular monitoring."
        elif confidence > 75:
            return f"Blood parameters appear normal ({(1-prob_yes)*100:.1f}% confidence). Maintain healthy lifestyle."
        else:
            return f"Uncertain result. Consider additional blood work for definitive assessment."