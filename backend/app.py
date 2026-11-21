import logging
import os
import tempfile
import traceback
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# ── Database: ONE shared client (database.py) ───────────────────────────────
from database import client, history_collection, users

# ── Security layer (Grad 2 / Phase 1) ───────────────────────────────────────
from security.authorization import memberships_summary, require_admin
from security.config import get_settings
from security.identity import get_current_user
from security import audit_events as audit
from security.event_sink import get_sink
from security.indexes import ensure_indexes
from security.logging_middleware import SecurityLoggingMiddleware
from security.request_context import add_detail
from security.middleware import RequestContextMiddleware, unhandled_exception_handler
from security.rate_limit import rate_limit
from security.uploads import read_upload_limited, safe_display_filename, validate_image_bytes

# ── Routers ─────────────────────────────────────────────────────────────────
from routers.admin_users import router as admin_users_router
from routers.auth import router as auth_router
from routers.inventory import router as inventory_router
from routers.pharmacies import router as pharmacies_router
from routers.pharmacy_catalogue import router as pharmacy_catalogue_router
from routers.prescriptions import router as prescriptions_router
from routers.security_events import router as security_events_router

# ── Models ──────────────────────────────────────────────────────────────────
from models import (
    AnemiaInput,
    AnemiaResponse,
    DiabetesInput,
    HeartDiseaseInput,
    HeartDiseaseResponse,
    KidneyDiseaseInput,
    MedicalHistory,
)

# ── Skin disease predictors ────────────────────────────────────────────────
# predict.py:              base ViT model  → /predict  (clean images)
# predict_skin_defense.py: Phase F pipeline → /predict-skin-defense (any image)
from utils.predict import predict_skin_disease
from utils.predict_skin_defense import predict_skin_defense, get_pipeline_status
from utils.predict_diabetes import predict_diabetes
from utils.predict_kidney import predict_kidney_disease
from utils.predict_fracture import predict_fracture
from utils.predict_heart import predict_heart_disease
from utils.predict_anemia import predict_anemia, generate_anemia_recommendations
from utils.normalize import normalize_prediction_response

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()          # raises at start-up if SECRET_KEY is weak/missing

INTERNAL_ERROR = "Internal server error."


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        client.admin.command("ping")
        logger.info("MongoDB connection established.")
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to connect to MongoDB: %s", exc)
    problems = ensure_indexes()
    if problems:
        logger.error(
            "%d index(es) could not be created. Run scripts/migrate_phase1.py. %s",
            len(problems), problems,
        )
    sink = get_sink()
    sink.start()                      # security event writer (replays any spilled events first)
    yield
    sink.stop(timeout=5.0)            # flush queued events on shutdown


app = FastAPI(
    lifespan=lifespan,
    docs_url="/docs" if settings.docs_enabled else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.docs_enabled else None,
)

# Middleware order: the LAST one added is the OUTERMOST.
#   CORS  >  SecurityLoggingMiddleware  >  RequestContextMiddleware  >  routes
# Logging sits OUTSIDE RequestContext so early rejections (413) are logged too;
# CORS is outermost so even 413/429 responses carry CORS headers.
app.add_middleware(RequestContextMiddleware)
app.add_middleware(SecurityLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Branch-ID"],
    expose_headers=["X-Request-ID", "Retry-After"],
)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Routes
app.include_router(auth_router)
app.include_router(prescriptions_router)
app.include_router(pharmacies_router)   # now authenticated; safe to register
app.include_router(inventory_router)    # now authenticated; safe to register
app.include_router(security_events_router)   # admin-only READ access to security events (Phase 2)
app.include_router(pharmacy_catalogue_router)  # public product catalogue (teammate); admin-only sync
app.include_router(admin_users_router)          # admin: create users with a role, change roles

_predict_limit = rate_limit("predict", "predict_per_minute", 60)
_heavy_limit = rate_limit("predict_heavy", "heavy_predict_per_minute", 60)


@app.get("/")
def home():
    return {"message": "Skin Disease Detection API is running!"}


