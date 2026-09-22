import csv
from datetime import datetime, timezone
from io import StringIO
from uuid import uuid4

from pymongo import ReturnDocument

from database import (
    inventory_collection,
    stock_movements_collection,
)

from schemas.inventory import (
    InventoryCreate,
    InventoryDetailsUpdate,
    InventoryIntakeRow,
    InventoryIntakeRowResult,
    InventoryIntakeValidationResponse,
    StockMovementType,
)


# =========================================================
# SHARED HELPERS
# =========================================================

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_inventory(
    document: dict | None,
) -> dict | None:
    """
    Remove MongoDB's internal _id before returning inventory
    data to the API layer.
    """

    if document is None:
        return None

    document = document.copy()
    document.pop("_id", None)

    return document


def _serialize_stock_movement(
    document: dict | None,
) -> dict | None:
    """
    Remove MongoDB's internal _id before returning a
    stock-movement record.
    """

    if document is None:
        return None

    document = document.copy()
    document.pop("_id", None)

    return document


# =========================================================
# STOCK MOVEMENTS
# =========================================================

def _record_stock_movement(
    inventory: dict,
    actor: str,
    movement_type: StockMovementType,
    physical_quantity_change: int = 0,
    reserved_quantity_change: int = 0,
    related_order_id: str | None = None,
) -> dict:
    movement = {
        "movement_id": f"mov_{uuid4().hex}",

        "inventory_id": inventory["inventory_id"],
        "product_id": inventory["product_id"],
        "branch_id": inventory["branch_id"],

        "actor": actor,
        "movement_type": movement_type.value,

        "physical_quantity_change":
            physical_quantity_change,

        "reserved_quantity_change":
            reserved_quantity_change,

        "resulting_physical_quantity":
            inventory["physical_quantity"],

        "resulting_reserved_quantity":
            inventory["reserved_quantity"],

        "resulting_available_quantity":
            inventory["available_quantity"],

        "related_order_id": related_order_id,

        "timestamp": _utc_now(),
    }

    stock_movements_collection.insert_one(
        movement
    )

    return _serialize_stock_movement(
        movement
    )


def list_stock_movements(
    inventory_id: str,
    branch_id: str,
) -> list[dict]:
    cursor = stock_movements_collection.find(
        {
            "inventory_id": inventory_id,
            "branch_id": branch_id,
        }
    ).sort(
        "timestamp",
        -1,
    )

    return [
        _serialize_stock_movement(document)
        for document in cursor
    ]


# =========================================================
# INVENTORY CREATE / READ
# =========================================================

def create_inventory_item(
    data: InventoryCreate,
    actor: str,
) -> dict:
    """
    Create a new inventory record for one product at one
    branch and record the initial stock movement.
    """

    existing_item = (
        inventory_collection.find_one(
            {
                "product_id": data.product_id,
                "branch_id": data.branch_id,
            }
        )
    )

    if existing_item:
        raise ValueError(
            "This product already has an inventory "
            "record for this branch."
        )

    now = _utc_now()

    document = {
        "inventory_id":
            f"inv_{uuid4().hex}",

        "product_id":
            data.product_id,

        "branch_id":
            data.branch_id,

        "physical_quantity":
            data.physical_quantity,

        "reserved_quantity":
            0,

        "available_quantity":
            data.physical_quantity,

        "price":
            data.price,

        "online_visibility":
            data.online_visibility,

        "reorder_level":
            data.reorder_level,

        "last_updated":
            now,
    }

    inventory_collection.insert_one(
        document
    )

    # Record the initial stock addition only when
    # stock is actually added.
    if data.physical_quantity != 0:
        _record_stock_movement(
            inventory=document,
            actor=actor,
            movement_type=
                StockMovementType.MANUAL_ADD,
            physical_quantity_change=
                data.physical_quantity,
        )

    return _serialize_inventory(
        document
    )


