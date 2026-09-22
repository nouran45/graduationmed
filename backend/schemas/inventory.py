from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


# =========================================================
# INVENTORY
# =========================================================

class InventoryCreate(BaseModel):
    product_id: str
    branch_id: str

    physical_quantity: int = Field(default=0, ge=0)
    price: float = Field(ge=0)

    online_visibility: bool = True
    reorder_level: int = Field(default=0, ge=0)


class InventoryQuantityUpdate(BaseModel):
    physical_quantity: int = Field(ge=0)


class InventoryDetailsUpdate(BaseModel):
    price: float | None = Field(default=None, ge=0)
    reorder_level: int | None = Field(default=None, ge=0)
    online_visibility: bool | None = None


class InventoryResponse(BaseModel):
    inventory_id: str

    product_id: str
    branch_id: str

    physical_quantity: int
    reserved_quantity: int
    available_quantity: int

    price: float
    online_visibility: bool
    reorder_level: int

    last_updated: datetime


# =========================================================
# STOCK MOVEMENTS
# =========================================================

class StockMovementType(str, Enum):
    MANUAL_ADD = "manual_add"
    CORRECTION = "correction"
    IMPORT = "import"
    RESERVATION = "reservation"
    RELEASE = "release"
    COMPLETION = "completion"


class StockMovementResponse(BaseModel):
    movement_id: str

    inventory_id: str
    product_id: str
    branch_id: str

    actor: str
    movement_type: StockMovementType

    physical_quantity_change: int
    reserved_quantity_change: int

    resulting_physical_quantity: int
    resulting_reserved_quantity: int
    resulting_available_quantity: int

    related_order_id: str | None = None

    timestamp: datetime


# =========================================================
# STOCK INTAKE / CSV IMPORT
# =========================================================

class InventoryIntakeRow(BaseModel):
    product_id: str = Field(min_length=1)

    quantity: int = Field(ge=0)
    price: float = Field(ge=0)

    reorder_level: int = Field(default=0, ge=0)
    online_visibility: bool = True


class InventoryIntakeRowResult(BaseModel):
    row_number: int

    product_id: str | None = None

    valid: bool
    errors: list[str] = Field(default_factory=list)

    data: InventoryIntakeRow | None = None


class InventoryIntakeValidationResponse(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int

    rows: list[InventoryIntakeRowResult]

class InventoryCsvValidationRequest(BaseModel):
    csv_text: str = Field(min_length=1)


class InventoryImportRequest(BaseModel):
    rows: list[InventoryIntakeRow]


class InventoryImportResult(BaseModel):
    imported: int
    failed: int

    inventory_items: list[InventoryResponse]

class InventoryDashboardSummary(BaseModel):
    total_products: int

    low_stock_products: int
    out_of_stock_products: int

    online_products: int
    offline_products: int

    total_physical_units: int
    total_reserved_units: int
    total_available_units: int

class InventoryDashboardResponse(BaseModel):
    summary: InventoryDashboardSummary

    low_stock_items: list[InventoryResponse]
    out_of_stock_items: list[InventoryResponse]

    recent_movements: list[StockMovementResponse]