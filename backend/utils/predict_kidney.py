# backend/utils/predict_kidney.py
"""
Kidney Phase 6 PyTorch FT-Transformer integration.

Expected local model folder, not committed to Git:
    backend/ml_models/kidney_phase6/
        best_model_phase6.pt
        best_model_phase6_config.json
        encoding_maps.json
        feature_info.json
        imputer.joblib
        scaler.joblib
        metadata.json

The FastAPI route in app.py can stay the same:
    from utils.predict_kidney import predict_kidney_disease
"""

from __future__ import annotations

import json
import logging
import math
import os
import traceback
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import joblib
import numpy as np
import torch
import torch.nn as nn

logger = logging.getLogger(__name__)


# -----------------------------
# Model architecture
# -----------------------------

class FeatureTokenizer(nn.Module):
    """Turns each scalar feature into a learnable token."""

    def __init__(self, input_dim: int, d_token: int):
        super().__init__()
        self.weight = nn.Parameter(torch.empty(input_dim, d_token))
        self.bias = nn.Parameter(torch.empty(input_dim, d_token))
        nn.init.xavier_uniform_(self.weight)
        nn.init.zeros_(self.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [batch, input_dim] -> [batch, input_dim, d_token]
        return x.unsqueeze(-1) * self.weight.unsqueeze(0) + self.bias.unsqueeze(0)


class ModelB_FTTransformer(nn.Module):
    """Architecture used by best_model_phase6.pt."""

    def __init__(
        self,
        input_dim: int = 46,
        d_token: int = 64,
        n_heads: int = 4,
        n_layers: int = 3,
        dim_ff: int = 256,
        dropout: float = 0.1,
        attn_dropout: float = 0.1,  # kept for config compatibility; dropout is disabled in eval mode
        activation: str = "gelu",
    ):
        super().__init__()
        self.tokeniser = FeatureTokenizer(input_dim, d_token)
        self.cls_token = nn.Parameter(torch.zeros(1, 1, d_token))

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_token,
            nhead=n_heads,
            dim_feedforward=dim_ff,
            dropout=dropout,
            activation=activation,
            batch_first=True,
            norm_first=False,
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)
        self.norm = nn.LayerNorm(d_token)
        self.classifier = nn.Sequential(
            nn.Linear(d_token, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        tokens = self.tokeniser(x)
        cls = self.cls_token.expand(x.size(0), -1, -1)
        tokens = torch.cat([cls, tokens], dim=1)
        encoded = self.transformer(tokens)
        cls_out = self.norm(encoded[:, 0])
        return self.classifier(cls_out).squeeze(-1)


# -----------------------------
# Globals / cache
# -----------------------------

_ARTIFACTS: Optional[Dict[str, Any]] = None

# Names accepted from frontend/Pydantic -> model feature names
ALIASES = {
    # numeric UCI short names
    "bp": "blood_pressure",
    "bloodpressure": "blood_pressure",
    "blood_pressure": "blood_pressure",
    "sg": "specific_gravity",
    "specificgravity": "specific_gravity",
    "specific_gravity": "specific_gravity",
    "al": "albumin",
    "albumin": "albumin",
    "su": "sugar",
    "sugar": "sugar",
    "bgr": "blood_glucose_random",
    "bloodglucoserandom": "blood_glucose_random",
    "blood_glucose_random": "blood_glucose_random",
    "bu": "blood_urea",
    "bloodurea": "blood_urea",
    "blood_urea": "blood_urea",
    "sc": "serum_creatinine",
    "serumcreatinine": "serum_creatinine",
    "serum_creatinine": "serum_creatinine",
    "sod": "sodium",
    "sodium": "sodium",
    "pot": "potassium",
    "potassium": "potassium",
    "hemo": "haemoglobin",
    "hemoglobin": "haemoglobin",
    "haemoglobin": "haemoglobin",
    "pcv": "packed_cell_volume",
    "packedcellvolume": "packed_cell_volume",
    "packed_cell_volume": "packed_cell_volume",
    "wc": "white_blood_cell_count",
    "wbcc": "white_blood_cell_count",
    "whitebloodcellcount": "white_blood_cell_count",
    "white_blood_cell_count": "white_blood_cell_count",
    "rc": "red_blood_cell_count",
    "rbcc": "red_blood_cell_count",
    "redbloodcellcount": "red_blood_cell_count",
    "red_blood_cell_count": "red_blood_cell_count",
    "age": "age",
    "egfr": "egfr",

    # categorical UCI fields
    "rbc": "rbc",
    "red_blood_cells": "rbc",
    "redbloodcells": "rbc",
    "pc": "pus_cell",
    "pus_cell": "pus_cell",
    "puscell": "pus_cell",
    "pcc": "pus_cell_clumps",
    "pus_cell_clumps": "pus_cell_clumps",
    "puscellclumps": "pus_cell_clumps",
    "ba": "bacteria",
    "bacteria": "bacteria",
    "htn": "hypertension",
    "hypertension": "hypertension",
    "dm": "diabetes_mellitus",
    "diabetes": "diabetes_mellitus",
    "diabetes_mellitus": "diabetes_mellitus",
    "cad": "coronary_artery_disease",
    "coronaryarterydisease": "coronary_artery_disease",
    "coronary_artery_disease": "coronary_artery_disease",
    "appet": "appetite",
    "appetite": "appetite",
    "pe": "pedal_edema",
    "edema": "pedal_edema",
    "pedal_edema": "pedal_edema",
    "pedaledema": "pedal_edema",
    "ane": "anaemia",
    "anemia": "anaemia",
    "anaemia": "anaemia",

    # source feature
    "source": "source_enc",
    "source_enc": "source_enc",
}


# -----------------------------
# Loading helpers
# -----------------------------

def _model_dir() -> Path:
    """Resolve model folder. Default is backend/ml_models/kidney_phase6."""
    here = Path(__file__).resolve()
    backend_dir = here.parents[1]
    default_dir = backend_dir / "ml_models" / "kidney_phase6"
    return Path(os.getenv("CKD_MODEL_DIR", str(default_dir))).resolve()


def _read_json(path: Path) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_kidney_artifacts() -> Dict[str, Any]:
    global _ARTIFACTS
    if _ARTIFACTS is not None:
        return _ARTIFACTS

    folder = _model_dir()
    required = [
        "best_model_phase6.pt",
        "best_model_phase6_config.json",
        "encoding_maps.json",
        "feature_info.json",
        "imputer.joblib",
        "scaler.joblib",
    ]
    missing = [name for name in required if not (folder / name).exists()]
    if missing:
        raise FileNotFoundError(
            f"Kidney model files are missing in {folder}. Missing: {', '.join(missing)}"
        )

    config = _read_json(folder / "best_model_phase6_config.json")
    encoding_maps = _read_json(folder / "encoding_maps.json")
    feature_info = _read_json(folder / "feature_info.json")

    model_kwargs = dict(config.get("model_kwargs", {}))
    # Safety fallback if config is incomplete
    model_kwargs.setdefault("input_dim", int(config.get("input_dim", 46)))
    model = ModelB_FTTransformer(**model_kwargs)

    state = torch.load(folder / "best_model_phase6.pt", map_location="cpu")
    model.load_state_dict(state, strict=True)
    model.eval()

    imputer = joblib.load(folder / "imputer.joblib")
    scaler = joblib.load(folder / "scaler.joblib")

    _ARTIFACTS = {
        "folder": folder,
        "model": model,
        "imputer": imputer,
        "scaler": scaler,
        "config": config,
        "encoding_maps": encoding_maps,
        "feature_info": feature_info,
        "threshold": float(config.get("selected_threshold", 0.5)),
    }
    logger.info("✅ Kidney Phase 6 model loaded from %s", folder)
    return _ARTIFACTS


# -----------------------------
# Feature engineering
# -----------------------------

def _norm_key(key: Any) -> str:
    return str(key).strip().replace(" ", "_").replace("-", "_").lower()


def _is_missing(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    try:
        return bool(np.isnan(value))
    except Exception:
        return False


def _safe_float(value: Any) -> float:
    if _is_missing(value):
        return np.nan
    try:
        return float(value)
    except Exception:
        return np.nan


def _canonicalise_input(input_data: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for key, value in input_data.items():
        nk = _norm_key(key)
        target = ALIASES.get(nk)
        if target:
            out[target] = value
    return out


def _encode_categorical(feature: str, value: Any, binary_map: Dict[str, Dict[str, int]]) -> float:
    if _is_missing(value):
        return np.nan
    if isinstance(value, (int, float, np.integer, np.floating)):
        return float(value)

    text = str(value).strip().lower()
    fmap = binary_map.get(feature, {})
    if text in fmap:
        return float(fmap[text])

    # Friendly fallbacks
    yes_no = {"yes": 1.0, "no": 0.0, "true": 1.0, "false": 0.0, "present": 1.0, "notpresent": 0.0}
    if text in yes_no:
        return yes_no[text]

    return np.nan


def _compute_egfr(canonical: Dict[str, Any]) -> float:
    existing = canonical.get("egfr")
    if not _is_missing(existing):
        return _safe_float(existing)

    age = max(_safe_float(canonical.get("age")), 1.0)
    scr = max(_safe_float(canonical.get("serum_creatinine")), 0.1)
    if math.isnan(age) or math.isnan(scr):
        return np.nan

    # Formula provided in metadata.json
    return float(175 * (scr ** -1.154) * (age ** -0.203))


def build_kidney_feature_array(input_data: Dict[str, Any], artifacts: Dict[str, Any]) -> np.ndarray:
    feature_info = artifacts["feature_info"]
    encoding_maps = artifacts["encoding_maps"]
    binary_map = encoding_maps.get("uci_binary_map", {})

    base_features = feature_info["feature_names_25"]
    miss_features = feature_info["miss_indicator_names"]
    all_features = feature_info["all_feature_names_with_source"]

    categorical_features = set(binary_map.keys())
    canonical = _canonicalise_input(input_data)
    canonical["egfr"] = _compute_egfr(canonical)

    values: Dict[str, float] = {}

    for feature in base_features:
        raw = canonical.get(feature, np.nan)
        if feature in categorical_features:
            values[feature] = _encode_categorical(feature, raw, binary_map)
        else:
            values[feature] = _safe_float(raw)

    for miss_name in miss_features:
        original_feature = miss_name.replace("miss_", "", 1)
        values[miss_name] = 1.0 if _is_missing(values.get(original_feature, np.nan)) else 0.0

    source_value = canonical.get("source_enc", 0)
    if isinstance(source_value, str):
        values["source_enc"] = float(feature_info.get("source_map", {}).get(source_value.lower(), 0))
    else:
        values["source_enc"] = _safe_float(source_value)
        if math.isnan(values["source_enc"]):
            values["source_enc"] = 0.0

    row = [values.get(name, np.nan) for name in all_features]
    X = np.asarray([row], dtype=np.float32)

    expected_n = int(getattr(artifacts["imputer"], "n_features_in_", X.shape[1]))
    if X.shape[1] != expected_n:
        raise ValueError(f"Feature count mismatch. Built {X.shape[1]} features, expected {expected_n}.")

    return X



def _impute_and_scale(X_raw: np.ndarray, imputer: Any, scaler: Any) -> np.ndarray:
    """
    Version-safe inference preprocessing.

    The uploaded imputer/scaler were saved with a specific scikit-learn version.
    Calling .transform() can fail if another version is installed, so we use the
    learned statistics directly: median imputation, then standard scaling.
    """
    X = np.asarray(X_raw, dtype=np.float32).copy()

    statistics = np.asarray(getattr(imputer, "statistics_"), dtype=np.float32)
    if statistics.shape[0] != X.shape[1]:
        raise ValueError(f"Imputer expects {statistics.shape[0]} features, got {X.shape[1]}.")

    missing_mask = np.isnan(X)
    if missing_mask.any():
        _, cols = np.where(missing_mask)
        X[missing_mask] = statistics[cols]

    mean = np.asarray(getattr(scaler, "mean_"), dtype=np.float32)
    scale = np.asarray(getattr(scaler, "scale_"), dtype=np.float32)
    if mean.shape[0] != X.shape[1] or scale.shape[0] != X.shape[1]:
        raise ValueError("Scaler feature count does not match the model feature count.")

    scale = np.where(scale == 0, 1.0, scale)
    return ((X - mean) / scale).astype(np.float32)

# -----------------------------
# Public prediction function
# -----------------------------

def predict_kidney_disease(input_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        artifacts = load_kidney_artifacts()
        model: nn.Module = artifacts["model"]
        imputer = artifacts["imputer"]
        scaler = artifacts["scaler"]
        threshold = artifacts["threshold"]

        X_raw = build_kidney_feature_array(input_data, artifacts)
        X_scaled = _impute_and_scale(X_raw, imputer, scaler)

        with torch.no_grad():
            x_tensor = torch.tensor(X_scaled, dtype=torch.float32)
            logit = model(x_tensor)
            probability_ckd = float(torch.sigmoid(logit).item())

        prediction = int(probability_ckd >= threshold)
        has_ckd = bool(prediction == 1)
        probability_no_ckd = 1.0 - probability_ckd
        confidence = probability_ckd if has_ckd else probability_no_ckd

        return {
            "success": True,
            "type": "kidney",
            "model_name": "B_Focal Phase 6 FT-Transformer",
            "prediction": prediction,
            "has_kidney_disease": has_ckd,
            "disease": "Chronic Kidney Disease" if has_ckd else "No Chronic Kidney Disease",
            "risk_level": "High" if has_ckd else ("Moderate" if probability_ckd >= 0.25 else "Low"),
            "confidence": round(confidence, 4),
            "probability_ckd": round(probability_ckd, 4),
            "probability_no_ckd": round(probability_no_ckd, 4),
            "selected_threshold": threshold,
            "all_probabilities": {
                "CKD": round(probability_ckd, 4),
                "Non-CKD": round(probability_no_ckd, 4),
            },
            "diagnosis": get_kidney_diagnosis(has_ckd, confidence),
            "recommendations": generate_kidney_recommendations(has_ckd, input_data),
            "notes": "AI-assisted screening only. This is not a medical diagnosis.",
        }

    except FileNotFoundError as e:
        logger.error("Kidney model file error: %s", e)
        return {"success": False, "error": str(e), "prediction": None, "confidence": 0}
    except Exception as e:
        logger.error("Kidney prediction error: %s", e)
        logger.error(traceback.format_exc())
        return {"success": False, "error": str(e), "prediction": None, "confidence": 0}


def generate_kidney_recommendations(has_ckd: bool, input_data: Dict[str, Any]) -> list[str]:
    if has_ckd:
        return [
            "Book a medical review with a nephrologist or qualified physician.",
            "Check kidney function labs such as creatinine, eGFR, and urine protein/albumin.",
            "Monitor blood pressure and blood glucose regularly.",
            "Avoid taking NSAIDs or nephrotoxic medicines without medical advice.",
            "Follow a kidney-friendly diet plan only after consulting a clinician or dietitian.",
        ]
    return [
        "Maintain regular blood pressure and blood glucose screening.",
        "Stay hydrated unless your doctor advised fluid restriction.",
        "Maintain a balanced diet and healthy body weight.",
        "Avoid unnecessary NSAID use and self-medication.",
        "Repeat kidney screening if symptoms or risk factors appear.",
    ]


def get_kidney_diagnosis(has_ckd: bool, confidence: float) -> str:
    if has_ckd:
        if confidence >= 0.85:
            return "High model probability of CKD. Medical evaluation is strongly recommended."
        return "Possible CKD risk detected. Further clinical testing is recommended."

    if confidence >= 0.85:
        return "Low model probability of CKD based on the entered data."
    return "Uncertain/low-to-moderate risk. Consider clinical follow-up if symptoms or risk factors exist."
