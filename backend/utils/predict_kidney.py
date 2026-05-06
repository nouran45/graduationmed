# utils/predict_kidney.py
import os, pickle, joblib, pandas as pd, logging, traceback
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Canonical NEW schema (19 features) ---
SCHEMA_19 = [
    "sex", "age", "blood_pressure", "specific_gravity", "albumin", "sugar",
    "blood_glucose_random", "blood_urea", "serum_creatinine",
    "sodium", "potassium", "hemoglobin", "packed_cell_volume",
    "white_blood_cell_count", "red_blood_cell_count",
    "hypertension", "diabetes", "anemia", "edema",
]

# Accept a wide set of keys -> map to our 19 names
ALIASES = {
    # basic numerics (short/long/camel)
    "age":"age",
    "bp":"blood_pressure", "bloodpressure":"blood_pressure", "blood_pressure":"blood_pressure",
    "sg":"specific_gravity", "specificgravity":"specific_gravity", "specific_gravity":"specific_gravity",
    "al":"albumin", "albumin":"albumin",
    "su":"sugar", "sugar":"sugar",
    "bgr":"blood_glucose_random", "bloodglucoserandom":"blood_glucose_random", "blood_glucose_random":"blood_glucose_random",
    "bu":"blood_urea", "bloodurea":"blood_urea", "blood_urea":"blood_urea",
    "sc":"serum_creatinine", "serumcreatinine":"serum_creatinine", "serum_creatinine":"serum_creatinine",
    "sod":"sodium", "sodium":"sodium",
    "pot":"potassium", "potassium":"potassium",
    "hemo":"hemoglobin", "hemoglobin":"hemoglobin",
    "pcv":"packed_cell_volume", "packedcellvolume":"packed_cell_volume", "packed_cell_volume":"packed_cell_volume",
    "wc":"white_blood_cell_count", "whitebloodcellcount":"white_blood_cell_count", "white_blood_cell_count":"white_blood_cell_count",
    "rc":"red_blood_cell_count", "redbloodcellcount":"red_blood_cell_count", "red_blood_cell_count":"red_blood_cell_count",

    # booleans / categories (old & new)
    "htn":"hypertension", "hypertension":"hypertension",
    "dm":"diabetes", "diabetes":"diabetes", "diabetes_mellitus":"diabetes",
    "ane":"anemia", "anemia":"anemia",
    "pe":"edema", "edema":"edema", "pedal_edema":"edema",

    # sex / gender
    "sex":"sex", "gender":"sex",

    # legacy CKD-24 extras (we’ll ignore them by not including in final columns)
    "rbc":None, "pc":None, "pcc":None, "ba":None, "bacteria":None,
    "cad":None, "coronary_artery_disease":None, "appet":None, "appetite":None,
}

# categorical mappings on our 19 features
YES_NO = {"yes": 1, "no": 0}
SEX_MAP = {"male": 1, "female": 0}

_model = None
_expected_feats: Optional[List[str]] = None

def _resolve_paths() -> Tuple[Path, Path]:
    base = Path(__file__).resolve().parent
    model = Path(os.getenv("CKD_MODEL_PATH", str(base.parent / "xgboostweights" / "ckd_xgb_pipeline2.pkl"))).resolve()
    meta  = Path(os.getenv("CKD_METADATA_PATH", str(base.parent / "xgboostweights" / "ckd_pipeline_metadata2.pkl"))).resolve()
    return model, meta

def _extract_feature_names_from_model(model) -> Optional[List[str]]:
    # try common places to find feature_names_in_
    try:
        if hasattr(model, "feature_names_in_"):
            return list(model.feature_names_in_)
        if hasattr(model, "steps"):  # sklearn Pipeline
            for _, step in model.steps:
                if hasattr(step, "feature_names_in_"):
                    return list(step.feature_names_in_)
                # ColumnTransformer inner steps
                if hasattr(step, "transformers_"):
                    for _, tr, _ in step.transformers_:
                        if hasattr(tr, "feature_names_in_"):
                            return list(tr.feature_names_in_)
        # XGB/other wrappers sometimes stash it on .preprocessor_ or similar
        for attr in ("preprocessor_", "preprocess_", "processor_", "imputer_"):
            if hasattr(model, attr) and hasattr(getattr(model, attr), "feature_names_in_"):
                return list(getattr(model, attr).feature_names_in_)
    except Exception:
        pass
    return None

def load_kidney_model():
    global _model, _expected_feats
    if _model is not None:
        return _model, _expected_feats or SCHEMA_19

    model_path, meta_path = _resolve_paths()
    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found at: {model_path}")

    logger.info(f"Loading kidney disease model from: {model_path}")
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
        raise RuntimeError("Failed to load kidney model.")

    feats = _extract_feature_names_from_model(_model)
    if feats is None:
        # try metadata
        if meta_path.exists():
            try:
                meta = joblib.load(str(meta_path))
                feats = meta.get("feature_names")
            except Exception as e:
                logger.warning(f"Metadata load failed: {e}")
    # default to our 19-schema if nothing extracted
    _expected_feats = list(feats) if isinstance(feats, list) else SCHEMA_19

    logger.info(f"✅ Expected feature names ({len(_expected_feats)}): {_expected_feats}")
    return _model, _expected_feats