def list_inventory(
    branch_id: str,
) -> list[dict]:
    """
    Return inventory belonging only to the requested branch.
    """

    cursor = inventory_collection.find(
        {
            "branch_id": branch_id
        }
    ).sort(
        "last_updated",
        -1,
    )

    return [
        _serialize_inventory(document)
        for document in cursor
    ]


def get_inventory_item(
    inventory_id: str,
    branch_id: str,
) -> dict | None:
    """
    Get one inventory item while enforcing branch scope.
    """

    document = (
        inventory_collection.find_one(
            {
                "inventory_id": inventory_id,
                "branch_id": branch_id,
            }
        )
    )

    return _serialize_inventory(
        document
    )


# =========================================================
# INVENTORY UPDATE
# =========================================================

def update_quantity(
    inventory_id: str,
    branch_id: str,
    physical_quantity: int,
    actor: str,
) -> dict | None:
    """
    Update physical stock, recalculate available stock,
    and record the stock correction movement.
    """

    item = (
        inventory_collection.find_one(
            {
                "inventory_id": inventory_id,
                "branch_id": branch_id,
            }
        )
    )

    if item is None:
        return None

    reserved_quantity = item.get(
        "reserved_quantity",
        0,
    )

    old_physical_quantity = item.get(
        "physical_quantity",
        0,
    )

    if physical_quantity < 0:
        raise ValueError(
            "Physical quantity cannot be negative."
        )

    if physical_quantity < reserved_quantity:
        raise ValueError(
            "Physical quantity cannot be lower "
            "than reserved quantity."
        )

    quantity_change = (
        physical_quantity
        - old_physical_quantity
    )

    available_quantity = (
        physical_quantity
        - reserved_quantity
    )

    updated_item = (
        inventory_collection.find_one_and_update(
            {
                "inventory_id": inventory_id,
                "branch_id": branch_id,
            },
            {
                "$set": {
                    "physical_quantity":
                        physical_quantity,

                    "available_quantity":
                        available_quantity,

                    "last_updated":
                        _utc_now(),
                }
            },
            return_document=
                ReturnDocument.AFTER,
        )
    )

    # Record only real stock changes.
    if quantity_change != 0:
        _record_stock_movement(
            inventory=updated_item,
            actor=actor,
            movement_type=
                StockMovementType.CORRECTION,
            physical_quantity_change=
                quantity_change,
        )

    return _serialize_inventory(
        updated_item
    )


def update_inventory_details(
    inventory_id: str,
    branch_id: str,
    data: InventoryDetailsUpdate,
) -> dict | None:
    """
    Update price, reorder level and/or online visibility.
    """

    updates = data.model_dump(
        exclude_none=True
    )

    if not updates:
        return get_inventory_item(
            inventory_id,
            branch_id,
        )

    updates["last_updated"] = (
        _utc_now()
    )

    updated_item = (
        inventory_collection.find_one_and_update(
            {
                "inventory_id": inventory_id,
                "branch_id": branch_id,
            },
            {
                "$set": updates
            },
            return_document=
                ReturnDocument.AFTER,
        )
    )

    return _serialize_inventory(
        updated_item
    )


# =========================================================
# STAGE 5 - STOCK INTAKE / CSV VALIDATION
# =========================================================

REQUIRED_INTAKE_COLUMNS = {
    "product_id",
    "quantity",
    "price",
}

OPTIONAL_INTAKE_COLUMNS = {
    "reorder_level",
    "online_visibility",
}


def _parse_intake_boolean(
    value: str | None,
) -> bool:
    """
    Convert common CSV boolean values into True / False.

    Empty values default to True.
    """

    if value is None or not value.strip():
        return True

    normalized = (
        value.strip().lower()
    )

    if normalized in {
        "true",
        "1",
        "yes",
        "y",
        "online",
    }:
        return True

    if normalized in {
        "false",
        "0",
        "no",
        "n",
        "offline",
    }:
        return False

    raise ValueError(
        "online_visibility must be "
        "true/false, yes/no, 1/0, "
        "or online/offline."
    )


