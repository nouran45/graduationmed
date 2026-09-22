from enum import Enum

from pydantic import BaseModel, Field


class OrderStatus(str, Enum):
    REQUESTED = "requested"
    ACCEPTED = "accepted"
    PREPARING = "preparing"
    READY = "ready"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class FulfillmentMethod(str, Enum):
    PICKUP = "pickup"
    DELIVERY = "delivery"


class OrderItem(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)


class OrderCreate(BaseModel):
    pharmacy_id: str
    branch_id: str

    items: list[OrderItem]

    fulfillment_method: FulfillmentMethod
    delivery_address: str | None = None

    prescription_id: str | None = None


class OrderResponse(BaseModel):
    order_id: str

    patient_id: str
    pharmacy_id: str
    branch_id: str

    items: list[OrderItem]

    subtotal: float

    fulfillment_method: FulfillmentMethod
    delivery_address: str | None = None

    prescription_id: str | None = None

    status: OrderStatus