def _to_canonical_19(inp: Dict[str, Any]) -> Dict[str, Any]:
    # normalise keys to lower/no spaces
    norm = {str(k).strip().replace(" ", "_").lower(): v for k, v in inp.items()}
    out: Dict[str, Any] = {}
    for k, v in norm.items():
        target = ALIASES.get(k, None)
        if target is None:
            continue  # legacy extras ignored
        out[target] = v
    return out

def preprocess_kidney_data(input_data: Dict[str, Any], expected_feats: List[str]) -> pd.DataFrame:
    try:
        data = _to_canonical_19(input_data)

        # yes/no → 0/1
        for key in ("hypertension", "diabetes", "anemia", "edema"):
            if key in data:
                if isinstance(data[key], str):
                    data[key] = YES_NO.get(data[key].lower(), data[key])
        # sex → 0/1 (only if model expects it)
        if "sex" in expected_feats:
            val = data.get("sex", "")
            if isinstance(val, str):
                data["sex"] = SEX_MAP.get(val.lower(), 0)
            else:
                data["sex"] = int(val) if val in (0, 1) else 0

        # numeric coercion for all non-boolean fields
        for k in expected_feats:
            if k not in data:
                data[k] = 0.0
            elif k not in ("hypertension", "diabetes", "anemia", "edema", "sex"):
                try:
                    v = data[k]
                    data[k] = 0.0 if v in (None, "") else float(v)
                except Exception:
                    logger.warning(f"Cannot convert {k}={data[k]} to float; default 0.0")
                    data[k] = 0.0

        df = pd.DataFrame([data], columns=expected_feats)  # strict order
        logger.info(f"Preprocessed columns: {list(df.columns)}")
        return df
    except Exception as e:
        logger.error(f"Preprocessing failed: {e}")
        raise

def predict_kidney_disease(input_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        logger.info("🔎 Starting kidney disease prediction (19-schema)")
        model, expected_feats = load_kidney_model()
        df = preprocess_kidney_data(input_data, expected_feats)

        pred = model.predict(df)[0]
        has_ckd = bool(int(pred) == 1)

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

        return {
            "success": True,
            "prediction": int(pred),
            "has_kidney_disease": has_ckd,
            "confidence": round(conf * 100, 2),
            "probability_no_ckd": round(prob_no * 100, 2),
            "probability_ckd": round(prob_yes * 100, 2),
            "risk_level": "High" if has_ckd else "Low",
            "disease": "Chronic Kidney Disease" if has_ckd else "No Chronic Kidney Disease",
        }

    except FileNotFoundError as e:
        return {"success": False, "error": str(e), "prediction": None, "confidence": 0}
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        logger.error(traceback.format_exc())
        return {"success": False, "error": f"{e}", "prediction": None, "confidence": 0}

# ----------------------------
# Text helpers
# ----------------------------
def generate_kidney_recommendations(has_ckd: bool, input_data: Dict[str, Any]) -> list:
    recs = []
    if has_ckd:
        recs.extend([
            "Consult a nephrologist for comprehensive evaluation.",
            "Monitor blood pressure; aim for <130/80 mmHg.",
            "Adopt a kidney-friendly diet low in sodium, phosphorus, and potassium.",
            "Stay hydrated; follow physician guidance on fluids.",
            "Avoid nephrotoxic drugs and follow prescriptions carefully.",
            "If diabetic, maintain tight glycemic control.",
            "Schedule regular labs for creatinine, GFR, and proteinuria.",
        ])
        if input_data.get("hypertension") in (1, "yes") or input_data.get("htn") in (1, "yes"):
            recs.append("Strict blood pressure control is crucial for kidney protection.")
        if input_data.get("diabetes_mellitus") in (1, "yes") or input_data.get("dm") in (1, "yes"):
            recs.append("Maintain HbA1c < 7% where appropriate.")
        if input_data.get("appetite") in (1, "poor") or input_data.get("appet") in (1, "poor"):
            recs.append("Work with a dietitian to address appetite while maintaining nutrition.")
    else:
        recs.extend([
            "Maintain a healthy lifestyle to prevent kidney disease.",
            "Stay adequately hydrated (unless otherwise instructed).",
            "Balanced diet rich in fruits and vegetables.",
            "Regular exercise and maintain healthy weight.",
            "Monitor blood pressure and blood sugar regularly.",
            "Avoid excessive NSAID use.",
            "Annual kidney function screening if you have risk factors.",
        ])
        try:
            age = float(input_data.get("age", 0))
            bp  = float(input_data.get("blood_pressure", input_data.get("bp", 0)))
            if age > 60:
                recs.append("Age-related risk—consider more frequent monitoring.")
            if bp > 140:
                recs.append("Elevated BP—focus on cardiovascular health.")
        except Exception:
            pass
    return recs

def get_kidney_diagnosis(has_ckd: bool, confidence: float) -> str:
    if has_ckd:
        if confidence > 0.9:
            return "High probability of CKD. Immediate medical consultation recommended."
        elif confidence > 0.7:
            return "Moderate–high probability of CKD. Medical evaluation advised."
        else:
            return "Possible CKD detected. Further testing recommended."
    else:
        if confidence > 0.9:
            return "Low probability of CKD. Continue preventive care."
        elif confidence > 0.7:
            return "Kidney function appears normal. Regular monitoring recommended."
        else:
            return "Uncertain result. Consider additional testing for definitive assessment."