# =============================================================================
# /predict  — Base ViT skin disease endpoint (clean images)
# =============================================================================
@app.post("/predict", dependencies=[Depends(_predict_limit)])
async def predict(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Predict skin disease from a clean image using the base ViT model.
    Use /predict-skin-defense for images that may have been adversarially attacked.
    """
    temp_path = None
    try:
        content = await read_upload_limited(file, settings.max_image_bytes)
        kind = validate_image_bytes(content)          # magic bytes + Pillow header check
        file_ext = ".jpg" if kind == "jpeg" else ".png"

        logger.info(f"🔬 Skin prediction (base ViT) from user: {current_user['_id']}")

        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        result = predict_skin_disease(temp_path)

        if not result.get("success", False):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Prediction failed")
            )

        history_record = {
            "user_id": current_user["_id"],
            "prediction": result,
            "type": "skin_disease",
            "filename": safe_display_filename(file.filename),
            "created_at": datetime.now(timezone.utc)
        }
        history_collection.insert_one(history_record)
        logger.info(f"✅ Base ViT prediction: {result.get('disease')} ({result.get('confidence', 0):.2%})")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Skin prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR)
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


# =============================================================================
# /predict-skin-defense  — Phase F complete adversarial defense pipeline
# =============================================================================
@app.post("/predict-skin-defense", dependencies=[Depends(_heavy_limit)])
async def predict_skin_defense_endpoint(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Full Phase F adversarial defense pipeline.

    Automatically detects whether the image has been attacked (clean, sparse,
    or dense adversarial attack), routes it to the correct denoiser, then
    classifies the denoised image with the ViT.

    Pipeline: DenseNet121 detector → [skip | SUNet v1 sparse | SUNet v3] → ViT

    Response includes:
      - disease / diagnosis / confidence: classification result
      - route_used: which denoiser was applied
      - detector_class: 0=Clean, 1=Sparse, 2=Dense
      - detector_confidence: DenseNet121 routing confidence
      - pipeline_version: phase_f_v1
    """
    temp_path = None
    try:
        content = await read_upload_limited(file, settings.max_image_bytes)
        kind = validate_image_bytes(content)          # magic bytes + Pillow header check
        file_ext = ".jpg" if kind == "jpeg" else ".png"

        logger.info(f"🛡️  Phase F defense request from user: {current_user['_id']}")
        logger.info(f"📁 File: {file.filename}")

        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        result = predict_skin_defense(temp_path)

        if not result.get("success", False):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Defense pipeline prediction failed")
            )

        # Hide confidence only for sparse/dense routed images.
        # detector_class: 0 = clean, 1 = sparse, 2 = dense
        detector_class = result.get("detector_class")

        try:
            detector_class_int = int(detector_class)
        except Exception:
            detector_class_int = None

        route_used = str(result.get("route_used") or "").lower()

        hide_confidence = (
            detector_class_int in [1, 2]
            or "sparse" in route_used
            or "dense" in route_used
        )

        result["hide_confidence"] = hide_confidence
        result["hideConfidence"] = hide_confidence

        # Operational category of the Grad 1 defence pipeline: clean | sparse | dense.
        # Recorded in the security event for context, but it is NOT a cybersecurity
        # attack label (that comes from the scenario runner in Phase 3).
        add_detail(
            "model_route",
            "sparse" if "sparse" in route_used or detector_class_int == 1
            else "dense" if "sunet_v3" in route_used or "dense" in route_used or detector_class_int == 2
            else "clean",
        )

        history_record = {
            "user_id": current_user["_id"],
            "prediction": result,
            "type": "skin_disease",
            "filename": safe_display_filename(file.filename),
            "pipeline": "phase_f",
            "created_at": datetime.now(timezone.utc)
        }
        history_collection.insert_one(history_record)

        logger.info(
            f"✅ Phase F prediction: {result.get('disease')} | "
            f"route={result.get('route_used')} | "
            f"confidence={result.get('confidence', 0):.2%}"
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Phase F prediction error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR)
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


@app.get("/predict-skin-defense/health")
async def skin_defense_health(_admin: dict = Depends(require_admin)):
    """
    Health check for the Phase F pipeline.
    Does NOT load models — safe to call at any time.
    Returns model file paths and whether models are currently loaded.
    """
    status_info = get_pipeline_status()
    return {
        "status": "ok",
        "pipeline": "phase_f_v1",
        **status_info
    }