def validate_inventory_csv(
    csv_text: str,
) -> InventoryIntakeValidationResponse:
    """
    Parse and validate inventory-intake CSV content.

    IMPORTANT:
    This function performs validation only.
    It does NOT write anything to MongoDB.
    """

    if not csv_text.strip():
        raise ValueError(
            "CSV file is empty."
        )

    reader = csv.DictReader(
        StringIO(csv_text)
    )

    if not reader.fieldnames:
        raise ValueError(
            "CSV header row is missing."
        )

    # Normalize column names.
    normalized_headers = {
        header.strip().lower()
        for header in reader.fieldnames
        if header
    }

    missing_columns = (
        REQUIRED_INTAKE_COLUMNS
        - normalized_headers
    )

    if missing_columns:
        missing = ", ".join(
            sorted(missing_columns)
        )

        raise ValueError(
            "Missing required CSV columns: "
            f"{missing}"
        )

    results: list[
        InventoryIntakeRowResult
    ] = []

    seen_product_ids: set[str] = set()

    # Row 1 is the CSV header,
    # so data begins at row 2.
    for row_number, raw_row in enumerate(
        reader,
        start=2,
    ):
        errors: list[str] = []

        # Normalize incoming keys and string values.
        row = {
            str(key).strip().lower():
                value.strip()
                if isinstance(value, str)
                else value
            for key, value
            in raw_row.items()
            if key is not None
        }

        product_id = (
            row.get("product_id")
            or ""
        ).strip()

        quantity_raw = (
            row.get("quantity")
            or ""
        ).strip()

        price_raw = (
            row.get("price")
            or ""
        ).strip()

        reorder_raw = (
            row.get("reorder_level")
            or ""
        ).strip()

        visibility_raw = (
            row.get("online_visibility")
            or ""
        ).strip()


        # -----------------------------------------
        # product_id
        # -----------------------------------------

        if not product_id:
            errors.append(
                "product_id is required."
            )

        elif product_id in seen_product_ids:
            errors.append(
                "Duplicate product_id in CSV."
            )

        else:
            seen_product_ids.add(
                product_id
            )


        # -----------------------------------------
        # quantity
        # -----------------------------------------

        quantity: int | None = None

        try:
            quantity = int(
                quantity_raw
            )

            if quantity < 0:
                errors.append(
                    "quantity must be greater "
                    "than or equal to 0."
                )

        except (TypeError, ValueError):
            errors.append(
                "quantity must be a whole number."
            )


        # -----------------------------------------
        # price
        # -----------------------------------------

        price: float | None = None

        try:
            price = float(
                price_raw
            )

            if price < 0:
                errors.append(
                    "price must be greater "
                    "than or equal to 0."
                )

        except (TypeError, ValueError):
            errors.append(
                "price must be a valid number."
            )


        # -----------------------------------------
        # reorder_level
        # -----------------------------------------

        reorder_level = 0

        if reorder_raw:
            try:
                reorder_level = int(
                    reorder_raw
                )

                if reorder_level < 0:
                    errors.append(
                        "reorder_level must be "
                        "greater than or equal to 0."
                    )

            except (
                TypeError,
                ValueError,
            ):
                errors.append(
                    "reorder_level must be "
                    "a whole number."
                )


        # -----------------------------------------
        # online_visibility
        # -----------------------------------------

        online_visibility = True

        try:
            online_visibility = (
                _parse_intake_boolean(
                    visibility_raw
                )
            )

        except ValueError as exc:
            errors.append(
                str(exc)
            )


        # -----------------------------------------
        # Build validated row
        # -----------------------------------------

        validated_data = None

        if (
            not errors
            and quantity is not None
            and price is not None
        ):
            validated_data = (
                InventoryIntakeRow(
                    product_id=
                        product_id,

                    quantity=
                        quantity,

                    price=
                        price,

                    reorder_level=
                        reorder_level,

                    online_visibility=
                        online_visibility,
                )
            )

        results.append(
            InventoryIntakeRowResult(
                row_number=
                    row_number,

                product_id=
                    product_id or None,

                valid=
                    not errors,

                errors=
                    errors,

                data=
                    validated_data,
            )
        )


    valid_rows = sum(
        1
        for result in results
        if result.valid
    )

    invalid_rows = (
        len(results)
        - valid_rows
    )

    return (
        InventoryIntakeValidationResponse(
            total_rows=
                len(results),

            valid_rows=
                valid_rows,

            invalid_rows=
                invalid_rows,

            rows=
                results,
        )
    )

