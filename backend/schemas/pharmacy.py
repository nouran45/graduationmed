from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class VerificationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REQUEST_INFO = "request_info"
    SUSPENDED = "suspended"


class VerificationDecision(str, Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    REQUEST_INFO = "request_info"
    SUSPENDED = "suspended"


class StorefrontStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"


class PharmacyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    license_number: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=5, max_length=30)
    email: Optional[EmailStr] = None


class PharmacyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    license_number: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, min_length=5, max_length=30)
    email: Optional[EmailStr] = None


class PharmacyResponse(BaseModel):
    id: str
    name: str
    license_number: str
    phone: str
    email: Optional[EmailStr] = None
    verification_status: VerificationStatus
    created_at: datetime
    updated_at: datetime


class BranchCreate(BaseModel):
    pharmacy_id: str
    branch_name: str = Field(..., min_length=2, max_length=200)
    address: str = Field(..., min_length=2, max_length=500)
    phone: Optional[str] = Field(None, min_length=5, max_length=30)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)


class BranchUpdate(BaseModel):
    branch_name: Optional[str] = Field(None, min_length=2, max_length=200)
    address: Optional[str] = Field(None, min_length=2, max_length=500)
    phone: Optional[str] = Field(None, min_length=5, max_length=30)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)

    storefront_status: Optional[StorefrontStatus] = None
    accepting_reservations: Optional[bool] = None
    pickup_enabled: Optional[bool] = None
    delivery_enabled: Optional[bool] = None


class BranchResponse(BaseModel):
    branch_id: str
    pharmacy_id: str
    branch_name: str
    address: str
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    storefront_status: StorefrontStatus
    accepting_reservations: bool
    pickup_enabled: bool
    delivery_enabled: bool
    created_at: datetime
    updated_at: datetime


class PublicBranchResponse(BaseModel):
    branch_id: str
    pharmacy_id: str
    pharmacy_name: str
    branch_name: str
    address: str
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    storefront_status: StorefrontStatus
    accepting_reservations: bool
    pickup_enabled: bool
    delivery_enabled: bool


class VerificationSubmit(BaseModel):
    pharmacy_id: str


class VerificationAction(BaseModel):
    status: VerificationDecision
    reason: Optional[str] = Field(None, max_length=1000)

