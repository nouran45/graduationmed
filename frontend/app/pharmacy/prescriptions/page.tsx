"use client";

import { useEffect, useState } from "react";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadQueue() {
      try {
        const queue =
          await getPharmacyPrescriptionQueue(DEMO_BRANCH_ID);

        if (isActive) {
          setPrescriptions(queue);
        }
      } catch (caughtError) {
        if (isActive) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "The prescription queue could not be loaded.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadQueue();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700">
            Pharmacy portal
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Prescription review queue
          </h1>

          <p className="mt-3 text-slate-600">
            Prescriptions waiting for pharmacist review at branch{" "}
            <strong>{DEMO_BRANCH_ID}</strong>.
          </p>
        </header>

        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          OCR results shown here are unconfirmed drafts. They must not be
          treated as final medication instructions.
        </div>

        {isLoading && (
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            Loading prescription queue...
          </section>
        )}

        {!isLoading && error && (
          <section
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-700"
          >
            {error}
          </section>
        )}

        {!isLoading && !error && prescriptions.length === 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              No prescriptions are waiting
            </h2>

            <p className="mt-2 text-slate-600">
              New prescriptions for this branch will appear here.
            </p>
          </section>
        )}

        {!isLoading && !error && prescriptions.length > 0 && (
          <section className="space-y-5">
            <p className="text-sm font-medium text-slate-600">
              {prescriptions.length} prescription
              {prescriptions.length === 1 ? "" : "s"} waiting
            </p>

            {prescriptions.map((prescription) => (
              <article
                key={prescription.prescription_id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      {prescription.file.original_name}
                    </h2>

                    <p className="mt-1 break-all text-sm text-slate-500">
                      {prescription.prescription_id}
                    </p>
                  </div>

                  <span className="h-fit rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                    {prescription.status.replace(/_/g, " ")}
                  </span>
                </div>

                <dl className="my-5 grid gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="font-semibold text-slate-700">
                      Patient ID
                    </dt>
                    <dd className="text-slate-600">
                      {prescription.patient_id}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-semibold text-slate-700">
                      OCR status
                    </dt>
                    <dd className="text-slate-600">
                      {prescription.ocr_status.replace(/_/g, " ")}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-semibold text-slate-700">
                      Detected lines
                    </dt>
                    <dd className="text-slate-600">
                      {prescription.ocr_items.length}
                    </dd>
                  </div>
                </dl>

                <div className="space-y-2 rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Unconfirmed OCR preview
                  </p>

                  {prescription.ocr_items.map((item) => (
                    <p key={item.line_id} className="text-sm text-slate-600">
                      {item.raw_text}
                    </p>
                  ))}
                </div>

                <p className="mt-4 text-sm text-slate-500">
                  PH8 will provide the complete correction, approval and
                  rejection screen.
                </p>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}