def import_inventory_rows(
    rows: list[InventoryIntakeRow],
    branch_id: str,
    actor: str,
) -> dict:
    """
    Import confirmed, validated inventory rows.

    If a product does not yet exist for the branch:
        - create a new inventory record

    If it already exists:
        - add the imported quantity to physical stock
        - add the same quantity to available stock
        - update price, reorder level and visibility

    Every successful imported row creates an IMPORT
    stock-movement record.
    """

    imported_items: list[dict] = []
    failed = 0

    for row in rows:
        try:
            existing_item = (
                inventory_collection.find_one(
                    {
                        "product_id": row.product_id,
                        "branch_id": branch_id,
                    }
                )
            )

            # =================================================
            # EXISTING INVENTORY ITEM
            # =================================================

            if existing_item:
                updated_item = (
                    inventory_collection.find_one_and_update(
                        {
                            "inventory_id":
                                existing_item["inventory_id"],

                            "branch_id":
                                branch_id,
                        },
                        {
                            "$inc": {
                                "physical_quantity":
                                    row.quantity,

                                "available_quantity":
                                    row.quantity,
                            },
                            "$set": {
                                "price":
                                    row.price,

                                "reorder_level":
                                    row.reorder_level,

                                "online_visibility":
                                    row.online_visibility,

                                "last_updated":
                                    _utc_now(),
                            },
                        },
                        return_document=
                            ReturnDocument.AFTER,
                    )
                )

                _record_stock_movement(
                    inventory=updated_item,
                    actor=actor,
                    movement_type=
                        StockMovementType.IMPORT,
                    physical_quantity_change=
                        row.quantity,
                )

                imported_items.append(
                    _serialize_inventory(
                        updated_item
                    )
                )

                continue


            # =================================================
            # NEW INVENTORY ITEM
            # =================================================

            new_item = {
                "inventory_id":
                    f"inv_{uuid4().hex}",

                "product_id":
                    row.product_id,

                "branch_id":
                    branch_id,

                "physical_quantity":
                    row.quantity,

                "reserved_quantity":
                    0,

                "available_quantity":
                    row.quantity,

                "price":
                    row.price,

                "online_visibility":
                    row.online_visibility,

                "reorder_level":
                    row.reorder_level,

                "last_updated":
                    _utc_now(),
            }

            inventory_collection.insert_one(
                new_item
            )

            _record_stock_movement(
                inventory=new_item,
                actor=actor,
                movement_type=
                    StockMovementType.IMPORT,
                physical_quantity_change=
                    row.quantity,
            )

            imported_items.append(
                _serialize_inventory(
                    new_item
                )
            )

        except Exception:
            failed += 1


    return {
        "imported":
            len(imported_items),

        "failed":
            failed,

        "inventory_items":
            imported_items,
    }

