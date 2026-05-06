import tensorflow as tf
import numpy as np
from PIL import Image
import os
from tensorflow.keras.applications.efficientnet import preprocess_input

# Class labels for fracture detection
class_labels = [
    'Fracture',      # Changed from 'No Fracture'
    'No Fracture'    # Changed from 'Fracture'
]

def build_fracture_model():
    """Load the pre-trained fracture detection model"""
    model_path = os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", "cnnweights", "best_transfer_model_local.h5")
    )
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at {model_path}")
    
    model = tf.keras.models.load_model(model_path)
    return model

# Load model once at startup
model = build_fracture_model()

def preprocess_xray_image(image_path, target_size=(224, 224)):
    """
    Preprocess X-ray image for prediction using EfficientNet preprocessing
    
    Args:
        image_path: Path to the image file
        target_size: Target size for the model (default 224x224)
    
    Returns:
        Preprocessed image array ready for prediction
    """
    try:
        # Load and convert image to RGB
        image = Image.open(image_path).convert("RGB")
        
        # Resize image
        image = image.resize(target_size, Image.LANCZOS)
        
        # Convert to numpy array as float32
        img_array = np.array(image, dtype='float32')
        
        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        
        # Apply EfficientNet preprocessing (NOT just /255!)
        img_array = preprocess_input(img_array)
        
        return img_array
    
    except Exception as e:
        raise Exception(f"Error preprocessing image: {str(e)}")

def predict_fracture(image_path):
    """
    Predict whether an X-ray shows a fracture
    
    Args:
        image_path: Path to the X-ray image
    
    Returns:
        Dictionary containing prediction results
    """
    try:
        # Validate file extension
        valid_extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']
        file_ext = os.path.splitext(image_path)[1]
        
        if file_ext not in valid_extensions:
            return {
                "error": f"Invalid file format. Supported formats: {', '.join(valid_extensions)}",
                "success": False
            }
        
        # Load and debug the image
        image = Image.open(image_path).convert("RGB")
        print(f"DEBUG: Image size: {image.size}, Mode: {image.mode}, Pixel stats: min={np.array(image).min()}, max={np.array(image).max()}")
        
        # Preprocess the image
        preprocessed_image = preprocess_xray_image(image_path)
        
        # Make prediction
        predictions = model.predict(preprocessed_image, verbose=0)
        
        # For sigmoid output (single value between 0 and 1)
        prob_fracture = float(predictions[0][0])
        prob_no_fracture = 1.0 - prob_fracture
        
        # Create probability array
        probs = [prob_no_fracture, prob_fracture]
        
        # Print probabilities for debugging
        print("\n=== Fracture Detection Results ===")
        for i, prob in enumerate(probs):
            print(f"{class_labels[i]}: {prob:.4f} ({prob*100:.2f}%)")
        
        # Get predicted class (threshold at 0.5)
        predicted_index = 1 if prob_fracture > 0.5 else 0
        confidence = float(probs[predicted_index])
        
        # Determine diagnosis and recommendations
        diagnosis = class_labels[predicted_index]
        
        if diagnosis == "Fracture":
            treatment_recommendation = (
                "Immediate medical attention required. "
                "Please consult an orthopedic specialist for proper diagnosis and treatment. "
                "Avoid moving the affected area and follow RICE protocol (Rest, Ice, Compression, Elevation) "
                "until you can see a doctor."
            )
            severity = "High"
        else:
            treatment_recommendation = (
                "No fracture detected in the X-ray. However, if you're experiencing pain or discomfort, "
                "please consult a healthcare professional for a thorough examination. "
                "This AI prediction should not replace professional medical diagnosis."
            )
            severity = "Low"
        
        return {
        "diagnosis": diagnosis,          # existing
        "disease": diagnosis,            # ← canonical name for dashboard/consumers
        "confidence": float(confidence),
        "label": int(predicted_index),
        "success": True,
        "severity": severity,
        "treatment": treatment_recommendation,
        "all_probabilities": {
            "No Fracture": float(prob_no_fracture),
            "Fracture": float(prob_fracture)
        },
        "notes": "This is an AI-assisted diagnosis. Always consult a qualified healthcare professional.",
        "type": "fracture"               # ← helpful for history cards
    }

    
    except FileNotFoundError as e:
        return {
            "error": f"Image file not found: {str(e)}",
            "success": False
        }
    except Exception as e:
        return {
            "error": f"Prediction error: {str(e)}",
            "success": False
        }