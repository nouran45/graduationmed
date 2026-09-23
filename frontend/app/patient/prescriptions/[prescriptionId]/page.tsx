"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  CheckCircle2,
  Clock3,
  FileText,
  Pill,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import {
  getPrescription,
  type PrescriptionResponse,
} from "@/lib/api/prescriptions";


export default function PatientPrescriptionResultPage() {
  const params = useParams<{
    prescriptionId: string;
  }>();

  const prescriptionId = params.prescriptionId;

  const [prescription, setPrescription] =
    useState<PrescriptionResponse | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);


  async function loadPrescription(
    refresh = false,
  ) {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const data =
        await getPrescription(
          prescriptionId,
        );

      setPrescription(data);

    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The prescription could not be loaded.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }


  useEffect(() => {
    void loadPrescription();
  }, [prescriptionId]);


  if (isLoading) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border bg-background p-8 shadow-sm">
          <p className="text-sm text-gray-500">
            Loading prescription...
          </p>
        </div>
      </main>
    );
  }


  if (error && !prescription) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>

          <Link
            href="/patient/prescriptions/upload"
            className="mt-5 inline-flex text-sm font-semibold text-primary"
          >
            Back to prescription upload
          </Link>
        </div>
      </main>
    );
  }


  if (!prescription) {
    return null;
  }


  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Header */}

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <ShieldCheck className="h-4 w-4" />
              Prescription safety
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-secondary sm:text-4xl">
              Prescription status
            </h1>

            <p className="mt-2 break-all text-sm text-gray-500">
              {prescription.prescription_id}
            </p>
          </div>


          <button
            type="button"
            disabled={isRefreshing}
            onClick={() =>
              void loadPrescription(true)
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold text-secondary shadow-sm transition hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isRefreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh status
          </button>
        </div>


        {/* Status */}

        <PrescriptionStatusBanner
          prescription={prescription}
        />


        {/* Basic information */}

        <section className="mt-6 rounded-2xl border bg-background p-6 shadow-sm">

          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-3">
              <FileText className="h-5 w-5 text-primary" />
            </div>

            <div>
              <h2 className="font-semibold text-secondary">
                Prescription details
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Information about your uploaded
                prescription.
              </p>
            </div>
          </div>


          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <InfoCard
              label="File"
              value={
                prescription.file.original_name
              }
            />

            <InfoCard
              label="Status"
              value={prescription.status.replaceAll(
                "_",
                " ",
              )}
            />

            <InfoCard
              label="OCR status"
              value={prescription.ocr_status.replaceAll(
                "_",
                " ",
              )}
            />

            <InfoCard
              label="Pharmacy branch"
              value={prescription.branch_id}
            />

          </div>
        </section>


        {/* PENDING STATE */}

        {prescription.status ===
          "pending_review" && (
          <PendingPrescription
            prescription={prescription}
          />
        )}


        {/* REVIEWED STATE */}

        {prescription.status ===
          "reviewed" && (
          <ReviewedPrescription
            prescription={prescription}
          />
        )}


        {/* REJECTED STATE */}

        {prescription.status ===
          "rejected" && (
          <RejectedPrescription
            prescription={prescription}
          />
        )}


        {/* Cancelled */}

        {prescription.status ===
          "cancelled" && (
          <section className="mt-6 rounded-2xl border bg-background p-6 shadow-sm">

            <div className="flex gap-3">
              <XCircle className="h-6 w-6 shrink-0 text-gray-500" />

              <div>
                <h2 className="font-semibold text-secondary">
                  Prescription cancelled
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  This prescription is no longer
                  active.
                </p>
              </div>
            </div>

          </section>
        )}


        <div className="mt-8">
          <Link
            href="/patient/prescriptions/upload"
            className="text-sm font-semibold text-primary"
          >
            Upload another prescription
          </Link>
        </div>

      </div>
    </main>
  );
}


function PrescriptionStatusBanner({
  prescription,
}: {
  prescription: PrescriptionResponse;
}) {
  if (
    prescription.status === "reviewed"
  ) {
    return (
      <div className="flex gap-3 rounded-2xl border border-green-200 bg-green-50 p-5">

        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-700" />

        <div>
          <p className="font-semibold text-green-900">
            Pharmacist review completed
          </p>

          <p className="mt-1 text-sm leading-5 text-green-800">
            The medication information below
            reflects the pharmacist-reviewed
            result.
          </p>
        </div>

      </div>
    );
  }


  if (
    prescription.status === "rejected"
  ) {
    return (
      <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">

        <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-700" />

        <div>
          <p className="font-semibold text-red-900">
            Prescription could not be confirmed
          </p>

          <p className="mt-1 text-sm leading-5 text-red-800">
            The pharmacy rejected this
            prescription during review.
          </p>
        </div>

      </div>
    );
  }


  return (
    <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">

      <Clock3 className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />

      <div>
        <p className="font-semibold text-amber-900">
          Waiting for pharmacist review
        </p>

        <p className="mt-1 text-sm leading-5 text-amber-800">
          Your prescription has been uploaded.
          The extracted information is not final
          until a pharmacist reviews it.
        </p>
      </div>

    </div>
  );
}


