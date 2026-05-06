import torch
import torchvision.transforms as transforms
from PIL import Image
import torch
import torchvision.transforms as transforms
from PIL import Image
import os

from transformers import ViTForImageClassification

from transformers import ViTForImageClassification

class_labels = [
    'Enfeksiyonel',
    'Ekzama', 
    'Akne',
    'Pigment',
    'Benign',
    'Malign',
    'Acne',
    'Actinic Keratosis',
    'Basal Cell Carcinoma',
    'Benign Keratosis',
    'Dermatofibroma',
    'Melanocytic Nevus',
    'Melanoma',
    'Vascular Lesion',
    'Warts/Molluscum',

]


import os
from transformers import ViTForImageClassification

def build_model():
    model_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "vitweights"))
    model = ViTForImageClassification.from_pretrained(
        model_path,
        num_labels=15
    )
    return model



model = build_model()
model.eval()


transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],  
        std=[0.229, 0.224, 0.225]
    )
])



def predict_skin_disease(image_path):
    try:
        image = Image.open(image_path).convert("RGB")
        input_tensor = transform(image).unsqueeze(0)  

        with torch.no_grad():
            outputs = model(input_tensor)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=1)[0]

  
        for i, prob in enumerate(probs):
            print(f"{class_labels[i]}: {prob:.4f}")

        predicted_index = torch.argmax(probs).item()
        confidence = probs[predicted_index].item()
        image = Image.open(image_path).convert("RGB")
        input_tensor = transform(image).unsqueeze(0)  

        with torch.no_grad():
            outputs = model(input_tensor)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=1)[0]

  
        for i, prob in enumerate(probs):
            print(f"{class_labels[i]}: {prob:.4f}")

        predicted_index = torch.argmax(probs).item()
        confidence = probs[predicted_index].item()

        return {
            "disease": class_labels[predicted_index],
            "confidence": confidence,
            "label": predicted_index,
            "success": True
        }


    except Exception as e:
        return {
            "error": str(e),
            "success": False
        }

