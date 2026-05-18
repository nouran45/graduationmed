from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from models import UserSignup, MedicalHistory, UserLogin, UserWithHistoryResponse, UserWithHistoryResponse

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from fastapi import HTTPException, Depends
from typing import List, Dict, Any

from fastapi import HTTPException, Depends
from typing import List, Dict, Any
import os
import logging
import tempfile
#from utils.predict import predict_skin_disease
import requests
from typing import Optional
import tempfile
from fastapi import UploadFile, File, Depends, HTTPException
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from models import DiabetesInput
from utils.predict_diabetes import predict_diabetes
from models import KidneyDiseaseInput  
from utils.predict_kidney import predict_kidney_disease  
from utils.predict_fracture import predict_fracture
from models import HeartDiseaseInput, HeartDiseaseResponse
from utils.predict_heart import predict_heart_disease
from models import DiabetesInput, AnemiaInput, AnemiaResponse
from utils.predict_anemia import predict_anemia, generate_anemia_recommendations
import traceback
from utils.normalize import normalize_prediction_response


from fastapi import HTTPException, Depends
from typing import List, Dict, Any
from bson import ObjectId
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()



SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


uri = os.getenv("MONGO_URI")
client = MongoClient(uri, server_api=ServerApi('1'), serverSelectionTimeoutMS=5000)
db = client["database"]
users = db["users"]
history_collection = db["history"]
try:
    client.admin.command('ping')
    print("✅ MongoDB Atlas connection established.")
except Exception as e:
    print(f"❌ Failed to connect to MongoDB Atlas: {e}")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://medical-symptom-checker-five.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Password and Token Functions
def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            logger.error("Token payload missing 'sub' field")
            raise credentials_exception
    except JWTError as e:
        logger.error(f"JWT decode error: {str(e)}")
        raise credentials_exception
    
    user = users.find_one({"email": email})
    if user is None:
        logger.error(f"User not found in database: {email}")
        raise credentials_exception
    
    logger.info(f"User authenticated: {email}")
    return user


# Routes
@app.get("/")
def home():
    return {"message": "Skin Disease Detection API is running!"}

