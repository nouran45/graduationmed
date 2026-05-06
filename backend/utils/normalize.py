"""
utils/normalize.py - Normalize all prediction responses to a consistent format.

Backend convention:
- confidence is stored as a decimal between 0 and 1.
- probability_* fields are stored as decimals between 0 and 1.
- all_probabilities values are stored as decimals between 0 and 1.

The function is intentionally conservative: it preserves extra model fields such as
Stage E ensemble details, clinical tier, notes, and actions.
"""

from __future__ import annotations

from typing import Any, Dict


def _to_decimal_if_percentage(value: Any) -> Any:
    """Convert numeric percentages such as 95.0 to 0.95; leave decimals unchanged."""
    try:
        if isinstance(value, (int, float)):
            if value > 1:
                return round(float(value) / 100.0, 4)
            return float(value)
    except (TypeError, ValueError):
        pass
    return value


def normalize_prediction_response(result: dict, prediction_type: str | None = None) -> dict:
    """
    Normalize prediction response to ensure confidence/probability fields use decimal scale.

    Args:
        result: Prediction result dict from any model.
        prediction_type: Optional type such as 'fracture', 'kidney', 'heart', etc.

    Returns:
        Normalized result. Extra keys are preserved.
    """
    if not isinstance(result, dict):
        return result

    if not result.get("success"):
        return result

    # Main confidence field.
    if "confidence" in result:
        result["confidence"] = _to_decimal_if_percentage(result["confidence"])

    # Common top-level probability fields.
    percentage_fields = [
        "probability_disease",
        "probability_anemia",
        "probability_ckd",
        "probability_no_disease",
        "probability_no_anemia",
        "probability_no_ckd",
        "probability_fracture",
        "probability_no_fracture",
        "probability_diabetes",
        "probability_heart_disease",
    ]

    for field in percentage_fields:
        if field in result:
            result[field] = _to_decimal_if_percentage(result[field])

    # Normalize values inside all_probabilities if any model returns 0-100.
    all_probs = result.get("all_probabilities")
    if isinstance(all_probs, dict):
        normalized_probs: Dict[str, Any] = {}
        for key, value in all_probs.items():
            normalized_probs[key] = _to_decimal_if_percentage(value)
        result["all_probabilities"] = normalized_probs

    # Helpful canonical type if missing.
    if prediction_type and "type" not in result:
        result["type"] = prediction_type

    return result