function PendingPrescription({
  prescription,
}: {
  prescription: PrescriptionResponse;
}) {
  return (
    <section className="mt-6 rounded-2xl border bg-background p-6 shadow-sm">

      <h2 className="font-semibold text-secondary">
        Review in progress
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        MediCheck has created an extraction
        draft, but it has not been confirmed by
        a pharmacist yet.
      </p>


      {prescription.ocr_items.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Unconfirmed OCR draft
          </p>

          <p className="mt-2 text-sm text-amber-900">
            This information is shown only as a
            processing preview and must not be
            treated as final medication
            instructions.
          </p>

          <div className="mt-4 space-y-2">
            {prescription.ocr_items.map(
              (item) => (
                <p
                  key={item.line_id}
                  className="text-sm text-amber-900"
                >
                  {item.raw_text}
                </p>
              ),
            )}
          </div>

        </div>
      )}

    </section>
  );
}


function ReviewedPrescription({
  prescription,
}: {
  prescription: PrescriptionResponse;
}) {
  return (
    <section className="mt-6 rounded-2xl border bg-background p-6 shadow-sm">

      <div className="flex items-start gap-3">

        <div className="rounded-xl bg-green-100 p-3">
          <Pill className="h-5 w-5 text-green-700" />
        </div>

        <div>
          <h2 className="font-semibold text-secondary">
            Pharmacist-confirmed medications
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            These values come from the
            pharmacist review, not directly from
            OCR.
          </p>
        </div>

      </div>


      <div className="mt-6 space-y-4">

        {prescription.reviewed_items.map(
          (item, index) => (
            <article
              key={item.line_id}
              className="rounded-2xl border p-5"
            >

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Medication {index + 1}
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-secondary">
                    {item.confirmed_name}
                  </h3>
                </div>


                <CatalogMatchBadge
                  medicationId={
                    item.medication_id
                  }
                />

              </div>


              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <Field
                  label="Strength"
                  value={
                    item.strength ??
                    "Not specified"
                  }
                />

                <Field
                  label="Dosage form"
                  value={
                    item.dosage_form ??
                    "Not specified"
                  }
                />

                <Field
                  label="Directions"
                  value={
                    item.directions ??
                    "Not specified"
                  }
                />

                <Field
                  label="Quantity"
                  value={
                    item.quantity === null
                      ? "Not specified"
                      : String(
                          item.quantity,
                        )
                  }
                />

              </div>


              {item.pharmacist_notes && (
                <div className="mt-5 rounded-xl bg-muted/40 p-4">

                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Pharmacist notes
                  </p>

                  <p className="mt-2 text-sm text-secondary">
                    {
                      item.pharmacist_notes
                    }
                  </p>

                </div>
              )}

            </article>
          ),
        )}

      </div>


      {prescription.review_notes && (
        <div className="mt-6 rounded-xl bg-muted/40 p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Overall review notes
          </p>

          <p className="mt-2 text-sm text-secondary">
            {prescription.review_notes}
          </p>

        </div>
      )}

    </section>
  );
}


function RejectedPrescription({
  prescription,
}: {
  prescription: PrescriptionResponse;
}) {
  return (
    <section className="mt-6 rounded-2xl border bg-background p-6 shadow-sm">

      <div className="flex gap-3">

        <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />

        <div>
          <h2 className="font-semibold text-secondary">
            Pharmacy review result
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            No medication result has been
            confirmed from this prescription.
          </p>
        </div>

      </div>


      {prescription.review_notes && (
        <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Pharmacist note
          </p>

          <p className="mt-2 text-sm text-red-900">
            {prescription.review_notes}
          </p>

        </div>
      )}

    </section>
  );
}


function CatalogMatchBadge({
  medicationId,
}: {
  medicationId: string | null;
}) {
  if (medicationId) {
    return (
      <div className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
        Catalog linked
      </div>
    );
  }

  return (
    <div className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
      Catalog match not linked yet
    </div>
  );
}


function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-muted/40 p-4">

      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-2 break-all text-sm font-medium capitalize text-secondary">
        {value}
      </p>

    </div>
  );
}


function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium capitalize text-secondary">
        {value}
      </p>
    </div>
  );
}