# =============================================================================
# Remaining existing endpoints (unchanged)
# =============================================================================

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
        audit.emit(
            "history.write.allowed", outcome="success", resource_type="medical_history",
            target_relation="self", authorization_result="allowed", rule_id=audit.RULE_HISTORY,
        )
        return {"message": "History saved successfully"}
    except Exception as e:
        logger.error("save-history failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=INTERNAL_ERROR
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
        audit.emit(
            "history.read.allowed", outcome="success", resource_type="medical_history",
            target_relation="self", authorization_result="allowed", rule_id=audit.RULE_HISTORY,
            details={"record_count": len(history_list)},
        )
        return history_list
    except Exception as e:
        logger.error("history failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=INTERNAL_ERROR
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
            risk_level = pred.get("risk_level")
            
            if risk_level:
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

        conf = pred.get("confidence")
        if conf is None:
            conf = (
                pred.get("probability") 
                or pred.get("confidence_score") 
                or pred.get("diabetes_probability")
                or pred.get("score") 
                or 0
            )
        
        try:
            conf = float(conf)
            if 0 <= conf <= 1:
                conf *= 100.0
            elif conf > 100:
                conf = 100.0
            elif conf < 0:
                conf = 0.0
        except Exception:
            conf = 0.0

        risk_factors = pred.get("risk_factors") or []
        if rtype == "diabetes" and not risk_factors:
            risk_factors = []
            if pred.get("diabetes_prediction"):
                risk_factors.append("High diabetes prediction from model")
        
        recommendations = pred.get("recommendations") or []
        if rtype == "diabetes" and not recommendations:
            recommendations = ["Consult your healthcare provider"]

        # Hide confidence in dashboard only for sparse/dense skin-defense routes.
        detector_class = pred.get("detector_class")

        try:
            detector_class_int = int(detector_class)
        except Exception:
            detector_class_int = None

        route_used = str(pred.get("route_used") or "").lower()

        hide_confidence = (
            rtype == "skin_disease"
            and (
                detector_class_int in [1, 2]
                or "sparse" in route_used
                or "dense" in route_used
            )
        )

        formatted.append({
            "id": str(record.get("_id")),
            "type": rtype,
            "condition": condition,
            "confidence": round(conf, 2),
            "hide_confidence": hide_confidence,
            "hideConfidence": hide_confidence,
            "date": _fmt_date(record.get("created_at")),
            "symptoms": pred.get("symptoms") or [],
            "diagnosis": primary_name or "No diagnosis available",
            "treatment": pred.get("treatment") or "Consult your doctor",
            "notes": pred.get("notes") or "No additional notes",
            "risk_factors": risk_factors,
            "recommendations": recommendations,
        })

    audit.emit(
        "history.read.allowed", outcome="success", resource_type="medical_history",
        target_relation="self", authorization_result="allowed", rule_id=audit.RULE_HISTORY,
        details={"record_count": len(formatted)},
    )
    return formatted




@app.get("/users")
async def get_all_users(_admin: dict = Depends(require_admin)):

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
            # used by the admin role-management screen
            "role": user.get("role", "patient"),
            "isDisabled": bool(user.get("is_disabled", False)),
            "memberships": memberships_summary(user["_id"]),
            "histories": formatted_histories
        })
    audit.emit(
        "admin.users.listed", outcome="success", resource_type="user_directory",
        details={"record_count": len(user_list)},
    )
    return user_list

@app.post("/predict-diabetes", dependencies=[Depends(_predict_limit)])
async def predict_diabetes_endpoint(
    data: DiabetesInput, 
    current_user: dict = Depends(get_current_user)
):
    print("🔍 Diabetes prediction request received")
    
    try:
        input_data = data.dict()
        result = predict_diabetes(input_data)
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Diabetes prediction failed")
            )
        
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
            detail=INTERNAL_ERROR
        )
    
@app.post("/predict-kidney", dependencies=[Depends(_predict_limit)])
async def predict_kidney_endpoint(
    data: KidneyDiseaseInput, 
    current_user: dict = Depends(get_current_user)
):
    """Predict chronic kidney disease based on patient data"""
    logger.info("🔍 Kidney disease prediction request received")
    
    try:
        input_data = data.dict()
        result = predict_kidney_disease(input_data)
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Kidney disease prediction failed")
            )
        
        result = normalize_prediction_response(result, "kidney")
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
            detail=INTERNAL_ERROR
        )
    
@app.post("/predict-fracture", dependencies=[Depends(_predict_limit)])
async def predict_fracture_endpoint(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Predict fracture from X-ray image
    Accepts: .jpg, .jpeg, .png, .JPG, .JPEG, .PNG
    """
    temp_path = None
    try:
        content = await read_upload_limited(file, settings.max_image_bytes)
        kind = validate_image_bytes(content)
        file_ext = ".jpg" if kind == "jpeg" else ".png"

        logger.info(f"🩻 Fracture detection request from user: {current_user['_id']}")
        logger.info(f"📁 File: {file.filename}, Type: {file.content_type}")
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name
        
        logger.info(f"💾 Saved temp file: {temp_path}")
        
        result = predict_fracture(temp_path)
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Fracture prediction failed")
            )
        
        result = normalize_prediction_response(result, "fracture")
        
        conf_value = float(result.get("confidence", 0))
        conf_percent = conf_value * 100 if 0 <= conf_value <= 1 else conf_value
        logger.info(
            f"✅ Prediction successful: {result.get('diagnosis', 'Unknown')} "
            f"(confidence: {conf_percent:.1f}%)"
        )
        
        history_record = {
            "user_id": current_user["_id"],
            "prediction": result,
            "type": "fracture",
            "filename": safe_display_filename(file.filename),
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
            detail=INTERNAL_ERROR
        )
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)
            logger.info(f"🗑️ Cleaned up temp file")



@app.post("/predict-heart", response_model=HeartDiseaseResponse, dependencies=[Depends(_predict_limit)])
async def predict_heart_endpoint(
    data: HeartDiseaseInput,
    current_user: dict = Depends(get_current_user)
):
    logger.info("❤️ Heart disease prediction request received")
 
    try:
        input_data = data.dict()
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
 
        result = normalize_prediction_response(result, "heart")
 
        if "threshold_used" not in result:
            result["threshold_used"] = 0.415
 
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
            detail=INTERNAL_ERROR
        )
    

@app.post("/predict-anemia", dependencies=[Depends(_predict_limit)])
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
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR)