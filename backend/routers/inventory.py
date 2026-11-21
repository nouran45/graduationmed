from fastapi import APIRouter, Depends, HTTPException, status

from schemas.inventory import (
    InventoryCreate,
    InventoryCsvValidationRequest,
    InventoryDashboardResponse,
    InventoryDetailsUpdate,
    InventoryImportRequest,
    InventoryImportResult,
    InventoryIntakeRow,
    InventoryIntakeValidationResponse,
    InventoryQuantityUpdate,
    InventoryResponse,
    StockMovementResponse,
)

from security import audit_events as audit
from security.authorization import BranchContext, branch_permission
from security.rate_limit import rate_limit

from services.inventory_service import (
    add_manual_stock,
    create_inventory_item,
    get_inventory_dashboard,
    get_inventory_item,
    import_inventory_rows,
    list_inventory,
    list_stock_movements,
    update_inventory_details,
    update_quantity,
    validate_inventory_csv,
)


router = APIRouter(
    prefix="/api/inventory",
    tags=["Inventory"],
)


# =========================================================
# TRUSTED BRANCH + ACTOR
#
# Replaces the old X-Branch-ID / X-Actor-ID header dependencies.
#
#   read_ctx  = pharmacy staff allowed to see stock at the branch
#   write_ctx = owner or inventory manager of THAT branch
#
# ctx.user_id    : verified user  -> written to stock_movements.actor
# ctx.branch_id  : checked against the pharmacy_staff table
#
# X-Actor-ID is not read anywhere any more. X-Branch-ID is only a
# *selector* among branches the caller already has access to.
# =========================================================

read_ctx = branch_permission("inventory.read")
write_ctx = branch_permission("inventory.write")

_write_limit = rate_limit("inventory_write", "admin_write_per_minute", 60)


def _completed(operation: str, **details) -> None:
    """Business-level audit event: a stock-changing operation succeeded."""
    audit.emit(
        "inventory.write.completed", outcome="success", resource_type="inventory",
        target_relation="own_branch", authorization_result="allowed",
        rule_id=audit.RULE_INV_OPS, details={"operation": operation, **details},
    )


def _rejected(reason: str, *, denied: bool = False) -> None:
    audit.emit(
        "inventory.write.rejected", outcome="denied" if denied else "rejected",
        resource_type="inventory", rule_id=audit.RULE_INV_BRANCH if denied else audit.RULE_INV_OPS,
        authorization_result="denied" if denied else None,
        target_relation="other_branch" if denied else None,
        details={"reason": reason},
    )


# =========================================================
# INVENTORY CREATE / LIST
# =========================================================

@router.post(
    "",
    response_model=InventoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory(
    data: InventoryCreate,
    ctx: BranchContext = Depends(write_ctx),
    _rl: None = Depends(_write_limit),
):
    if data.branch_id != ctx.branch_id:
        _rejected("foreign_branch", denied=True)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create inventory for another branch.",
        )

    try:
        created = create_inventory_item(
            data,
            ctx.user_id,
        )
        _completed("create")
        return created

    except ValueError as exc:
        _rejected("duplicate_item")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.get(
    "",
    response_model=list[InventoryResponse],
)
def get_inventory(
    ctx: BranchContext = Depends(read_ctx),
):
    return list_inventory(
        ctx.branch_id
    )


# =========================================================
# DASHBOARD
#
# IMPORTANT:
# Keep this BEFORE /{inventory_id}.
# Otherwise FastAPI may interpret "dashboard"
# as an inventory_id.
# =========================================================

@router.get(
    "/dashboard",
    response_model=InventoryDashboardResponse,
)
def inventory_dashboard(
    ctx: BranchContext = Depends(read_ctx),
):
    """
    Return inventory dashboard data for the caller's branch.
    """

    return get_inventory_dashboard(
        branch_id=ctx.branch_id,
    )


# =========================================================
# STOCK INTAKE - MANUAL
# =========================================================

@router.post(
    "/intake/manual",
    response_model=InventoryResponse,
)
def manual_stock_intake(
    payload: InventoryIntakeRow,
    ctx: BranchContext = Depends(write_ctx),
    _rl: None = Depends(_write_limit),
):
    """
    Manually add stock to one product.
    """

    result = add_manual_stock(
        row=payload,
        branch_id=ctx.branch_id,
        actor=ctx.user_id,
    )
    _completed("manual_intake")
    return result


# =========================================================
# STOCK INTAKE - CSV VALIDATION
# =========================================================

@router.post(
    "/intake/validate-csv",
    response_model=InventoryIntakeValidationResponse,
)
def validate_csv_intake(
    payload: InventoryCsvValidationRequest,
    ctx: BranchContext = Depends(write_ctx),
    _rl: None = Depends(_write_limit),
):
    """
    Validate CSV inventory intake data.

    Validation only: nothing is written to MongoDB.
    (Requires write permission because it is the first step of a write flow
    and it parses attacker-sized text.)
    """

    try:
        return validate_inventory_csv(
            payload.csv_text
        )

    except ValueError as exc:
        _rejected("invalid_csv")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# =========================================================
# STOCK INTAKE - CONFIRMED IMPORT
# =========================================================

@router.post(
    "/intake/import",
    response_model=InventoryImportResult,
)
def confirm_inventory_import(
    payload: InventoryImportRequest,
    ctx: BranchContext = Depends(write_ctx),
    _rl: None = Depends(_write_limit),
):
    """
    Import rows only after the frontend has shown
    validation results and the pharmacy confirms.
    """

    if not payload.rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one inventory row is required.",
        )

    result = import_inventory_rows(
        rows=payload.rows,
        branch_id=ctx.branch_id,
        actor=ctx.user_id,
    )
    _completed("import", row_count=len(payload.rows))
    return result


# =========================================================
# INVENTORY ITEM ROUTES
#
# Dynamic /{inventory_id} routes come AFTER static routes.
# =========================================================

@router.get(
    "/{inventory_id}",
    response_model=InventoryResponse,
)
def get_inventory_by_id(
    inventory_id: str,
    ctx: BranchContext = Depends(read_ctx),
):
    item = get_inventory_item(
        inventory_id,
        ctx.branch_id,
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found.",
        )

    return item


@router.patch(
    "/{inventory_id}/quantity",
    response_model=InventoryResponse,
)
def change_inventory_quantity(
    inventory_id: str,
    data: InventoryQuantityUpdate,
    ctx: BranchContext = Depends(write_ctx),
    _rl: None = Depends(_write_limit),
):
    try:
        item = update_quantity(
            inventory_id,
            ctx.branch_id,
            data.physical_quantity,
            ctx.user_id,
        )

    except ValueError as exc:
        _rejected("invalid_quantity")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found.",
        )

    _completed("quantity_update")
    return item


@router.patch(
    "/{inventory_id}/details",
    response_model=InventoryResponse,
)
def change_inventory_details(
    inventory_id: str,
    data: InventoryDetailsUpdate,
    ctx: BranchContext = Depends(write_ctx),
    _rl: None = Depends(_write_limit),
):
    item = update_inventory_details(
        inventory_id,
        ctx.branch_id,
        data,
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found.",
        )

    _completed("details_update")
    return item


@router.get(
    "/{inventory_id}/movements",
    response_model=list[StockMovementResponse],
)
def get_inventory_movements(
    inventory_id: str,
    ctx: BranchContext = Depends(read_ctx),
):
    item = get_inventory_item(
        inventory_id,
        ctx.branch_id,
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found.",
        )

    return list_stock_movements(
        inventory_id,
        ctx.branch_id,
    )
