"""
utils/predict.py
Base ViT skin disease predictor (clean images, no adversarial defense).

This module is kept intentionally lightweight — it loads the ViT model
once at import time using lazy initialisation so that the backend starts
even if the vitweights/ folder is not present (models load on first call).

Public function used by app.py:
    predict_skin_disease(image_path: str) -> dict

The Phase F adversarial pipeline is in utils/predict_skin_defense.py.
Use /predict for clean images, /predict-skin-defense for potentially
attacked images.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

import torch
import torchvision.transforms as transforms
from PIL import Image
from transformers import ViTForImageClassification

# ---------------------------------------------------------------------------
# Class labels — 15 skin disease classes (must match ViT training order)
# ---------------------------------------------------------------------------
CLASS_LABELS = [
    "Enfeksiyonel",
    "Ekzama",
    "Akne",
    "Pigment",
    "Benign",
    "Malign",
    "Acne",
    "Actinic Keratosis",
    "Basal Cell Carcinoma",
    "Benign Keratosis",
    "Dermatofibroma",
    "Melanocytic Nevus",
    "Melanoma",
    "Vascular Lesion",
    "Warts/Molluscum",
]

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_THIS_FILE = Path(__file__).resolve()
_BACKEND_DIR = _THIS_FILE.parents[1]          # backend/
_VIT_WEIGHTS_DIR = _BACKEND_DIR / "skin_defense" / "vit_base_local"

# ---------------------------------------------------------------------------
# Image transform (ImageNet normalisation — ViT was pretrained on ImageNet)
# ---------------------------------------------------------------------------
_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])

# ---------------------------------------------------------------------------
# Lazy model loader — loads once, never reloads
# ---------------------------------------------------------------------------
@lru_cache(maxsize=1)
def _get_vit_model() -> ViTForImageClassification:
    """Load ViT from vitweights/ folder. Called on first prediction."""
    if not _VIT_WEIGHTS_DIR.exists():
        raise FileNotFoundError(
            f"ViT weights folder not found: {_VIT_WEIGHTS_DIR}\n"
            "Place the vitweights/ folder inside backend/ and restart."
        )

    model = ViTForImageClassification.from_pretrained(
        str(_VIT_WEIGHTS_DIR),
        num_labels=len(CLASS_LABELS),
        ignore_mismatched_sizes=True,
    )
    model.eval()

    # Freeze all weights — inference only
    for param in model.parameters():
        param.requires_grad = False

    print(f"✅ ViT skin model loaded from {_VIT_WEIGHTS_DIR}")
    print(f"   Parameters: {sum(p.numel() for p in model.parameters()):,}")
    return model


# ---------------------------------------------------------------------------
# Public function
# ---------------------------------------------------------------------------
def predict_skin_disease(image_path: str) -> Dict[str, Any]:
    """
    Predict skin disease from a clean image using the base ViT model.

    Args:
        image_path: Absolute path to a .jpg / .jpeg / .png image file.

    Returns:
        {
            "success": True,
            "disease": str,          # top predicted class name
            "diagnosis": str,        # same as disease (dashboard compatibility)
            "label": int,            # class index
            "confidence": float,     # probability of top class  (0–1)
            "all_probabilities": {class_name: float, ...},
            "top5_predictions": [{label, probability}, ...],
            "type": "skin_disease"
        }
        or on error:
        {
            "success": False,
            "error": str
        }
    """
    try:
        # Load model (cached after first call)
        model = _get_vit_model()

        # Load and preprocess image
        image = Image.open(image_path).convert("RGB")
        input_tensor = _TRANSFORM(image).unsqueeze(0)   # [1, 3, 224, 224]

        # Inference
        with torch.no_grad():
            logits = model(pixel_values=input_tensor).logits  # [1, 15]
            probs = torch.softmax(logits, dim=1)[0]            # [15]

        predicted_index = int(torch.argmax(probs).item())
        confidence = float(probs[predicted_index].item())
        predicted_label = CLASS_LABELS[predicted_index]

        # All probabilities dict
        all_probs = {
            CLASS_LABELS[i]: round(float(probs[i].item()), 4)
            for i in range(len(CLASS_LABELS))
        }

        # Top-5
        top5_vals, top5_idx = probs.topk(5)
        top5 = [
            {
                "label": CLASS_LABELS[int(idx)],
                "class_index": int(idx),
                "probability": round(float(val), 4),
            }
            for val, idx in zip(top5_vals, top5_idx)
        ]

        return {
            "success": True,
            "disease": predicted_label,
            "diagnosis": predicted_label,
            "label": predicted_index,
            "confidence": round(confidence, 4),
            "all_probabilities": all_probs,
            "top5_predictions": top5,
            "type": "skin_disease",
        }

    except FileNotFoundError as exc:
        return {"success": False, "error": str(exc)}
    except Exception as exc:
        return {"success": False, "error": f"Prediction error: {str(exc)}"}