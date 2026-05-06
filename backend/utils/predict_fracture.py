"""
utils/predict_fracture.py
Stage E bone-fracture predictor for the FastAPI backend.

Expected local model files:
    backend/fracture_stageE/stageE_effnet.keras
    backend/fracture_stageE/stageE_swint_final.pt
    backend/fracture_stageE/stageE_metadata.json

Important training convention:
    class_to_idx = {'fractured': 0, 'not fractured': 1}
    Binary sigmoid output is treated as P(not fractured).

Public function used by app.py:
    predict_fracture(image_path)
"""

from __future__ import annotations

import json
import math
import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Tuple

import numpy as np
from PIL import Image

# TensorFlow/Keras EfficientNet branch
# Note: we intentionally avoid
#     from tensorflow.keras.applications.efficientnet import preprocess_input
# because VS Code/Pylance can falsely flag that nested import.
import tensorflow as tf

# PyTorch Swin-T branch
import torch
import torchvision.transforms as T
import timm


# =============================================================================
# Paths and constants
# =============================================================================
THIS_FILE = Path(__file__).resolve()
BACKEND_DIR = THIS_FILE.parents[1]  # backend/ because this file is backend/utils/predict_fracture.py
MODEL_DIR = BACKEND_DIR / "fracture_stageE"

EFFNET_PATH = MODEL_DIR / "stageE_effnet.keras"
SWIN_PATH = MODEL_DIR / "stageE_swint_final.pt"
METADATA_PATH = MODEL_DIR / "stageE_metadata.json"

IMG_SIZE = 224
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# =============================================================================
# Metadata helpers
# =============================================================================
def _load_json(path: Path) -> Dict[str, Any]:
    """Load Stage E metadata from JSON."""
    if not path.exists():
        raise FileNotFoundError(f"Missing metadata file: {path}")

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _deep_get(d: Dict[str, Any], path: str, default: Any = None) -> Any:
    """Safely read nested dictionary values using dot notation."""
    cur: Any = d
    for key in path.split("."):
        if isinstance(cur, dict) and key in cur:
            cur = cur[key]
        else:
            return default
    return cur


def _first_existing(metadata: Dict[str, Any], keys: Tuple[str, ...], default: Any) -> Any:
    """Return the first metadata value that exists from a list of possible keys."""
    for key in keys:
        value = _deep_get(metadata, key)
        if value is not None:
            return value
    return default


def _read_deployment_values(metadata: Dict[str, Any]) -> Tuple[float, float, float, float]:
    """Return effnet_weight, swin_weight, temperature_T, decision_threshold."""
    eff_w = _first_existing(
        metadata,
        (
            "ensemble.weights.efficientnet",
            "ensemble.weights.effnet",
            "ensemble.effnet_weight",
            "inference.effnet_weight",
            "inference.ensemble_weights.efficientnetb0",
            "effnet_weight",
            "EffNet weight",
        ),
        0.5,
    )

    swin_w = _first_existing(
        metadata,
        (
            "ensemble.weights.swin",
            "ensemble.weights.swint",
            "ensemble.swin_weight",
            "inference.swin_weight",
            "inference.ensemble_weights.swint",
            "swin_weight",
            "Swin-T weight",
        ),
        1.0 - float(eff_w),
    )

    temp = _first_existing(
        metadata,
        (
            "calibration.temperature",
            "calibration.T",
            "temperature.T",
            "temperature_T",
            "inference.temperature_scaling.T",
            "Temperature T",
        ),
        0.5,
    )

    threshold = _first_existing(
        metadata,
        (
            "threshold",
            "decision_threshold",
            "classification_threshold",
            "inference.threshold",
            "inference.classification_threshold",
        ),
        0.5,
    )

    eff_w = float(eff_w)
    swin_w = float(swin_w)

    # Normalize weights to avoid accidental non-summing metadata.
    total = eff_w + swin_w
    if total <= 0:
        eff_w, swin_w = 0.5, 0.5
    else:
        eff_w, swin_w = eff_w / total, swin_w / total

    temp = float(temp)
    if temp <= 0:
        temp = 1.0

    threshold = float(threshold)
    return eff_w, swin_w, temp, threshold


# =============================================================================
# Probability helpers
# =============================================================================
def _sigmoid(x: float) -> float:
    """Numerically stable sigmoid for a scalar logit."""
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def _logit(p: float) -> float:
    """Convert probability to logit with clipping for safety."""
    p = float(np.clip(p, 1e-7, 1.0 - 1e-7))
    return math.log(p / (1.0 - p))


def _temperature_scale_probability(p_not_fractured: float, temperature: float) -> float:
    """Apply temperature scaling to P(not fractured)."""
    return _sigmoid(_logit(p_not_fractured) / temperature)


