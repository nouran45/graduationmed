"""
utils/normalize.py - Normalize all prediction responses to consistent format

Ensures all confidence values are stored as decimals (0-1) instead of percentages (0-100)
"""

def normalize_prediction_response(result: dict, prediction_type: str = None) -> dict:
    """
    Normalize prediction response to ensure confidence is always 0-1 (decimal).
    
    Args:
        result: The prediction result dict from any model
        prediction_type: Optional type ('kidney', 'diabetes', 'heart', 'anemia', etc.)
    
    Returns:
        Normalized result with all confidence values as decimal 0-1
    """
    if not result.get("success"):
        return result
    
    # If confidence exists and is > 1, it's stored as percentage - convert to decimal
    if "confidence" in result:
        try:
            conf = result["confidence"]
            if isinstance(conf, (int, float)) and conf > 1:
                # It's stored as percentage (0-100), convert to decimal (0-1)
                result["confidence"] = round(conf / 100, 4)
        except (TypeError, ValueError):
            pass  # Keep original value if conversion fails
    
    # Normalize other percentage-based fields that might exist
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
            try:
                val = result[field]
                if isinstance(val, (int, float)) and val > 1:
                    result[field] = round(val / 100, 4)
            except (TypeError, ValueError):
                pass  # Keep original value if conversion fails
    
    return result