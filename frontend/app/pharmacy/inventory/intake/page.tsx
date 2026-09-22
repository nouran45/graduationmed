"use client"

import { ChangeEvent, FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    FileSpreadsheet,
    Loader2,
    PackagePlus,
    Upload,
    XCircle,
} from "lucide-react"

import {
    addManualStock,
    importInventoryRows,
    InventoryImportResult,
    InventoryIntakeValidationResponse,
    InventoryItem,
    validateInventoryCsv,
} from "@/lib/inventory-api"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"


const DEV_BRANCH_ID =
    process.env.NEXT_PUBLIC_P4_BRANCH_ID || ""

const DEV_ACTOR_ID =
    process.env.NEXT_PUBLIC_P4_ACTOR_ID || ""


// =========================================================
// PAGE
// =========================================================

export default function InventoryIntakePage() {
    // =====================================================
    // MANUAL ENTRY STATE
    // =====================================================

    const [productId, setProductId] = useState("")
    const [quantity, setQuantity] = useState("")
    const [price, setPrice] = useState("")
    const [reorderLevel, setReorderLevel] = useState("0")
    const [onlineVisibility, setOnlineVisibility] = useState(true)

    const [manualLoading, setManualLoading] = useState(false)
    const [manualError, setManualError] = useState("")
    const [manualResult, setManualResult] =
        useState<InventoryItem | null>(null)


    // =====================================================
    // CSV STATE
    // =====================================================

    const [csvFileName, setCsvFileName] = useState("")
    const [csvText, setCsvText] = useState("")

    const [validationResult, setValidationResult] =
        useState<InventoryIntakeValidationResponse | null>(null)

    const [csvError, setCsvError] = useState("")

    const [validating, setValidating] = useState(false)
    const [importing, setImporting] = useState(false)

    const [importResult, setImportResult] =
        useState<InventoryImportResult | null>(null)

    const [importComplete, setImportComplete] =
        useState(false)


    // =====================================================
    // MANUAL ENTRY
    // =====================================================

    async function handleManualSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()

        setManualError("")
        setManualResult(null)

        if (!DEV_BRANCH_ID || !DEV_ACTOR_ID) {
            setManualError(
                "Development branch or actor configuration is missing."
            )
            return
        }

        const cleanProductId = productId.trim()

        const parsedQuantity = Number(quantity)
        const parsedPrice = Number(price)
        const parsedReorder = Number(reorderLevel)

        if (!cleanProductId) {
            setManualError(
                "Product ID is required."
            )
            return
        }

        if (
            !Number.isInteger(parsedQuantity) ||
            parsedQuantity < 0
        ) {
            setManualError(
                "Quantity must be a whole number greater than or equal to 0."
            )
            return
        }

        if (
            !Number.isFinite(parsedPrice) ||
            parsedPrice < 0
        ) {
            setManualError(
                "Price must be greater than or equal to 0."
            )
            return
        }

        if (
            !Number.isInteger(parsedReorder) ||
            parsedReorder < 0
        ) {
            setManualError(
                "Reorder level must be a whole number greater than or equal to 0."
            )
            return
        }

        try {
            setManualLoading(true)

            const result = await addManualStock(
                {
                    product_id: cleanProductId,
                    quantity: parsedQuantity,
                    price: parsedPrice,
                    reorder_level: parsedReorder,
                    online_visibility: onlineVisibility,
                },
                {
                    branchId: DEV_BRANCH_ID,
                    actorId: DEV_ACTOR_ID,
                }
            )

            setManualResult(result)

            // Clear the form after a successful intake.
            setProductId("")
            setQuantity("")
            setPrice("")
            setReorderLevel("0")
            setOnlineVisibility(true)

        } catch (error) {
            setManualError(
                error instanceof Error
                    ? error.message
                    : "Unable to add stock."
            )

        } finally {
            setManualLoading(false)
        }
    }


    // =====================================================
    // CSV FILE SELECTION
    // =====================================================

    async function handleCsvFileChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[0]

        setCsvError("")
        setValidationResult(null)
        setImportResult(null)
        setImportComplete(false)

        if (!file) {
            setCsvFileName("")
            setCsvText("")
            return
        }

        if (
            !file.name.toLowerCase().endsWith(".csv")
        ) {
            setCsvError(
                "Please choose a CSV file."
            )
            setCsvFileName("")
            setCsvText("")
            return
        }

        try {
            const text = await file.text()

            if (!text.trim()) {
                setCsvError(
                    "The selected CSV file is empty."
                )
                setCsvFileName("")
                setCsvText("")
                return
            }

            setCsvFileName(file.name)
            setCsvText(text)

        } catch {
            setCsvError(
                "Unable to read the selected CSV file."
            )
        }
    }


    // =====================================================
    // CSV VALIDATION
    // =====================================================

    async function handleValidateCsv() {
        setCsvError("")
        setValidationResult(null)
        setImportResult(null)
        setImportComplete(false)

        if (!DEV_BRANCH_ID) {
            setCsvError(
                "Development branch configuration is missing."
            )
            return
        }

        if (!csvText.trim()) {
            setCsvError(
                "Choose a CSV file first."
            )
            return
        }

        try {
            setValidating(true)

            const result =
                await validateInventoryCsv(
                    csvText,
                    {
                        branchId:
                            DEV_BRANCH_ID,
                    }
                )

            setValidationResult(
                result
            )

        } catch (error) {
            setCsvError(
                error instanceof Error
                    ? error.message
                    : "Unable to validate CSV."
            )

        } finally {
            setValidating(false)
        }
    }


    // =====================================================
    // VALID ROWS
    // =====================================================

    const validRows = useMemo(() => {
        if (!validationResult) {
            return []
        }

        return validationResult.rows
            .filter(
                (row) =>
                    row.valid &&
                    row.data !== null
            )
            .map(
                (row) => row.data!
            )
    }, [validationResult])


    // =====================================================
    // CONFIRMED IMPORT
    // =====================================================

    async function handleConfirmImport() {
        setCsvError("")
        setImportResult(null)

        if (
            !DEV_BRANCH_ID ||
            !DEV_ACTOR_ID
        ) {
            setCsvError(
                "Development branch or actor configuration is missing."
            )
            return
        }

        if (validRows.length === 0) {
            setCsvError(
                "There are no valid rows to import."
            )
            return
        }

        try {
            setImporting(true)

            const result =
                await importInventoryRows(
                    validRows,
                    {
                        branchId:
                            DEV_BRANCH_ID,

                        actorId:
                            DEV_ACTOR_ID,
                    }
                )

            setImportResult(
                result
            )

            setImportComplete(
                true
            )

        } catch (error) {
            setCsvError(
                error instanceof Error
                    ? error.message
                    : "Unable to import inventory."
            )

        } finally {
            setImporting(false)
        }
    }


    // =====================================================
    // UI
    // =====================================================

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="border-b bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <div>
                        <p className="text-lg font-semibold text-secondary">
                            MediCheck
                        </p>

                        <p className="text-xs text-gray-500">
                            Pharmacy inventory
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        asChild
                    >
                        <Link href="/pharmacy/inventory">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to inventory
                        </Link>
                    </Button>
                </div>
            </div>


            <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                {/* Page title */}
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                        Stock Intake
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        Add stock manually or validate and import inventory from a CSV file.
                    </p>
                </div>


                {/* Information */}
                <Alert>
                    <AlertCircle className="h-4 w-4" />

                    <AlertDescription>
                        CSV files are validated before anything is written to inventory.
                        Only confirmed valid rows are imported.
                    </AlertDescription>
                </Alert>


                <Tabs
                    defaultValue="manual"
                    className="space-y-5"
                >
                    <TabsList>
                        <TabsTrigger value="manual">
                            <PackagePlus className="mr-2 h-4 w-4" />
                            Manual Entry
                        </TabsTrigger>

                        <TabsTrigger value="csv">
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            CSV Import
                        </TabsTrigger>
                    </TabsList>


                    {/* =========================================
                        MANUAL ENTRY
                    ========================================== */}

                    <TabsContent value="manual">
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Add Stock Manually
                                </CardTitle>

                                <CardDescription>
                                    Add inventory for one product. If the product already exists,
                                    the entered quantity will be added to its current stock.
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                <form
                                    onSubmit={handleManualSubmit}
                                    className="space-y-6"
                                >
                                    <div className="grid gap-5 md:grid-cols-2">
                                        {/* Product */}
                                        <div className="space-y-2">
                                            <Label htmlFor="product-id">
                                                Product ID
                                            </Label>

                                            <Input
                                                id="product-id"
                                                placeholder="e.g. prod_001"
                                                value={productId}
                                                onChange={(event) =>
                                                    setProductId(
                                                        event.target.value
                                                    )
                                                }
                                            />

                                            <p className="text-xs text-gray-500">
                                                Product catalog lookup will be integrated with the shared catalog.
                                            </p>
                                        </div>


                                        {/* Quantity */}
                                        <div className="space-y-2">
                                            <Label htmlFor="quantity">
                                                Quantity to add
                                            </Label>

                                            <Input
                                                id="quantity"
                                                type="number"
                                                min="0"
                                                step="1"
                                                placeholder="0"
                                                value={quantity}
                                                onChange={(event) =>
                                                    setQuantity(
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>


                                        {/* Price */}
                                        <div className="space-y-2">
                                            <Label htmlFor="price">
                                                Price
                                            </Label>

                                            <Input
                                                id="price"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={price}
                                                onChange={(event) =>
                                                    setPrice(
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>


                                        {/* Reorder */}
                                        <div className="space-y-2">
                                            <Label htmlFor="reorder">
                                                Reorder level
                                            </Label>

                                            <Input
                                                id="reorder"
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={reorderLevel}
                                                onChange={(event) =>
                                                    setReorderLevel(
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>


                                    {/* Visibility */}
                                    <div className="flex items-center justify-between rounded-lg border bg-gray-50 p-4">
                                        <div>
                                            <Label htmlFor="visibility">
                                                Online visibility
                                            </Label>

                                            <p className="mt-1 text-xs text-gray-500">
                                                Allow this inventory item to be visible online.
                                            </p>
                                        </div>

                                        <Switch
                                            id="visibility"
                                            checked={onlineVisibility}
                                            onCheckedChange={
                                                setOnlineVisibility
                                            }
                                        />
                                    </div>


                                    {/* Error */}
                                    {manualError && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />

                                            <AlertDescription>
                                                {manualError}
                                            </AlertDescription>
                                        </Alert>
                                    )}


                                    {/* Success */}
                                    {manualResult && (
                                        <Alert className="border-emerald-200 bg-emerald-50">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-700" />

                                            <AlertDescription className="text-emerald-800">
                                                Stock added successfully.{" "}
                                                <strong>
                                                    {manualResult.product_id}
                                                </strong>{" "}
                                                now has{" "}
                                                <strong>
                                                    {manualResult.physical_quantity}
                                                </strong>{" "}
                                                physical units.
                                            </AlertDescription>
                                        </Alert>
                                    )}


                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={manualLoading}
                                        >
                                            {manualLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Adding stock...
                                                </>
                                            ) : (
                                                <>
                                                    <PackagePlus className="mr-2 h-4 w-4" />
                                                    Add Stock
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>


                    {/* =========================================
                        CSV IMPORT
                    ========================================== */}

                    <TabsContent
                        value="csv"
                        className="space-y-5"
                    >
                        {/* Upload */}
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Import Inventory from CSV
                                </CardTitle>

                                <CardDescription>
                                    Upload a CSV file, review validation results,
                                    then confirm the valid rows.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
                                    <Upload className="mx-auto h-8 w-8 text-gray-400" />

                                    <p className="mt-3 text-sm font-medium text-gray-700">
                                        Choose a CSV file
                                    </p>

                                    <p className="mt-1 text-xs text-gray-500">
                                        The file will be validated before import.
                                    </p>

                                    <div className="mx-auto mt-4 max-w-sm">
                                        <Input
                                            type="file"
                                            accept=".csv,text/csv"
                                            onChange={
                                                handleCsvFileChange
                                            }
                                        />
                                    </div>

                                    {csvFileName && (
                                        <p className="mt-3 text-sm text-gray-600">
                                            Selected:{" "}
                                            <span className="font-medium">
                                                {csvFileName}
                                            </span>
                                        </p>
                                    )}
                                </div>


                                {/* Format */}
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-lg border p-4">
                                        <p className="text-sm font-medium text-gray-900">
                                            Required columns
                                        </p>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Badge variant="secondary">
                                                product_id
                                            </Badge>

                                            <Badge variant="secondary">
                                                quantity
                                            </Badge>

                                            <Badge variant="secondary">
                                                price
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border p-4">
                                        <p className="text-sm font-medium text-gray-900">
                                            Optional columns
                                        </p>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Badge variant="outline">
                                                reorder_level
                                            </Badge>

                                            <Badge variant="outline">
                                                online_visibility
                                            </Badge>
                                        </div>
                                    </div>
                                </div>


                                {csvError && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />

                                        <AlertDescription>
                                            {csvError}
                                        </AlertDescription>
                                    </Alert>
                                )}


                                <div className="flex justify-end">
                                    <Button
                                        onClick={
                                            handleValidateCsv
                                        }
                                        disabled={
                                            !csvText ||
                                            validating
                                        }
                                    >
                                        {validating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Validating...
                                            </>
                                        ) : (
                                            <>
                                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                                Validate CSV
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>


                        {/* =====================================
                            VALIDATION RESULTS
                        ====================================== */}

                        {validationResult && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Validation Results
                                    </CardTitle>

                                    <CardDescription>
                                        Review all rows before confirming the import.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-6">
                                    {/* Stats */}
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <div className="rounded-lg border p-4">
                                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                                Total rows
                                            </p>

                                            <p className="mt-2 text-2xl font-semibold text-gray-900">
                                                {validationResult.total_rows}
                                            </p>
                                        </div>

                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                                            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                                                Valid
                                            </p>

                                            <p className="mt-2 text-2xl font-semibold text-emerald-800">
                                                {validationResult.valid_rows}
                                            </p>
                                        </div>

                                        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                                            <p className="text-xs font-medium uppercase tracking-wide text-red-700">
                                                Invalid
                                            </p>

                                            <p className="mt-2 text-2xl font-semibold text-red-800">
                                                {validationResult.invalid_rows}
                                            </p>
                                        </div>
                                    </div>


                                    {/* Results table */}
                                    <div className="overflow-hidden rounded-lg border">
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>
                                                            Row
                                                        </TableHead>

                                                        <TableHead>
                                                            Product
                                                        </TableHead>

                                                        <TableHead>
                                                            Quantity
                                                        </TableHead>

                                                        <TableHead>
                                                            Price
                                                        </TableHead>

                                                        <TableHead>
                                                            Status
                                                        </TableHead>

                                                        <TableHead>
                                                            Details
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>

                                                <TableBody>
                                                    {validationResult.rows.map(
                                                        (row) => (
                                                            <TableRow
                                                                key={
                                                                    row.row_number
                                                                }
                                                            >
                                                                <TableCell>
                                                                    {row.row_number}
                                                                </TableCell>

                                                                <TableCell className="font-medium">
                                                                    {row.product_id ||
                                                                        "—"}
                                                                </TableCell>

                                                                <TableCell>
                                                                    {row.data?.quantity ??
                                                                        "—"}
                                                                </TableCell>

                                                                <TableCell>
                                                                    {row.data
                                                                        ? row.data.price.toFixed(
                                                                              2
                                                                          )
                                                                        : "—"}
                                                                </TableCell>

                                                                <TableCell>
                                                                    {row.valid ? (
                                                                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                                                            <CheckCircle2 className="mr-1 h-3 w-3" />
                                                                            Valid
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge className="border-red-200 bg-red-50 text-red-700 hover:bg-red-50">
                                                                            <XCircle className="mr-1 h-3 w-3" />
                                                                            Invalid
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>

                                                                <TableCell className="max-w-sm">
                                                                    {row.errors.length >
                                                                    0 ? (
                                                                        <ul className="space-y-1 text-xs text-red-700">
                                                                            {row.errors.map(
                                                                                (
                                                                                    error,
                                                                                    index
                                                                                ) => (
                                                                                    <li
                                                                                        key={
                                                                                            index
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            error
                                                                                        }
                                                                                    </li>
                                                                                )
                                                                            )}
                                                                        </ul>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-500">
                                                                            Ready to import
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>


                                    {/* Import success */}
                                    {importResult && (
                                        <Alert className="border-emerald-200 bg-emerald-50">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-700" />

                                            <AlertDescription className="text-emerald-800">
                                                Import completed.{" "}
                                                <strong>
                                                    {importResult.imported}
                                                </strong>{" "}
                                                row(s) imported and{" "}
                                                <strong>
                                                    {importResult.failed}
                                                </strong>{" "}
                                                failed.
                                            </AlertDescription>
                                        </Alert>
                                    )}


                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm text-gray-500">
                                            {validationResult.invalid_rows >
                                            0
                                                ? `${validationResult.invalid_rows} invalid row(s) will not be imported.`
                                                : "All rows passed validation."}
                                        </p>

                                        <Button
                                            onClick={
                                                handleConfirmImport
                                            }
                                            disabled={
                                                validRows.length ===
                                                    0 ||
                                                importing ||
                                                importComplete
                                            }
                                        >
                                            {importing ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Importing...
                                                </>
                                            ) : importComplete ? (
                                                <>
                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                    Import Complete
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Confirm Import{" "}
                                                    {
                                                        validRows.length
                                                    }{" "}
                                                    Valid Row
                                                    {validRows.length ===
                                                    1
                                                        ? ""
                                                        : "s"}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    )
}