def _tier_from_p_fracture(p_fracture: float) -> Tuple[str, str, bool]:
    """Return tier_name, clinical_action, needs_radiologist_review."""
    if p_fracture >= 0.90:
        return "T5 — High Confidence Fracture", "Immediate radiology/orthopedic review", True
    if p_fracture >= 0.65:
        return "T4 — Suspected Fracture", "Radiologist confirmation recommended", True
    if p_fracture >= 0.35:
        return "T3 — Uncertain — Review Needed", "Mandatory review; do not discharge based only on AI", True
    if p_fracture >= 0.10:
        return "T2 — Likely Normal", "Standard follow-up if symptomatic", False
    return "T1 — High Confidence Normal", "Routine discharge only if clinical exam agrees", False


# =============================================================================
# Model loading
# =============================================================================
def _load_effnet_model() -> tf.keras.Model:
    """Load the Keras EfficientNetB0 branch."""
    if not EFFNET_PATH.exists():
        raise FileNotFoundError(f"Missing EfficientNet model: {EFFNET_PATH}")

    # compile=False avoids needing the training focal-loss object during inference.
    return tf.keras.models.load_model(EFFNET_PATH, compile=False)


def _clean_state_dict(checkpoint: Any) -> Dict[str, torch.Tensor]:
    """Support both raw state_dict and checkpoint dictionaries."""
    if isinstance(checkpoint, dict):
        for key in ("model_state_dict", "state_dict", "model", "net"):
            if key in checkpoint and isinstance(checkpoint[key], dict):
                checkpoint = checkpoint[key]
                break

    if not isinstance(checkpoint, dict):
        raise TypeError("Swin checkpoint is not a state_dict or checkpoint dictionary.")

    cleaned: Dict[str, torch.Tensor] = {}
    for key, value in checkpoint.items():
        new_key = key
        for prefix in ("module.", "model."):
            if new_key.startswith(prefix):
                new_key = new_key[len(prefix):]
        cleaned[new_key] = value

    return cleaned


def _load_swin_model() -> torch.nn.Module:
    """Load the PyTorch Swin-Tiny branch."""
    if not SWIN_PATH.exists():
        raise FileNotFoundError(f"Missing Swin-T weights: {SWIN_PATH}")

    model = timm.create_model(
        "swin_tiny_patch4_window7_224",
        pretrained=False,
        num_classes=1,
    )

    checkpoint = torch.load(SWIN_PATH, map_location=DEVICE)
    state_dict = _clean_state_dict(checkpoint)

    try:
        model.load_state_dict(state_dict, strict=True)
    except RuntimeError as exc:
        raise RuntimeError(
            "Could not load stageE_swint_final.pt into timm "
            "'swin_tiny_patch4_window7_224' with num_classes=1. "
            "Check that the timm version and architecture match the training notebook. "
            f"Original error: {exc}"
        ) from exc

    model.to(DEVICE)
    model.eval()
    return model


@lru_cache(maxsize=1)
def _get_stagee_bundle() -> Tuple[Dict[str, Any], tf.keras.Model, torch.nn.Module, float, float, float, float]:
    """
    Lazy-load metadata and models once.

    This keeps backend startup safer: app.py can import predict_fracture, and the heavy
    model loading happens only when the fracture endpoint is first called.
    """
    metadata = _load_json(METADATA_PATH)
    eff_w, swin_w, temp_t, threshold = _read_deployment_values(metadata)
    effnet_model = _load_effnet_model()
    swin_model = _load_swin_model()

    print("✅ Stage E fracture ensemble loaded")
    print(f"   EfficientNet path  : {EFFNET_PATH}")
    print(f"   Swin-T path        : {SWIN_PATH}")
    print(f"   Metadata path      : {METADATA_PATH}")
    print(f"   EfficientNet weight: {eff_w:.3f}")
    print(f"   Swin-T weight      : {swin_w:.3f}")
    print(f"   Temperature T      : {temp_t:.3f}")
    print(f"   Threshold          : {threshold:.3f}")
    print(f"   Device             : {DEVICE}")

    return metadata, effnet_model, swin_model, eff_w, swin_w, temp_t, threshold


# =============================================================================
# Preprocessing
# =============================================================================
def _load_rgb_image(image_path: str) -> Image.Image:
    """Load any valid image as RGB."""
    return Image.open(image_path).convert("RGB")


def _preprocess_effnet(image: Image.Image) -> np.ndarray:
    """Preprocess image for the EfficientNetB0 Keras branch."""
    img = image.resize((IMG_SIZE, IMG_SIZE), Image.LANCZOS)
    arr = np.asarray(img, dtype=np.float32)
    arr = np.expand_dims(arr, axis=0)

    # Use TensorFlow namespace directly to avoid Pylance nested-import warning.
    return tf.keras.applications.efficientnet.preprocess_input(arr)


