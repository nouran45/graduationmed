from fastapi import APIRouter, Depends, Header, HTTPException, status

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
# TEMPORARY DEVELOPMENT SCOPE
# Person 5 must replace this with authenticated
# server-side pharmacy / branch scope.
# The frontend must NOT be trusted to choose its own branch.
# =========================================================

def get_branch_scope(
    x_branch_id: str = Header(..., alias="X-Branch-ID"),
) -> str:
    branch_id = x_branch_id.strip()

    if not branch_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Branch ID is required.",
        )

    return branch_id


# =========================================================
# TEMPORARY DEVELOPMENT ACTOR
# Person 5 must replace this with the authenticated
# server-side user ID from the JWT / current user.
# =========================================================

def get_actor_scope(
    x_actor_id: str = Header(..., alias="X-Actor-ID"),
) -> str:
    actor = x_actor_id.strip()

    if not actor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Actor ID is required.",
        )

    return actor


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
    branch_id: str = Depends(get_branch_scope),
    actor: str = Depends(get_actor_scope),
):
    if data.branch_id != branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create inventory for another branch.",
        )

    try:
        return create_inventory_item(
            data,
            actor,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.get(
    "",
    response_model=list[InventoryResponse],
)
def get_inventory(
    branch_id: str = Depends(get_branch_scope),
):
    return list_inventory(
        branch_id
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
    branch_id: str = Depends(get_branch_scope),
):
    """
    Return inventory dashboard data for the current branch.
    """

    return get_inventory_dashboard(
        branch_id=branch_id,
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
    branch_id: str = Depends(get_branch_scope),
    actor: str = Depends(get_actor_scope),
):
    """
    Manually add stock to one product.
    """

    return add_manual_stock(
        row=payload,
        branch_id=branch_id,
        actor=actor,
    )


# =========================================================
# STOCK INTAKE - CSV VALIDATION
# =========================================================

@router.post(
    "/intake/validate-csv",
    response_model=InventoryIntakeValidationResponse,
)
def validate_csv_intake(
    payload: InventoryCsvValidationRequest,
    branch_id: str = Depends(get_branch_scope),
):
    """
    Validate CSV inventory intake data.

    Validation only:
    nothing is written to MongoDB.
    """

    try:
        return validate_inventory_csv(
            payload.csv_text
        )

    except ValueError as exc:
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
    branch_id: str = Depends(get_branch_scope),
    actor: str = Depends(get_actor_scope),
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

    return import_inventory_rows(
        rows=payload.rows,
        branch_id=branch_id,
        actor=actor,
    )


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
    branch_id: str = Depends(get_branch_scope),
):
    item = get_inventory_item(
        inventory_id,
        branch_id,
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
    branch_id: str = Depends(get_branch_scope),
    actor: str = Depends(get_actor_scope),
):
    try:
        item = update_quantity(
            inventory_id,
            branch_id,
            data.physical_quantity,
            actor,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found.",
        )

    return item


@router.patch(
    "/{inventory_id}/details",
    response_model=InventoryResponse,
)
def change_inventory_details(
    inventory_id: str,
    data: InventoryDetailsUpdate,
    branch_id: str = Depends(get_branch_scope),
):
    item = update_inventory_details(
        inventory_id,
        branch_id,
        data,
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found.",
        )

    return item


@router.get(
    "/{inventory_id}/movements",
    response_model=list[StockMovementResponse],
)
def get_inventory_movements(
    inventory_id: str,
    branch_id: str = Depends(get_branch_scope),
):
    item = get_inventory_item(
        inventory_id,
        branch_id,
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found.",
        )

    return list_stock_movements(
        inventory_id,
        branch_id,
    )