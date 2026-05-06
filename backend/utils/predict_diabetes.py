import pandas as pd
import joblib
import os
import traceback
import numpy as np

# === Paths ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEIGHTS_DIR = os.path.join(BASE_DIR, "..", "xgboostweights")

# Updated model file names
pipeline_path = os.path.join(WEIGHTS_DIR, "diabetes_pipeline (4).pkl")
metadata_path = os.path.join(WEIGHTS_DIR, "diabetes_pipeline_metadata (2).pkl")


def generate_risk_factors(input_data: dict, probability: float) -> list:
    """Generate human-readable risk factors based on input data."""
    factors = []

    # Age
    age = input_data.get("age", None)
    if age is not None:
        try:
            age_f = float(age)
            if age_f >= 65:
                factors.append("Age ≥65 years - significantly increases diabetes risk")
            elif age_f >= 45:
                factors.append("Age ≥45 years - moderate age-related diabetes risk")
        except Exception:
            pass

    # BMI
    bmi = input_data.get("bmi", None)
    if bmi is not None:
        try:
            bmi_f = float(bmi)
            if bmi_f >= 30:
                factors.append(f"Obesity (BMI {bmi_f}) - major risk factor for Type 2 diabetes")
            elif bmi_f >= 25:
                factors.append(f"Overweight (BMI {bmi_f}) - increases diabetes risk")
        except Exception:
            pass

    # Hypertension (accepts many truthy tokens)
    if str(input_data.get("hypertension", "")).strip().lower() in {"1", "yes", "true", "y"}:
        factors.append("Hypertension - linked to increased diabetes risk")

    # Heart disease
    if str(input_data.get("heart_disease", "")).strip().lower() in {"1", "yes", "true", "y"}:
        factors.append("Heart disease - common comorbidity with diabetes")

    # Smoking
    smoking = input_data.get("smoking_history", None)
    if smoking is not None:
        s = str(smoking).strip().lower()
        if s in {"current", "2", "yes", "y", "true"}:
            factors.append("Current smoking - increases diabetes and cardiovascular risk")
        elif s in {"former", "1"}:
            factors.append("Former smoker - residual increased risk")

    # Fasting blood glucose
    glucose = input_data.get("blood_glucose_level", None)
    if glucose is not None:
        try:
            g = float(glucose)
            if g >= 126:
                factors.append(f"Fasting glucose {g} mg/dL - meets diabetes diagnostic threshold")
            elif g >= 100:
                factors.append(f"Fasting glucose {g} mg/dL - prediabetic range")
        except Exception:
            pass

    # HbA1c (support both 'hba1c_level' and 'HbA1c_level')
    hba1c = input_data.get("hba1c_level", None) or input_data.get("HbA1c_level", None)
    if hba1c is not None:
        try:
            h = float(hba1c)
            if h >= 6.5:
                factors.append(f"HbA1c {h}% - meets diabetes diagnostic threshold")
            elif h >= 5.7:
                factors.append(f"HbA1c {h}% - prediabetic range")
        except Exception:
            pass

    # Probability-based factor
    if probability > 0.7:
        factors.append(f"Model prediction: {round(probability * 100)}% probability of diabetes")

    return factors if factors else ["Moderate baseline diabetes risk"]


def generate_recommendations(input_data: dict, risk_level: str) -> list:
    """Generate actionable recommendations based on risk level and factors."""
    recommendations = []
    recommendations.append("Schedule a consultation with an endocrinologist or your primary care physician")

    if risk_level == "High":
        recommendations.append("Get a comprehensive metabolic panel and repeat HbA1c test")
        recommendations.append("Implement intensive lifestyle modifications immediately")

    # BMI target
    bmi = input_data.get("bmi", None)
    try:
        if bmi is not None and float(bmi) >= 25:
            recommendations.append(f"Aim for gradual weight loss - target BMI below 25 (currently {bmi})")
    except Exception:
        pass

    # Lifestyle
    recommendations.append("Exercise at least 150 minutes per week (moderate-intensity aerobic activity)")
    recommendations.append("Follow a balanced diet low in refined carbohydrates and added sugars")
    recommendations.append("Increase fiber intake through whole grains, vegetables, and legumes")

    # Smoking
    if str(input_data.get("smoking_history", "")).strip().lower() in {"current", "2", "ever", "3", "yes", "y"}:
        recommendations.append("Quit smoking or seek smoking cessation support")

    # Hypertension
    if str(input_data.get("hypertension", "")).strip().lower() in {"1", "yes", "true", "y"}:
        recommendations.append("Monitor and manage blood pressure; follow prescribed medications")

    # Glucose monitoring
    glucose = input_data.get("blood_glucose_level", None)
    if glucose is not None:
        try:
            if float(glucose) >= 100:
                recommendations.append("Monitor fasting blood glucose regularly and track trends")
        except Exception:
            pass

    # General wellbeing
    recommendations.append("Manage stress through meditation, yoga, or counseling")
    recommendations.append("Ensure 7-9 hours of quality sleep per night")
    recommendations.append("Retest in 3-6 months to track progress")

    return recommendations


