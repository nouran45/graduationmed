from datetime import datetime, timezone
from typing import Optional, List, Union

from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict, AliasChoices



# -------- Auth / Users --------

class UserSignup(BaseModel):
    firstName: str = Field(..., alias="firstName")
    lastName: str = Field(..., alias="lastName")
    email: EmailStr
    password: str
    confirmPassword: str = Field(..., alias="confirmPassword")

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserInDB(UserSignup):
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# -------- Medical History --------

class MedicalHistory(BaseModel):
    user_id: Optional[str] = None
    condition: str
    diagnosis_date: Optional[datetime] = None
    treatment: Optional[str] = None
    notes: Optional[str] = None


class ChatRequest(BaseModel):
    prompt: str


class MedicalHistoryResponse(BaseModel):
    id: str
    condition: str
    diagnosis_date: Optional[str] = None
    treatment: Optional[str] = None
    notes: Optional[str] = None


class UserWithHistoryResponse(BaseModel):
    id: str
    name: str
    email: str
    dateJoined: str
    histories: List[MedicalHistoryResponse] = Field(default_factory=list)


# -------- Diabetes Model --------

class DiabetesInput(BaseModel):
    age: float
    bmi: float
    hypertension: Union[int, str]
    heart_disease: Union[int, str]
    smoking_history: Union[int, str]
    HbA1c_level: float
    blood_glucose_level: float
    gender: Union[int, str]

    # Optional extras (default 0)
    cholesterol_level: Optional[float] = 0
    physical_activity: Optional[float] = 0
    diet_quality: Optional[float] = 0
    family_history: Optional[int] = 0
    waist_circumference: Optional[float] = 0
    systolic_bp: Optional[float] = 0
    diastolic_bp: Optional[float] = 0
    triglycerides: Optional[float] = 0

    # Misc incoming aliases
    class_: Optional[int] = Field(0, alias="class")
    id: Optional[int] = 0
    no_pation: Optional[int] = 0

    @field_validator("hypertension", "heart_disease", mode="before")
    @classmethod
    def yes_no_to_int(cls, v):
        if isinstance(v, str):
            return 1 if v.lower() == "yes" else 0
        return v

    @field_validator("gender", mode="before")
    @classmethod
    def gender_to_int(cls, v):
        if isinstance(v, str):
            return 1 if v.lower() == "male" else 0  # 1=male, 0=female/other
        return v

    @field_validator("smoking_history", mode="before")
    @classmethod
    def smoke_to_int(cls, v):
        mapping = {"never": 0, "former": 1, "current": 2, "ever": 3, "not current": 4}
        if isinstance(v, str):
            return mapping.get(v.lower(), 0)
        return v


# -------- Kidney Model --------

class KidneyDiseaseInput(BaseModel):
    """Kidney prediction (19 features); accepts old names via aliases."""
    # 19-feature schema
    sex: Optional[Union[str, int]] = Field(None, validation_alias=AliasChoices("sex", "gender"))
    age: float

    blood_pressure: float = Field(..., validation_alias=AliasChoices("bp", "bloodPressure", "blood_pressure"))
    specific_gravity: float = Field(..., validation_alias=AliasChoices("sg", "specificGravity", "specific_gravity"))
    albumin: float = Field(..., validation_alias=AliasChoices("al", "albumin"))
    sugar: float = Field(..., validation_alias=AliasChoices("su", "sugar"))

    blood_glucose_random: float = Field(..., validation_alias=AliasChoices("bgr", "bloodGlucoseRandom", "blood_glucose_random"))
    blood_urea: float = Field(..., validation_alias=AliasChoices("bu", "bloodUrea", "blood_urea"))
    serum_creatinine: float = Field(..., validation_alias=AliasChoices("sc", "serumCreatinine", "serum_creatinine"))
    sodium: float = Field(..., validation_alias=AliasChoices("sod", "sodium"))
    potassium: float = Field(..., validation_alias=AliasChoices("pot", "potassium"))
    hemoglobin: float = Field(..., validation_alias=AliasChoices("hemo", "hemoglobin"))
    packed_cell_volume: float = Field(..., validation_alias=AliasChoices("pcv", "packedCellVolume", "packed_cell_volume"))
    white_blood_cell_count: float = Field(..., validation_alias=AliasChoices("wc", "whiteBloodCellCount", "white_blood_cell_count"))
    red_blood_cell_count: float = Field(..., validation_alias=AliasChoices("rc", "redBloodCellCount", "red_blood_cell_count"))

    hypertension: Union[str, int] = Field(..., validation_alias=AliasChoices("htn", "hypertension"))
    diabetes: Union[str, int] = Field(..., validation_alias=AliasChoices("dm", "diabetes", "diabetes_mellitus"))
    anemia: Union[str, int] = Field(..., validation_alias=AliasChoices("ane", "anemia"))
    edema: Union[str, int] = Field(..., validation_alias=AliasChoices("pe", "edema", "pedal_edema"))

    # legacy optional fields (ignored by predictor):
    red_blood_cells: Optional[Union[str, int]] = Field(None, validation_alias=AliasChoices("rbc", "red_blood_cells"))
    pus_cell: Optional[Union[str, int]] = Field(None, validation_alias=AliasChoices("pc", "pus_cell"))
    pus_cell_clumps: Optional[Union[str, int]] = Field(None, validation_alias=AliasChoices("pcc", "pus_cell_clumps"))
    bacteria: Optional[Union[str, int]] = Field(None, validation_alias=AliasChoices("ba", "bacteria"))
    coronary_artery_disease: Optional[Union[str, int]] = Field(None, validation_alias=AliasChoices("cad", "coronary_artery_disease"))
    appetite: Optional[Union[str, int]] = Field(None, validation_alias=AliasChoices("appet", "appetite"))

    model_config = ConfigDict(populate_by_name=True)

