"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import {
  DEMO_BRANCH_ID,
  getPharmacyPrescription,
  reviewPrescription,
  type PrescriptionResponse,
  type ReviewedMedication,
} from "@/lib/api/prescriptions";


export default function PharmacyPrescriptionReviewPage() {
  const params = useParams<{
    prescriptionId: string;
  }>();

  const router = useRouter();

  const prescriptionId =
    params.prescriptionId;


  const [prescription, setPrescription] =
    useState<PrescriptionResponse | null>(null);

  const [reviewedItems, setReviewedItems] =
    useState<ReviewedMedication[]>([]);

  const [reviewNotes, setReviewNotes] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);


  useEffect(() => {
    let active = true;

    async function loadPrescription() {
      try {
        const data =
          await getPharmacyPrescription(
            prescriptionId,
            DEMO_BRANCH_ID,
          );

        if (!active) {
          return;
        }

        setPrescription(data);

        setReviewedItems(
          data.ocr_items.map((item) => ({
            line_id: item.line_id,

            medication_id:
              item.matched_medication_id,

            confirmed_name:
              item.extracted_name ??
              item.raw_text,

            strength: item.strength,
            dosage_form: item.dosage_form,
            directions: item.directions,
            quantity: item.quantity,

            pharmacist_notes: null,
          })),
        );

      } catch (caughtError) {
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "The prescription could not be loaded.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadPrescription();

    return () => {
      active = false;
    };
  }, [prescriptionId]);


  function updateItem(
    index: number,
    field: keyof ReviewedMedication,
    value: string | number | null,
  ) {
    setReviewedItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }


  async function approvePrescription() {
    setError(null);
    setSuccess(null);

    if (
      reviewedItems.some(
        (item) =>
          !item.confirmed_name.trim(),
      )
    ) {
      setError(
        "Every reviewed medication must have a confirmed name.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const updated =
        await reviewPrescription(
          prescriptionId,
          DEMO_BRANCH_ID,
          {
            decision: "approve",
            reviewed_items: reviewedItems,
            review_notes:
              reviewNotes.trim() || null,
          },
        );

      setPrescription(updated);

      setSuccess(
        "Prescription reviewed successfully.",
      );

    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The review could not be saved.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }


  async function rejectPrescription() {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const updated =
        await reviewPrescription(
          prescriptionId,
          DEMO_BRANCH_ID,
          {
            decision: "reject",
            reviewed_items: [],
            review_notes:
              reviewNotes.trim() || null,
          },
        );

      setPrescription(updated);

      setSuccess(
        "Prescription rejected.",
      );

    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The review could not be saved.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }


  if (isLoading) {
    return (
      <main className="min-h-screen bg-muted/30 p-8">
        <div className="mx-auto max-w-6xl rounded-2xl border bg-background p-8">
          Loading prescription...
        </div>
      </main>
    );
  }


  if (error && !prescription) {
    return (
      <main className="min-h-screen bg-muted/30 p-8">
        <div className="mx-auto max-w-6xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      </main>
    );
  }


  if (!prescription) {
    return null;
  }


  const isAlreadyReviewed =
    prescription.status !==
    "pending_review";


  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        <button
          type="button"
          onClick={() =>
            router.push(
              "/pharmacy/prescriptions",
            )
          }
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to review queue
        </button>


        <div className="mb-8">

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <FileText className="h-4 w-4" />
            pharmacist review
          </div>

          <h1 className="text-3xl font-bold text-secondary">
            Review prescription
          </h1>

          <p className="mt-2 break-all text-sm text-gray-500">
            {prescription.prescription_id}
          </p>

        </div>


        <div className="mb-7 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">

          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

          <div>
            <p className="text-sm font-semibold text-amber-900">
              Verify extracted information
            </p>

            <p className="mt-1 text-sm leading-5 text-amber-800">
              The information below was extracted automatically and may contain errors. Review and correct each medication before approving the prescription.
            </p>
          </div>

        </div>


        <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">

          {/* Prescription information */}
          <aside className="rounded-2xl border bg-background p-6 shadow-sm">

            <h2 className="font-semibold text-secondary">
              Prescription details
            </h2>


            <div className="mt-5 space-y-5">

              <Detail
                label="Patient"
                value={prescription.patient_id}
              />

              <Detail
                label="Branch"
                value={prescription.branch_id}
              />

              <Detail
                label="File"
                value={
                  prescription.file.original_name
                }
              />

              <Detail
                label="OCR status"
                value={prescription.ocr_status.replaceAll(
                  "_",
                  " ",
                )}
              />

              <Detail
                label="Status"
                value={prescription.status.replaceAll(
                  "_",
                  " ",
                )}
              />

            </div>


            <div className="mt-6 rounded-xl bg-muted/40 p-4">

              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Original OCR text
              </p>

              <div className="mt-3 space-y-2">

                {prescription.ocr_items.map(
                  (item) => (
                    <p
                      key={item.line_id}
                      className="text-sm text-secondary"
                    >
                      {item.raw_text}
                    </p>
                  ),
                )}

              </div>
            </div>

          </aside>


          {/* Review editor */}
          <section className="rounded-2xl border bg-background p-6 shadow-sm">

            <div>
              <h2 className="font-semibold text-secondary">
                Medications review
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Edit each field to match the actual
                prescription before approval.
              </p>
            </div>


            <div className="mt-6 space-y-6">

              {reviewedItems.map(
                (item, index) => (
                  <div
                    key={item.line_id}
                    className="rounded-2xl border p-5"
                  >

                    <div className="mb-5 flex items-center justify-between">

                      <h3 className="font-semibold text-secondary">
                        Medication {index + 1}
                      </h3>

                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-gray-600">
                        {item.line_id}
                      </span>

                    </div>


                    <div className="grid gap-4 sm:grid-cols-2">

                      <InputField
                        label="Confirmed medication name"
                        value={item.confirmed_name}
                        disabled={isAlreadyReviewed}
                        onChange={(value) =>
                          updateItem(
                            index,
                            "confirmed_name",
                            value,
                          )
                        }
                      />

                      <InputField
                        label="Strength"
                        value={item.strength ?? ""}
                        disabled={isAlreadyReviewed}
                        onChange={(value) =>
                          updateItem(
                            index,
                            "strength",
                            value || null,
                          )
                        }
                      />

                      <InputField
                        label="Dosage form"
                        value={
                          item.dosage_form ?? ""
                        }
                        disabled={isAlreadyReviewed}
                        onChange={(value) =>
                          updateItem(
                            index,
                            "dosage_form",
                            value || null,
                          )
                        }
                      />

                      <InputField
                        label="Directions"
                        value={
                          item.directions ?? ""
                        }
                        disabled={isAlreadyReviewed}
                        onChange={(value) =>
                          updateItem(
                            index,
                            "directions",
                            value || null,
                          )
                        }
                      />

                      <InputField
                        label="Quantity"
                        type="number"
                        value={
                          item.quantity === null
                            ? ""
                            : String(
                                item.quantity,
                              )
                        }
                        disabled={isAlreadyReviewed}
                        onChange={(value) =>
                          updateItem(
                            index,
                            "quantity",
                            value
                              ? Number(value)
                              : null,
                          )
                        }
                      />

                      <InputField
                        label="Pharmacist notes"
                        value={
                          item.pharmacist_notes ??
                          ""
                        }
                        disabled={isAlreadyReviewed}
                        onChange={(value) =>
                          updateItem(
                            index,
                            "pharmacist_notes",
                            value || null,
                          )
                        }
                      />

                    </div>
                  </div>
                ),
              )}

            </div>


            <div className="mt-6">

              <label
                htmlFor="review-notes"
                className="text-sm font-semibold text-secondary"
              >
                Overall review notes
              </label>

              <textarea
                id="review-notes"
                value={reviewNotes}
                disabled={isAlreadyReviewed}
                onChange={(event) =>
                  setReviewNotes(
                    event.target.value,
                  )
                }
                rows={4}
                className="mt-2 w-full rounded-xl border bg-background px-4 py-3 text-sm text-secondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-muted"
                placeholder="Optional notes about the pharmacist review..."
              />
            </div>


            {error && prescription && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}


            {success && (
              <div className="mt-5 flex gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                {success}
              </div>
            )}


            {!isAlreadyReviewed ? (
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    void rejectPrescription()
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle className="h-5 w-5" />
                  Reject prescription
                </button>


                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    void approvePrescription()
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-5 w-5" />

                  {isSubmitting
                    ? "Saving review..."
                    : "Approve reviewed prescription"}
                </button>

              </div>
            ) : (
              <div className="mt-7 rounded-xl bg-muted/40 p-4 text-sm font-medium capitalize text-secondary">
                Review completed:{" "}
                {prescription.status.replaceAll(
                  "_",
                  " ",
                )}
              </div>
            )}

          </section>

        </div>
      </div>
    </main>
  );
}


function Detail({
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

      <p className="mt-1 break-all text-sm font-medium capitalize text-secondary">
        {value}
      </p>
    </div>
  );
}


function InputField({
  label,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  type?: "text" | "number";
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </label>

      <input
        type={type}
        value={value}
        disabled={disabled}
        min={type === "number" ? 1 : undefined}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-xl border bg-background px-4 py-3 text-sm text-secondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-muted"
      />
    </div>
  );
}