"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  FileText,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";

import {
  DEMO_BRANCH_ID,
  getPharmacyPrescriptionQueue,
  type PrescriptionResponse,
} from "@/lib/api/prescriptions";


export default function PharmacyPrescriptionQueuePage() {
  const [prescriptions, setPrescriptions] = useState<
    PrescriptionResponse[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);


  async function loadQueue(refresh = false) {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const queue =
        await getPharmacyPrescriptionQueue(
          DEMO_BRANCH_ID,
        );

      setPrescriptions(queue);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The prescription queue could not be loaded.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }


  useEffect(() => {
    void loadQueue();
  }, []);


  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Stethoscope className="h-4 w-4" />
              Pharmacy portal
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-secondary sm:text-4xl">
              Prescription review queue
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              Review prescription drafts assigned to this
              pharmacy branch before they can be treated as
              confirmed medication information.
            </p>
          </div>


          <button
            type="button"
            onClick={() => void loadQueue(true)}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold text-secondary shadow-sm transition hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />

            Refresh
          </button>
        </div>


        {/* Safety notice */}
        <div className="mb-7 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

          <div>
            <p className="text-sm font-semibold text-amber-900">
              OCR is not authoritative
            </p>

            <p className="mt-1 text-sm leading-5 text-amber-800">
              Extracted medication information is a draft.
              Pharmacist review is required before any
              prescription is marked as reviewed.
            </p>
          </div>
        </div>


        {/* Summary */}
        <div className="mb-7 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Waiting for review"
            value={prescriptions.length}
          />

          <SummaryCard
            label="Branch"
            value={DEMO_BRANCH_ID}
            small
          />

          <SummaryCard
            label="Workflow"
            value="PH7 → PH8"
            small
          />
        </div>


        {isLoading && (
          <section className="rounded-2xl border bg-background p-8 shadow-sm">
            <p className="text-sm text-gray-500">
              Loading prescription queue...
            </p>
          </section>
        )}


        {!isLoading && error && (
          <section
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
          >
            {error}
          </section>
        )}


        {!isLoading &&
          !error &&
          prescriptions.length === 0 && (
            <section className="rounded-2xl border bg-background p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-7 w-7 text-primary" />
              </div>

              <h2 className="mt-4 text-lg font-semibold text-secondary">
                No prescriptions are waiting
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                New prescriptions assigned to this branch
                will appear here automatically.
              </p>
            </section>
          )}


        {!isLoading &&
          !error &&
          prescriptions.length > 0 && (
            <section className="space-y-4">

              {prescriptions.map((prescription) => (
                <article
                  key={prescription.prescription_id}
                  className="rounded-2xl border bg-background p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                    <div className="min-w-0 flex-1">

                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-primary/10 p-3">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>

                        <div className="min-w-0">
                          <h2 className="truncate font-semibold text-secondary">
                            {
                              prescription.file
                                .original_name
                            }
                          </h2>

                          <p className="mt-1 break-all text-xs text-gray-500">
                            {
                              prescription.prescription_id
                            }
                          </p>
                        </div>
                      </div>


                      <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3">

                        <Info
                          label="Patient"
                          value={prescription.patient_id}
                        />

                        <Info
                          label="OCR status"
                          value={prescription.ocr_status.replaceAll(
                            "_",
                            " ",
                          )}
                        />

                        <Info
                          label="Detected lines"
                          value={String(
                            prescription.ocr_items.length,
                          )}
                        />

                      </div>


                      <div className="mt-5 rounded-xl bg-muted/40 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          OCR preview
                        </p>

                        <div className="mt-2 space-y-1">
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

                    </div>


                    <div className="flex shrink-0 flex-col gap-3 lg:items-end">

                      <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold capitalize text-amber-800">
                        {prescription.status.replaceAll(
                          "_",
                          " ",
                        )}
                      </span>


                      <Link
                        href={`/pharmacy/prescriptions/${encodeURIComponent(
                          prescription.prescription_id,
                        )}`}
                        className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
                      >
                        Review prescription
                      </Link>

                    </div>
                  </div>
                </article>
              ))}

            </section>
          )}

      </div>
    </main>
  );
}


function SummaryCard({
  label,
  value,
  small = false,
}: {
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-background p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p
        className={`mt-2 font-bold text-secondary ${
          small ? "text-base" : "text-2xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}


function Info({
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

      <p className="mt-1 break-all font-medium capitalize text-secondary">
        {value}
      </p>
    </div>
  );
}