def add_manual_stock(
    row: InventoryIntakeRow,
    branch_id: str,
    actor: str,
) -> dict:
    """
    Manually add stock for one product.

    If the product already exists:
        - add quantity to physical stock
        - add quantity to available stock
        - update price, reorder level and visibility

    If the product does not exist:
        - create its inventory record

    A MANUAL_ADD stock movement is created whenever
    quantity greater than zero is added.
    """

    existing_item = inventory_collection.find_one(
        {
            "product_id": row.product_id,
            "branch_id": branch_id,
        }
    )

    # =====================================================
    # EXISTING INVENTORY
    # =====================================================

    if existing_item:
        updated_item = inventory_collection.find_one_and_update(
            {
                "inventory_id": existing_item["inventory_id"],
                "branch_id": branch_id,
            },
            {
                "$inc": {
                    "physical_quantity": row.quantity,
                    "available_quantity": row.quantity,
                },
                "$set": {
                    "price": row.price,
                    "reorder_level": row.reorder_level,
                    "online_visibility": row.online_visibility,
                    "last_updated": _utc_now(),
                },
            },
            return_document=ReturnDocument.AFTER,
        )

        if row.quantity > 0:
            _record_stock_movement(
                inventory=updated_item,
                actor=actor,
                movement_type=StockMovementType.MANUAL_ADD,
                physical_quantity_change=row.quantity,
            )

        return _serialize_inventory(updated_item)

    # =====================================================
    # NEW INVENTORY
    # =====================================================

    new_item = {
        "inventory_id": f"inv_{uuid4().hex}",
        "product_id": row.product_id,
        "branch_id": branch_id,

        "physical_quantity": row.quantity,
        "reserved_quantity": 0,
        "available_quantity": row.quantity,

        "price": row.price,
        "online_visibility": row.online_visibility,
        "reorder_level": row.reorder_level,

        "last_updated": _utc_now(),
    }

    inventory_collection.insert_one(new_item)

    if row.quantity > 0:
        _record_stock_movement(
            inventory=new_item,
            actor=actor,
            movement_type=StockMovementType.MANUAL_ADD,
            physical_quantity_change=row.quantity,
        )

    return _serialize_inventory(new_item)

def get_inventory_dashboard(
    branch_id: str,
    recent_limit: int = 10,
) -> dict:
    """
    Build inventory dashboard data for one pharmacy branch.
    """

    inventory_items = list(
        inventory_collection.find(
            {
                "branch_id": branch_id
            }
        )
    )

    total_products = len(
        inventory_items
    )

    low_stock_items = []
    out_of_stock_items = []

    online_products = 0
    offline_products = 0

    total_physical_units = 0
    total_reserved_units = 0
    total_available_units = 0

    # =====================================================
    # INVENTORY SUMMARY
    # =====================================================

    for item in inventory_items:
        physical_quantity = item.get(
            "physical_quantity",
            0,
        )

        reserved_quantity = item.get(
            "reserved_quantity",
            0,
        )

        available_quantity = item.get(
            "available_quantity",
            physical_quantity - reserved_quantity,
        )

        reorder_level = item.get(
            "reorder_level",
            0,
        )

        online_visibility = item.get(
            "online_visibility",
            True,
        )

        total_physical_units += (
            physical_quantity
        )

        total_reserved_units += (
            reserved_quantity
        )

        total_available_units += (
            available_quantity
        )

        # -----------------------------------------
        # Visibility
        # -----------------------------------------

        if online_visibility:
            online_products += 1
        else:
            offline_products += 1

        # -----------------------------------------
        # Stock status
        # -----------------------------------------

        if available_quantity <= 0:
            out_of_stock_items.append(
                _serialize_inventory(
                    item
                )
            )

        elif available_quantity <= reorder_level:
            low_stock_items.append(
                _serialize_inventory(
                    item
                )
            )

    # =====================================================
    # RECENT STOCK MOVEMENTS
    # =====================================================

    movement_cursor = (
        stock_movements_collection.find(
            {
                "branch_id": branch_id
            }
        )
        .sort(
            "timestamp",
            -1,
        )
        .limit(
            recent_limit
        )
    )

    recent_movements = [
        _serialize_stock_movement(
            movement
        )
        for movement in movement_cursor
    ]

    return {
        "summary": {
            "total_products":
                total_products,

            "low_stock_products":
                len(low_stock_items),

            "out_of_stock_products":
                len(out_of_stock_items),

            "online_products":
                online_products,

            "offline_products":
                offline_products,

            "total_physical_units":
                total_physical_units,

            "total_reserved_units":
                total_reserved_units,

            "total_available_units":
                total_available_units,
        },

        "low_stock_items":
            low_stock_items,

        "out_of_stock_items":
            out_of_stock_items,

        "recent_movements":
            recent_movements,
    }