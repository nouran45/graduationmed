from pathlib import Path
from typing import Any, Dict, List, Tuple
import json
import traceback

import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn


# ============================================================
# Paths
# ============================================================
BASE_DIR = Path(__file__).resolve().parents[1]

# We use the clean folder name.
# Final path: backend/diabetes_model/
MODEL_DIR = BASE_DIR / "diabetes_model"

MODEL_PATH = MODEL_DIR / "nami_model.pt"
PREPROCESSOR_PATH = MODEL_DIR / "preprocessor.joblib"
FEATURES_PATH = MODEL_DIR / "features.json"
INTERACTION_PAIRS_PATH = MODEL_DIR / "interaction_pairs.json"
MODEL_CONFIG_PATH = MODEL_DIR / "model_config.json"
CALIBRATOR_PATH = MODEL_DIR / "calibrator_isotonic.joblib"
THRESHOLD_CONFIG_PATH = MODEL_DIR / "threshold_config.json"


# ============================================================
# Cache loaded artifacts so they are not reloaded every request
# ============================================================
_model = None
_preprocessor = None
_calibrator = None
_features = None
_interaction_pairs = None
_threshold_config = None


class NAMIBlock(nn.Module):
    def __init__(self, in_dim: int, hidden: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden),
            nn.ReLU(),
            nn.Linear(hidden, hidden),
            nn.ReLU(),
            nn.Linear(hidden, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class CenteredNAMI(nn.Module):
    def __init__(
        self,
        n_features: int,
        interaction_pairs: List[Tuple[int, int]],
        nami_hidden: int = 16,
    ):
        super().__init__()

        self.n_features = n_features
        self.interaction_pairs = interaction_pairs

        # Must match Kaggle checkpoint keys:
        # feature_nets.0.net.0.weight, feature_nets.0.net.2.weight, feature_nets.0.net.4.weight
        self.feature_nets = nn.ModuleList(
            [NAMIBlock(1, nami_hidden) for _ in range(n_features)]
        )

        # Must match Kaggle checkpoint keys:
        # interaction_nets.0.net.0.weight, interaction_nets.0.net.2.weight, interaction_nets.0.net.4.weight
        self.interaction_nets = nn.ModuleList(
            [NAMIBlock(2, nami_hidden) for _ in interaction_pairs]
        )

        self.bias = nn.Parameter(torch.zeros(1))

        # These must exist because your checkpoint contains:
        # feature_means
        # interaction_means
        self.register_buffer("feature_means", torch.zeros(n_features))
        self.register_buffer("interaction_means", torch.zeros(len(interaction_pairs)))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        x shape: [batch_size, n_features]
        output shape: [batch_size]
        """

        out = self.bias.expand(x.shape[0])

        # Feature/main effects
        for i, net in enumerate(self.feature_nets):
            xi = x[:, i:i + 1]
            feature_effect = net(xi).squeeze(-1)
            feature_effect = feature_effect - self.feature_means[i]
            out = out + feature_effect

        # Pairwise interaction effects
        for pair_idx, (i, j) in enumerate(self.interaction_pairs):
            xij = x[:, [i, j]]
            interaction_effect = self.interaction_nets[pair_idx](xij).squeeze(-1)
            interaction_effect = interaction_effect - self.interaction_means[pair_idx]
            out = out + interaction_effect

        return out
# ============================================================
# Helpers
# ============================================================
def _load_json(path: Path) -> Any:
    if not path.exists():
        raise FileNotFoundError(f"Required JSON file not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _safe_torch_load(path: Path):
    try:
        return torch.load(path, map_location="cpu", weights_only=True)
    except TypeError:
        # For older PyTorch versions that do not support weights_only
        return torch.load(path, map_location="cpu")


def _normalize_key(key: str) -> str:
    return str(key).strip().lower().replace(" ", "_")


def _truthy_to_number(value: Any) -> Any:
    if isinstance(value, str):
        v = value.strip().lower()
        if v in {"1", "yes", "y", "true"}:
            return 1
        if v in {"0", "no", "n", "false"}:
            return 0
    return value


def _categorical_to_number(feature_name: str, value: Any) -> Any:
    """
    This handles common raw frontend values if the model expects numeric input.
    It will not harm already-numeric values.
    """

    if value is None:
        return np.nan

    if isinstance(value, (int, float, np.integer, np.floating)):
        return value

    v = str(value).strip().lower()
    f = feature_name.lower()

    # Common gender mapping
    if "gender" in f:
        if v in {"female", "f", "woman"}:
            return 0
        if v in {"male", "m", "man"}:
            return 1
        if v in {"other", "unknown"}:
            return 2

    # Common smoking mapping
    if "smoking" in f or "smoke" in f:
        smoking_map = {
            "never": 0,
            "no info": 0,
            "none": 0,
            "not current": 1,
            "former": 2,
            "ever": 3,
            "current": 4,
            "yes": 4,
            "no": 0,
        }
        if v in smoking_map:
            return smoking_map[v]

    # Boolean values
    bool_val = _truthy_to_number(v)
    if isinstance(bool_val, int):
        return bool_val

    # Numeric string
    try:
        return float(v)
    except Exception:
        return value


def _get_input_value(input_data: Dict[str, Any], feature_name: str) -> Any:
    """
    Gets a feature from user input in a flexible way:
    - exact name
    - lowercase name
    - HbA1c aliases
    - one-hot categorical support
    """

    normalized_input = {
        _normalize_key(k): v for k, v in input_data.items()
    }

    f_norm = _normalize_key(feature_name)

    # Exact/case-insensitive match
    if f_norm in normalized_input:
        return normalized_input[f_norm]

    # HbA1c aliases
    hba1c_aliases = {
        "hba1c_level",
        "hba1c",
        "hba1clevel",
        "hb_a1c_level",
    }
    if f_norm in hba1c_aliases:
        for alias in hba1c_aliases:
            if alias in normalized_input:
                return normalized_input[alias]

    # Blood glucose aliases
    glucose_aliases = {
        "blood_glucose_level",
        "glucose",
        "fasting_glucose",
        "blood_sugar",
    }
    if f_norm in glucose_aliases:
        for alias in glucose_aliases:
            if alias in normalized_input:
                return normalized_input[alias]

    # One-hot support, e.g. gender_Male or smoking_history_current
    if f_norm.startswith("gender_") and "gender" in normalized_input:
        expected = f_norm.replace("gender_", "")
        actual = _normalize_key(normalized_input["gender"])
        return 1 if actual == expected else 0

    if f_norm.startswith("smoking_history_") and "smoking_history" in normalized_input:
        expected = f_norm.replace("smoking_history_", "")
        actual = _normalize_key(normalized_input["smoking_history"])
        return 1 if actual == expected else 0

    # Missing value: let sklearn imputer handle it
    return np.nan


def _build_input_dataframe(input_data: Dict[str, Any], features: List[str]) -> pd.DataFrame:
    row = {}

    for feature in features:
        value = _get_input_value(input_data, feature)
        value = _truthy_to_number(value)
        value = _categorical_to_number(feature, value)
        row[feature] = value

    return pd.DataFrame([row], columns=features)


def _load_artifacts():
    global _model, _preprocessor, _calibrator
    global _features, _interaction_pairs, _threshold_config

    if (
        _model is not None
        and _preprocessor is not None
        and _features is not None
        and _interaction_pairs is not None
        and _threshold_config is not None
    ):
        return _model, _preprocessor, _calibrator, _features, _interaction_pairs, _threshold_config

    # Required files
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model weights not found: {MODEL_PATH}")

    if not PREPROCESSOR_PATH.exists():
        raise FileNotFoundError(f"Preprocessor not found: {PREPROCESSOR_PATH}")

    features = _load_json(FEATURES_PATH)
    interaction_pairs_raw = _load_json(INTERACTION_PAIRS_PATH)
    model_config = _load_json(MODEL_CONFIG_PATH)

    if not isinstance(features, list):
        raise ValueError("features.json must contain a list of feature names.")

    interaction_pairs = [
        (int(i), int(j)) for i, j in interaction_pairs_raw
    ]

    n_features = int(model_config.get("n_features", len(features)))
    n_interactions = int(model_config.get("n_interactions", len(interaction_pairs)))
    nami_hidden = int(model_config.get("nami_hidden", 16))

    if n_features != len(features):
        raise ValueError(
            f"model_config n_features={n_features}, but features.json has {len(features)} features."
        )

    if n_interactions != len(interaction_pairs):
        raise ValueError(
            f"model_config n_interactions={n_interactions}, "
            f"but interaction_pairs.json has {len(interaction_pairs)} pairs."
        )

    preprocessor = joblib.load(PREPROCESSOR_PATH)

    model = CenteredNAMI(
        n_features=n_features,
        interaction_pairs=interaction_pairs,
        nami_hidden=nami_hidden,
    )

    state_dict = _safe_torch_load(MODEL_PATH)

    try:
        model.load_state_dict(state_dict, strict=True)
    except Exception as e:
        first_keys = list(state_dict.keys())[:30]
        raise RuntimeError(
            "Could not load nami_model.pt into the backend CenteredNAMI class. "
            "This means the backend architecture does not exactly match the Kaggle architecture. "
            "Send me the CenteredNAMI class from your Kaggle notebook.\n\n"
            f"Original error: {str(e)}\n\n"
            f"First state_dict keys: {first_keys}"
        )

    model.eval()

    # Optional isotonic calibrator
    calibrator = None
    if CALIBRATOR_PATH.exists():
        calibrator = joblib.load(CALIBRATOR_PATH)

    # Optional threshold config
    if THRESHOLD_CONFIG_PATH.exists():
        threshold_config = _load_json(THRESHOLD_CONFIG_PATH)
    else:
        threshold_config = {
            "threshold": 0.5,
            "target_state": None,
            "best_seed": None,
        }

    _model = model
    _preprocessor = preprocessor
    _calibrator = calibrator
    _features = features
    _interaction_pairs = interaction_pairs
    _threshold_config = threshold_config

    return _model, _preprocessor, _calibrator, _features, _interaction_pairs, _threshold_config


def _raw_model_probability(model: nn.Module, x_processed: np.ndarray) -> float:
    x_np = np.asarray(x_processed, dtype=np.float32)

    if x_np.ndim == 1:
        x_np = x_np.reshape(1, -1)

    x_tensor = torch.tensor(x_np, dtype=torch.float32)

    with torch.no_grad():
        output = model(x_tensor)

        if isinstance(output, tuple):
            output = output[0]

        output = output.detach().cpu()

        # Binary logit output
        if output.ndim == 1:
            prob = torch.sigmoid(output)[0].item()

        # Shape [batch, 1]
        elif output.ndim == 2 and output.shape[1] == 1:
            prob = torch.sigmoid(output)[0, 0].item()

        # Shape [batch, 2]
        elif output.ndim == 2 and output.shape[1] == 2:
            prob = torch.softmax(output, dim=1)[0, 1].item()

        else:
            prob = torch.sigmoid(output.reshape(-1)[0]).item()

    return float(np.clip(prob, 0.0, 1.0))


def _apply_calibration(raw_prob: float, calibrator: Any) -> float:
    if calibrator is None:
        return raw_prob

    calibrated = calibrator.predict(np.array([raw_prob]).reshape(-1, 1))[0]
    return float(np.clip(calibrated, 0.0, 1.0))


# ============================================================
# Human-readable output helpers
# ============================================================
def generate_risk_factors(input_data: Dict[str, Any], probability: float) -> List[str]:
    factors = []

    age = input_data.get("age")
    if age is not None:
        try:
            age_f = float(age)
            if age_f >= 65:
                factors.append("Age ≥65 years - significantly increases diabetes risk")
            elif age_f >= 45:
                factors.append("Age ≥45 years - moderate age-related diabetes risk")
        except Exception:
            pass

    bmi = input_data.get("bmi")
    if bmi is not None:
        try:
            bmi_f = float(bmi)
            if bmi_f >= 30:
                factors.append(f"Obesity (BMI {bmi_f}) - major risk factor for Type 2 diabetes")
            elif bmi_f >= 25:
                factors.append(f"Overweight (BMI {bmi_f}) - increases diabetes risk")
        except Exception:
            pass

    if str(input_data.get("hypertension", "")).strip().lower() in {"1", "yes", "true", "y"}:
        factors.append("Hypertension - linked to increased diabetes risk")

    if str(input_data.get("heart_disease", "")).strip().lower() in {"1", "yes", "true", "y"}:
        factors.append("Heart disease - common comorbidity with diabetes")

    smoking = input_data.get("smoking_history")
    if smoking is not None:
        s = str(smoking).strip().lower()
        if s in {"current", "yes", "y", "true", "4"}:
            factors.append("Current smoking - increases diabetes and cardiovascular risk")
        elif s in {"former", "ever", "2", "3"}:
            factors.append("Former/ever smoker - may indicate residual increased risk")

    glucose = (
        input_data.get("blood_glucose_level")
        or input_data.get("glucose")
        or input_data.get("fasting_glucose")
    )
    if glucose is not None:
        try:
            g = float(glucose)
            if g >= 126:
                factors.append(f"Fasting glucose {g} mg/dL - meets diabetes diagnostic threshold")
            elif g >= 100:
                factors.append(f"Fasting glucose {g} mg/dL - prediabetic range")
        except Exception:
            pass

    hba1c = (
        input_data.get("HbA1c_level")
        or input_data.get("hba1c_level")
        or input_data.get("hba1c")
    )
    if hba1c is not None:
        try:
            h = float(hba1c)
            if h >= 6.5:
                factors.append(f"HbA1c {h}% - meets diabetes diagnostic threshold")
            elif h >= 5.7:
                factors.append(f"HbA1c {h}% - prediabetic range")
        except Exception:
            pass

    if probability >= 0.7:
        factors.append(f"Model prediction: {round(probability * 100)}% probability of diabetes")

    return factors if factors else ["No major manually detected risk factor; model used full feature pattern"]


def generate_recommendations(input_data: Dict[str, Any], risk_level: str) -> List[str]:
    recommendations = [
        "Consult a physician or endocrinologist for clinical confirmation",
        "Do not rely on the AI result alone for diagnosis",
    ]

    if risk_level == "High":
        recommendations.append("Repeat fasting blood glucose and HbA1c testing")
        recommendations.append("Discuss a diabetes management or prevention plan with your doctor")
    elif risk_level == "Moderate":
        recommendations.append("Monitor glucose/HbA1c and consider follow-up testing")
    else:
        recommendations.append("Maintain routine screening, especially if risk factors are present")

    bmi = input_data.get("bmi")
    try:
        if bmi is not None and float(bmi) >= 25:
            recommendations.append(f"Aim for gradual weight reduction; current BMI is {bmi}")
    except Exception:
        pass

    recommendations.extend([
        "Exercise at least 150 minutes per week if medically suitable",
        "Reduce refined carbohydrates and added sugars",
        "Increase fibre intake through vegetables, legumes, and whole grains",
        "Maintain good sleep and stress management",
    ])

    if str(input_data.get("smoking_history", "")).strip().lower() in {"current", "yes", "y", "true", "4"}:
        recommendations.append("Seek smoking cessation support")

    if str(input_data.get("hypertension", "")).strip().lower() in {"1", "yes", "true", "y"}:
        recommendations.append("Monitor and manage blood pressure regularly")

    return recommendations


# ============================================================
# Main prediction function used by FastAPI
# ============================================================
def predict_diabetes(input_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        (
            model,
            preprocessor,
            calibrator,
            features,
            interaction_pairs,
            threshold_config,
        ) = _load_artifacts()

        df = _build_input_dataframe(input_data, features)

        x_processed = preprocessor.transform(df)

        if hasattr(x_processed, "toarray"):
            x_processed = x_processed.toarray()

        raw_probability = _raw_model_probability(model, x_processed)
        calibrated_probability = _apply_calibration(raw_probability, calibrator)

        threshold = float(threshold_config.get("threshold", 0.5))
        prediction = int(calibrated_probability >= threshold)

        if prediction == 1:
            risk_level = "High"
        elif calibrated_probability >= 0.35:
            risk_level = "Moderate"
        else:
            risk_level = "Low"

        risk_factors = generate_risk_factors(input_data, calibrated_probability)
        recommendations = generate_recommendations(input_data, risk_level)

        return {
            "success": True,
            "model": "CenteredNAMI",
            "diabetes_prediction": prediction,
            "prediction_label": "Diabetic" if prediction == 1 else "Non-diabetic",
            "diabetes_probability": round(calibrated_probability, 4),
            "raw_diabetes_probability": round(raw_probability, 4),
            "confidence": round(calibrated_probability * 100, 2),
            "threshold_used": round(threshold, 4),
            "risk_level": risk_level,
            "calibration": "isotonic" if calibrator is not None else "none",
            "target_state": threshold_config.get("target_state"),
            "best_seed": threshold_config.get("best_seed"),
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "features_used_count": len(features),
            "interactions_used_count": len(interaction_pairs),
        }

    except Exception as e:
        tb = traceback.format_exc()
        print("Exception in predict_diabetes:")
        print(tb)

        return {
            "success": False,
            "error": str(e),
            "traceback": tb,
        }


# Optional alias if another file imports predict()
def predict(input_data: Dict[str, Any]) -> Dict[str, Any]:
    return predict_diabetes(input_data)