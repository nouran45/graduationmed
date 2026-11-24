from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


PharmacyId = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]
ProductId = Annotated[
    str, StringConstraints(pattern=r"^[0-9]{1,32}$")
]


class CartLineChange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pharmacy_id: PharmacyId
    product_id: ProductId
    quantity: int = Field(strict=True, ge=0, le=99)
    expected_revision: int = Field(strict=True, ge=0)


class CartLine(BaseModel):
    pharmacy_id: str
    product_id: str
    pharmacy_name: str
    product_name: str
    quantity: int
    unit_price_piastres: int


class CartResponse(BaseModel):
    revision: int
    lines: list[CartLine]