def _safe_get(metadata: dict, keys, default=None):
    """Return first existing key from keys (list/tuple) in metadata; else default."""
    if isinstance(keys, (list, tuple)):
        for k in keys:
            if k in metadata:
                return metadata[k]
    else:
        return metadata.get(keys, default)
    return default


def predict_diabetes(input_data: dict):
    """
    Inference wrapper compatible with training pipeline.
    - Reads metadata to find the canonical feature list used at training time.
    - Builds a one-row DataFrame with those columns (np.nan for missing) so imputers/encoders work.
    - Recomputes engineered features if expected by the model.
    """
    try:
        pipeline = joblib.load(pipeline_path)
        metadata = joblib.load(metadata_path)

        # Prefer original feature names; fall back to processed/selected if necessary.
        original_feature_names = _safe_get(
            metadata,
            ["original_feature_names", "original_features", "feature_names"],
            None
        )
        if original_feature_names is None:
            original_feature_names = _safe_get(
                metadata,
                ["processed_feature_names", "selected_feature_names", "selected_features"],
                None
            )

        if not original_feature_names:
            raise RuntimeError(
                "Metadata does not contain usable feature name list "
                "(original_feature_names or processed_feature_names/selected_feature_names)."
            )

        # Normalize input keys to lowercase to match canonical columns
        input_low = {str(k).lower(): v for k, v in input_data.items()}

        # Create base row with np.nan so imputers can operate correctly
        row = {}
        for col in original_feature_names:
            row[col] = input_low.get(col.lower(), np.nan)

        # --- Engineered features reproduced as in training ---
        # 1) bmi_age = bmi * age
        if "bmi_age" in original_feature_names:
            try:
                bmi_v = float(input_low.get("bmi", np.nan))
                age_v = float(input_low.get("age", np.nan))
                row["bmi_age"] = bmi_v * age_v
            except Exception:
                row["bmi_age"] = np.nan

        # 2) bp_bmi = hypertension_numeric * bmi
        if "bp_bmi" in original_feature_names:
            try:
                hyp = input_low.get("hypertension", np.nan)
                if isinstance(hyp, str):
                    hyp_l = hyp.strip().lower()
                    if hyp_l in {"y", "yes", "true", "1"}:
                        hyp = 1.0
                    elif hyp_l in {"n", "no", "false", "0"}:
                        hyp = 0.0
                hyp_f = float(hyp)
                bmi_f = float(input_low.get("bmi", np.nan))
                row["bp_bmi"] = hyp_f * bmi_f
            except Exception:
                row["bp_bmi"] = np.nan

        # 3) heart_smoke = f"{heart_disease}_{smoking_history}"   (categorical concat)
        if "heart_smoke" in original_feature_names:
            hd = input_low.get("heart_disease", "")
            sh = input_low.get("smoking_history", "")
            row["heart_smoke"] = f"{hd}_{sh}"

        # Build DataFrame in the exact column order expected by the pipeline
        df = pd.DataFrame([row], columns=original_feature_names)

        # Predict probabilities with the pipeline (preprocessor -> selector -> model)
        proba = float(pipeline.predict_proba(df)[:, 1][0])

        # Threshold from metadata (fallback 0.5)
        try:
            best_threshold = float(metadata.get("best_threshold", 0.5))
        except Exception:
            best_threshold = 0.5

        prediction = int(proba > best_threshold)

        # Human-readable risk level
        if prediction == 1:
            risk_level = "High"
        elif proba >= 0.5:
            risk_level = "Moderate"
        else:
            risk_level = "Low"

        # Explanatory bits
        risk_factors = generate_risk_factors(input_low, proba)
        recommendations = generate_recommendations(input_low, risk_level)

        return {
            "diabetes_probability": round(proba, 4),
            "diabetes_prediction": prediction,
            "threshold_used": round(best_threshold, 4),
            "confidence": round(proba * 100, 2),
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            # Helpful if you want to surface which features the trained model ultimately used
            "selected_features": metadata.get("selected_feature_names", metadata.get("selected_features", [])),
            "success": True,
        }

    except Exception as e:
        tb = traceback.format_exc()
        print("Exception in predict_diabetes:", tb)
        return {
            "error": str(e),
            "traceback": tb,
            "success": False,
        }