_SWIN_TRANSFORM = T.Compose(
    [
        T.Resize((IMG_SIZE, IMG_SIZE)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)


def _preprocess_swin(image: Image.Image) -> torch.Tensor:
    """Preprocess image for the Swin-Tiny PyTorch branch."""
    return _SWIN_TRANSFORM(image).unsqueeze(0).to(DEVICE)


# =============================================================================
# Branch inference
# =============================================================================
def _predict_effnet_p_not_fractured(effnet_model: tf.keras.Model, image: Image.Image) -> float:
    """Run EfficientNetB0 branch and return P(not fractured)."""
    x = _preprocess_effnet(image)
    pred = effnet_model.predict(x, verbose=0)
    return float(np.asarray(pred).reshape(-1)[0])


def _predict_swin_p_not_fractured(swin_model: torch.nn.Module, image: Image.Image) -> float:
    """Run Swin-Tiny branch and return P(not fractured)."""
    x = _preprocess_swin(image)
    with torch.no_grad():
        logits = swin_model(x).squeeze().detach().cpu().item()
    return float(_sigmoid(logits))


# =============================================================================
# Public API used by app.py
# =============================================================================
def predict_fracture(image_path: str) -> Dict[str, Any]:
    """
    Predict fracture from an X-ray image using the Stage E late-fusion ensemble.

    Returns a dictionary compatible with the existing FastAPI /predict-fracture route.
    Confidence and probabilities are returned as decimals between 0 and 1.
    """
    try:
        valid_extensions = {".jpg", ".jpeg", ".png"}
        file_ext = os.path.splitext(image_path)[1].lower()

        if file_ext not in valid_extensions:
            return {
                "success": False,
                "error": f"Invalid file format. Supported formats: {', '.join(sorted(valid_extensions))}",
            }

        (
            metadata,
            effnet_model,
            swin_model,
            eff_w,
            swin_w,
            temp_t,
            threshold,
        ) = _get_stagee_bundle()

        image = _load_rgb_image(image_path)

        # Both branches output P(not fractured), matching class_to_idx {'fractured': 0, 'not fractured': 1}.
        eff_p_not = _predict_effnet_p_not_fractured(effnet_model, image)
        swin_p_not = _predict_swin_p_not_fractured(swin_model, image)

        raw_ensemble_p_not = (eff_w * eff_p_not) + (swin_w * swin_p_not)
        calibrated_p_not = _temperature_scale_probability(raw_ensemble_p_not, temp_t)

        p_not_fractured = float(np.clip(calibrated_p_not, 0.0, 1.0))
        p_fracture = float(1.0 - p_not_fractured)

        # Label convention follows training folder mapping: 0=fractured, 1=not fractured.
        predicted_label = 1 if p_not_fractured >= threshold else 0
        diagnosis = "No Fracture" if predicted_label == 1 else "Fracture"
        confidence = p_not_fractured if predicted_label == 1 else p_fracture

        tier, clinical_action, needs_review = _tier_from_p_fracture(p_fracture)

        if diagnosis == "Fracture":
            severity = "High" if p_fracture >= 0.65 else "Moderate"
            treatment = (
                "Fracture suspected by the AI model. Arrange radiology/orthopedic review. "
                "Avoid moving the affected area until assessed by a qualified clinician."
            )
        else:
            severity = "Low"
            treatment = (
                "No fracture detected by the AI model. If pain, swelling, deformity, or functional limitation exists, "
                "clinical examination and radiologist review are still recommended."
            )

        return {
            "success": True,
            "diagnosis": diagnosis,
            "disease": diagnosis,
            "label": int(predicted_label),
            "confidence": float(confidence),
            "severity": severity,
            "treatment": treatment,
            "all_probabilities": {
                "Fracture": float(p_fracture),
                "No Fracture": float(p_not_fractured),
            },
            "probability_fracture": float(p_fracture),
            "probability_no_fracture": float(p_not_fractured),
            "stage": "Stage E — EfficientNetB0 + Swin-T ensemble",
            "ensemble": {
                "efficientnet_weight": float(eff_w),
                "swin_weight": float(swin_w),
                "efficientnet_p_not_fractured": float(eff_p_not),
                "swin_p_not_fractured": float(swin_p_not),
                "raw_ensemble_p_not_fractured": float(raw_ensemble_p_not),
                "calibrated_p_not_fractured": float(p_not_fractured),
                "temperature_T": float(temp_t),
                "decision_threshold": float(threshold),
            },
            "clinical_tier": tier,
            "clinical_action": clinical_action,
            "needs_radiologist_review": bool(needs_review),
            "notes": "AI-assisted screening only. This output must not replace radiologist or clinician judgement.",
            "type": "fracture",
        }

    except FileNotFoundError as exc:
        return {
            "success": False,
            "error": str(exc),
        }
    except Exception as exc:
        return {
            "success": False,
            "error": f"Prediction error: {str(exc)}",
        }