class FractureDetectionResponse(BaseModel):
    """Response model for fracture detection"""
    diagnosis: str
    confidence: float
    label: int
    success: bool
    severity: str
    treatment: str
    all_probabilities: dict
    notes: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "diagnosis": "Fracture",
                "confidence": 0.95,
                "label": 1,
                "success": True,
                "severity": "High",
                "treatment": "Immediate medical attention required...",
                "all_probabilities": {
                    "No Fracture": 0.05,
                    "Fracture": 0.95
                },
                "notes": "This is an AI-assisted diagnosis..."
            }
        }
    )

# -------- Heart Disease Model --------

class HeartDiseaseInput(BaseModel):
    """Input model for heart disease prediction (Cleveland dataset)"""

    # Numeric features
    age: float = Field(..., description="Age in years", ge=0, le=120)
    trestbps: float = Field(..., description="Resting blood pressure (mmHg)", ge=40, le=300)
    chol: float = Field(..., description="Serum cholesterol (mg/dL)", ge=100, le=600)
    thalach: float = Field(..., description="Maximum heart rate achieved", ge=40, le=250)
    oldpeak: float = Field(..., description="ST depression induced by exercise", ge=0.0, le=10.0)
    ca: float = Field(..., description="Number of major vessels (0-4)", ge=0, le=4)

    # Categorical features
    sex: int = Field(..., description="Sex (0=female, 1=male)")
    cp: int = Field(..., description="Chest pain type (0-3)")
    fbs: int = Field(..., description="Fasting blood sugar > 120 mg/dL (0=no, 1=yes)")
    restecg: int = Field(..., description="Resting ECG results (0,1,2)")
    exang: int = Field(..., description="Exercise induced angina (0=no, 1=yes)")
    slope: int = Field(..., description="Slope of peak exercise ST segment (0,1,2)")
    thal: int = Field(..., description="Thalassemia (0,1,2,3,7)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "age": 63,
                "sex": 1,
                "cp": 3,
                "trestbps": 145,
                "chol": 233,
                "fbs": 1,
                "restecg": 0,
                "thalach": 150,
                "exang": 0,
                "oldpeak": 2.3,
                "slope": 0,
                "ca": 0,
                "thal": 1
            }
        }
    )


class HeartDiseaseResponse(BaseModel):
    """Response model for heart disease prediction"""
    success: bool
    prediction: int
    has_heart_disease: bool
    confidence: float
    probability_no_disease: float
    probability_disease: float
    risk_level: str
    disease: str
    diagnosis: str
    recommendations: List[str]
    threshold_used: float

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "prediction": 1,
                "has_heart_disease": True,
                "confidence": 95.5,
                "probability_no_disease": 4.5,
                "probability_disease": 95.5,
                "risk_level": "Very High",
                "disease": "Heart Disease Detected",
                "diagnosis": "High probability of coronary heart disease...",
                "recommendations": ["Immediate consultation with cardiologist..."],
                "threshold_used": 0.5
            }
        }
    )

# -------- Anemia Model --------

class AnemiaInput(BaseModel):
    """Input model for anemia prediction"""
    gender: Union[str, int] = Field(..., description="Gender (0=female, 1=male or 'male'/'female')")
    hemoglobin: float = Field(..., description="Hemoglobin level (g/dL)", ge=0)
    mch: float = Field(..., description="Mean Corpuscular Hemoglobin (pg)", ge=0)
    mchc: float = Field(..., description="Mean Corpuscular Hemoglobin Concentration (g/dL)", ge=0)
    mcv: float = Field(..., description="Mean Corpuscular Volume (fL)", ge=0)

    @field_validator("gender", mode="before")
    @classmethod
    def gender_to_int(cls, v):
        if isinstance(v, str):
            return 1 if v.lower() == "male" else 0
        return int(v) if v in (0, 1) else 0

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "gender": "male",
                "hemoglobin": 14.5,
                "mch": 29.0,
                "mchc": 33.5,
                "mcv": 86.0
            }
        }
    )


class AnemiaResponse(BaseModel):
    """Response model for anemia prediction"""
    success: bool
    prediction: int
    has_anemia: bool
    confidence: float
    probability_no_anemia: float
    probability_anemia: float
    risk_level: str
    disease: str
    diagnosis: str
    notes: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "prediction": 0,
                "has_anemia": False,
                "confidence": 92.5,
                "probability_no_anemia": 92.5,
                "probability_anemia": 7.5,
                "risk_level": "Low",
                "disease": "No Anemia Detected",
                "diagnosis": "Low probability of anemia. Continue preventive health care.",
                "notes": "This is an AI-assisted screening tool. Always consult healthcare professionals."
            }
        }
    )