@app.post("/register")
async def register(user_data: UserSignup):


    if users.find_one({"email": user_data.email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user document
    user_dict = user_data.dict()
    user_dict["hashed_password"] = get_password_hash(user_data.password)
    user_dict.pop("confirmPassword", None)
    user_dict["created_at"] = datetime.now(timezone.utc)
    user_dict["updated_at"] = datetime.now(timezone.utc)
    user_dict["role"] = "patient" 


    result = users.insert_one(user_dict)
    return {
        "message": "User registered successfully",
        "user_id": str(result.inserted_id)
    }

@app.get("/verify-token")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """Verify JWT token validity"""
    logger.info(f"Token verified for user: {current_user['email']}")
    return {
        "valid": True,
        "user": current_user["email"],
        "userId": str(current_user["_id"])
    }

@app.post("/login")
async def login(credentials: UserLogin):
    """Login endpoint - returns access_token"""
    logger.info(f"Login attempt for: {credentials.email}")
    
    user = users.find_one({"email": credentials.email})
    if not user:
        logger.warning(f"Login failed - user not found: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(credentials.password, user["hashed_password"]):
        logger.warning(f"Login failed - incorrect password: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]},
        expires_delta=access_token_expires
    )
    
    logger.info(f"Login successful for: {credentials.email}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": str(user["_id"]),
            "firstName": user.get("firstName", ""),
            "lastName": user.get("lastName", ""),
            "email": user["email"],
            "role": user.get("role", "patient")
        }
    }

@app.get("/users/me")
async def read_users_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "email": current_user["email"],
        "firstName": current_user.get("firstName", ""),
        "lastName": current_user.get("lastName", ""),
        "role": current_user.get("role", "patient")
    }



# @app.post("/predict")
# async def predict(
#     file: UploadFile = File(...),
#     current_user: dict = Depends(get_current_user)
# ):
#     try:
        
        
#         with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
#             content = await file.read()
#             temp_file.write(content)
#             temp_path = temp_file.name
        
        
        
#         result = predict_skin_disease(temp_path)
        
#         if not result.get("success", False):
#             raise HTTPException(
#                 status_code=400,
#                 detail=result.get("error", "Prediction failed")
#             )
        


    #     history_record = {
    #         "user_id": current_user["_id"],
    #         "prediction": result,
    #         "type": "skin_disease",
    #         "created_at": datetime.now(timezone.utc)
    #     }
    #     history_collection.insert_one(history_record)
        
    #     return result
        
    # except HTTPException:
    #     raise
    # except Exception as e:
    #     raise HTTPException(
    #         status_code=500,
    #         detail=f"Server error: {str(e)}"
    #     )
    # finally:
 
 
    #     if 'temp_path' in locals() and os.path.exists(temp_path):
    #         os.unlink(temp_path)


@app.post("/save-history")
async def save_history(
    history: MedicalHistory,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        history_dict = history.dict()
        history_dict["user_id"] = current_user["_id"]
        history_dict["created_at"] = datetime.now(timezone.utc)
        history_collection.insert_one(history_dict)
        return {"message": "History saved successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.get("/history")
async def get_history(current_user: Dict[str, Any] = Depends(get_current_user)):
    try:
        user_history = history_collection.find({"user_id": current_user["_id"]})
        history_list = []
        for h in user_history:
            history_item = {
                "id": str(h.get("_id")),
                "user_id": str(h.get("user_id")),
                "prediction": h.get("prediction"),
                "created_at": h.get("created_at").isoformat() if h.get("created_at") else None
            }
            history_list.append(history_item)
        return history_list
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


from datetime import datetime  # add this at the top of app.py

# helper: safe date formatting from dt or ISO string
def _fmt_date(dt) -> str:
    if not dt:
        return "Unknown date"
    if isinstance(dt, datetime):
        return dt.strftime("%B %d, %Y")
    try:
        # try ISO 8601 string
        return datetime.fromisoformat(str(dt).replace("Z", "+00:00")).strftime("%B %d, %Y")
    except Exception:
        return "Unknown date"

@app.get("/dashboard-history")
async def get_dashboard_history(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    uid = current_user.get("_id")
    uid_str = str(uid)
    query = {"user_id": {"$in": [uid, uid_str]}}

    user_history = list(
        history_collection.find(query, {"_id": 1, "prediction": 1, "type": 1, "created_at": 1})
        .sort("created_at", -1)
    )

    formatted: List[Dict[str, Any]] = []
    for record in user_history:
        pred = (record.get("prediction") or {})
        rtype = record.get("type") or "unknown"

        # unified primary name from model output
        primary_name = pred.get("disease") or pred.get("diagnosis") or pred.get("diagnosis_name")

        # condition per type with robust fallbacks
        if rtype == "diabetes":
            flag = pred.get("diabetes_prediction")
            risk_level = pred.get("risk_level")  # ← NEW: Use risk_level if available
            
            if risk_level:  # ← Prefer risk_level field
                condition = f"Diabetes Risk: {risk_level}"
            elif flag is not None:
                condition = "Diabetes Risk: High" if bool(flag) else "Diabetes Risk: Low"
            else:
                condition = primary_name or "Diabetes Assessment"
        elif rtype == "fracture":
            condition = primary_name or "Fracture Assessment"
        elif rtype in {"kidney", "heart", "anemia", "skin_disease"}:
            pretty = {
                "kidney": "Kidney Disease Assessment",
                "heart": "Heart Disease Assessment",
                "anemia": "Anemia Assessment",
                "skin_disease": "Skin Disease Assessment",
            }
            condition = primary_name or pretty[rtype]
        else:
            condition = primary_name or (f"Medical Assessment (type: {rtype})" if rtype != "unknown" else "Medical Assessment")

        # confidence from multiple possible keys; normalise 0–1 to %
        conf = pred.get("confidence")  # ← Check new "confidence" field first (0-100 scale)
        if conf is None:
            # Fallback chain for other prediction types
            conf = (
                pred.get("probability") 
                or pred.get("confidence_score") 
                or pred.get("diabetes_probability")  # ← NEW: Check diabetes_probability
                or pred.get("score") 
                or 0
            )
        
        try:
            conf = float(conf)
            # Only convert if it's clearly a 0-1 decimal (not already 0-100)
            if 0 <= conf <= 1:
                conf *= 100.0
            elif conf > 100:
                conf = 100.0  # Cap at 100
            elif conf < 0:
                conf = 0.0
        except Exception:
            conf = 0.0

        # ← NEW: Extract risk factors for diabetes
        risk_factors = pred.get("risk_factors") or []
        if rtype == "diabetes" and not risk_factors:
            # Fallback: build a simple risk factor from available data
            risk_factors = []
            if pred.get("diabetes_prediction"):
                risk_factors.append("High diabetes prediction from model")
        
        # ← NEW: Extract recommendations
        recommendations = pred.get("recommendations") or []
        if rtype == "diabetes" and not recommendations:
            recommendations = ["Consult your healthcare provider"]

        formatted.append({
            "id": str(record.get("_id")),
            "type": rtype,
            "condition": condition,
            "confidence": round(conf, 2),
            "date": _fmt_date(record.get("created_at")),
            "symptoms": pred.get("symptoms") or [],
            "diagnosis": primary_name or "No diagnosis available",
            "treatment": pred.get("treatment") or "Consult your doctor",
            "notes": pred.get("notes") or "No additional notes",
            "risk_factors": risk_factors,  # ← NEW: Include risk factors
            "recommendations": recommendations,  # ← NEW: Include recommendations
        })

    return formatted




@app.get("/users")
async def get_all_users(current_user: Dict[str, Any] = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    all_users = users.find()
    user_list = []
    for user in all_users:
        user_histories = list(history_collection.find({"user_id": user["_id"]}))
        formatted_histories = []
        for h in user_histories:
            prediction = h.get("prediction", {})
            formatted_histories.append({
                "id": str(h["_id"]),
                "condition": prediction.get("disease", ""),
                "confidence": prediction.get("confidence", 0),
                "label": prediction.get("label"),
                "success": prediction.get("success", False),
                "created_at": h.get("created_at").strftime("%Y-%m-%d %H:%M:%S") if h.get("created_at") else None
            })

        user_list.append({
            "id": str(user["_id"]),
            "name": f"{user.get('firstName', '')} {user.get('lastName', '')}".strip(),
            "email": user.get("email", ""),
            "dateJoined": user.get("created_at").strftime("%b %d, %Y") if user.get("created_at") else "N/A",
            "histories": formatted_histories
        })
    return user_list

@app.post("/predict-diabetes")
async def predict_diabetes_endpoint(
    data: DiabetesInput, 
    current_user: dict = Depends(get_current_user)
):
    print("🔍 Diabetes prediction request received")
    
    try:
        # Convert Pydantic model to dict
        input_data = data.dict()
        
        # Call the actual prediction function from predict_diabetes.py
        result = predict_diabetes(input_data)
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Diabetes prediction failed")
            )
        
        # Save to history
        history_record = {
            "user_id": current_user["_id"],
            "prediction": result,
            "type": "diabetes",
            "created_at": datetime.now(timezone.utc)
        }
        history_collection.insert_one(history_record)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server error: {str(e)}"
        )
    
@app.post("/predict-kidney")
async def predict_kidney_endpoint(
    data: KidneyDiseaseInput, 
    current_user: dict = Depends(get_current_user)
):
    """Predict chronic kidney disease based on patient data"""
    logger.info("🔍 Kidney disease prediction request received")
    
    try:
        # Convert Pydantic model to dict
        input_data = data.dict()
        
        # Call the actual prediction function from predict_kidney.py
        result = predict_kidney_disease(input_data)
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Kidney disease prediction failed")
            )
        
        # NORMALIZE BEFORE SAVING
        result = normalize_prediction_response(result, "kidney")
        # Save to history
        history_record = {
            "user_id": current_user["_id"],
            "prediction": result,
            "type": "kidney",
            "created_at": datetime.now(timezone.utc)
        }
        history_collection.insert_one(history_record)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Kidney prediction error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server error: {str(e)}"
        )
    
@app.post("/predict-fracture")
async def predict_fracture_endpoint(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Predict fracture from X-ray image
    Accepts: .jpg, .jpeg, .png, .JPG, .JPEG, .PNG
    """
    try:
        # Validate file extension
        valid_extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']
        file_ext = os.path.splitext(file.filename)[1]
        
        if file_ext not in valid_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file format. Supported formats: {', '.join(valid_extensions)}"
            )
        
        # Log the request
        logger.info(f"🩻 Fracture detection request from user: {current_user['email']}")
        logger.info(f"📁 File: {file.filename}, Type: {file.content_type}")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        logger.info(f"💾 Saved temp file: {temp_path}")
        
        # Perform prediction
        result = predict_fracture(temp_path)
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Fracture prediction failed")
            )
        
        # NORMALIZE BEFORE SAVING
        result = normalize_prediction_response(result, "fracture")
        
        conf_value = float(result.get("confidence", 0))
        conf_percent = conf_value * 100 if 0 <= conf_value <= 1 else conf_value
        logger.info(
            f"✅ Prediction successful: {result.get('diagnosis', 'Unknown')} "
            f"(confidence: {conf_percent:.1f}%)"
        )
        
        # Save to history
        history_record = {
            "user_id": current_user["_id"],
            "prediction": result,
            "type": "fracture",
            "filename": file.filename,
            "created_at": datetime.now(timezone.utc)
        }
        history_collection.insert_one(history_record)
        logger.info("💾 Saved to history")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fracture prediction error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Server error: {str(e)}"
        )
    finally:
        # Clean up temporary file
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.unlink(temp_path)
            logger.info(f"🗑️ Cleaned up temp file")



@app.post("/predict-heart", response_model=HeartDiseaseResponse)
async def predict_heart_endpoint(
    data: HeartDiseaseInput,
    current_user: dict = Depends(get_current_user)
):
    """
    Predict heart disease based on 11 clinical cardiac indicators.
 
    Uses CardioTabNet: AdaptiveClinicalFormer + XGBoost + CatBoost + LightGBM ensemble.
    Trained on IEEE Heart Disease dataset (1190 patients).
    CV performance: ACC 95.97% | AUC 98.43% | F1 96.20%
 
    Required features (11):
        age, trestbps, chol, thalach, oldpeak, fbs,
        sex, cp, restecg, exang, slope
 
    Note: ca and thal are NOT required — this model uses the IEEE
    dataset which does not include those Cleveland-specific features.
    """
    logger.info("❤️ Heart disease prediction request received")
 
    try:
        # ── 1. Convert Pydantic model to plain dict ───────────────────
        input_data = data.dict()
 
        # ── 2. Run prediction ─────────────────────────────────────────
        result = predict_heart_disease(input_data)
 
        if not result.get("success", False):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Heart disease prediction failed")
            )
 
        logger.info(
            f"✅ Prediction: {result['disease']} "
            f"(confidence: {result['confidence']}% | "
            f"threshold: {result.get('threshold_used', 'N/A')})"
        )
 
        # ── 3. Normalize before saving (same as other endpoints) ──────
        result = normalize_prediction_response(result, "heart")
 
        # ── 4. Ensure threshold_used key survives normalization ───────
        # normalize_prediction_response may not know this key — guard it
        if "threshold_used" not in result:
            result["threshold_used"] = 0.415   # fallback to trained value
 
        # ── 5. Save to history (same pattern as all other endpoints) ──
        history_record = {
            "user_id":    current_user["_id"],
            "prediction": result,
            "type":       "heart",
            "created_at": datetime.now(timezone.utc)
        }
        history_collection.insert_one(history_record)
        logger.info("💾 Saved to history")
 
        return result
 
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Heart disease prediction error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server error: {str(e)}"
        )
    

@app.post("/predict-anemia")
async def predict_anemia_endpoint(
    data: AnemiaInput, 
    current_user: dict = Depends(get_current_user)
) -> AnemiaResponse:
    """Predict anemia based on blood work parameters"""
    logger.info("🩸 Anemia prediction request received")
    
    try:
        input_data = data.dict()
        result = predict_anemia(input_data)
        
        if not result.get("success", False):
            raise HTTPException(status_code=400, detail=result.get("error", "Anemia prediction failed"))
        
        logger.info(f"✅ Prediction successful: {result['disease']}")
        
        recommendations = generate_anemia_recommendations(result['has_anemia'], input_data)
        result['recommendations'] = recommendations
        
        history_record = {
            "user_id": current_user["_id"],
            "prediction": result,
            "type": "anemia",
            "created_at": datetime.now(timezone.utc)
        }
        history_collection.insert_one(history_record)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Anemia prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")