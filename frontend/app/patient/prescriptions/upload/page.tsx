"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import {
  DEMO_BRANCH_ID,
  uploadPrescription,
  type PrescriptionResponse,
} from "@/lib/api/prescriptions";

export default function PrescriptionUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<PrescriptionResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setResult(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please select a prescription file first.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const prescription = await uploadPrescription(
        selectedFile,
        DEMO_BRANCH_ID,
      );

      setResult(prescription);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The prescription could not be uploaded.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700">
            Patient portal
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Upload a prescription
          </h1>

          <p className="mt-3 text-slate-600">
            Upload a clear JPG, PNG or PDF prescription for pharmacy
            review.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Development mode:</strong> the selected file is not
            sent anywhere yet. The extraction shown below is temporary
            mock data used to build and test the workflow.
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="prescription-file"
                className="mb-2 block font-medium text-slate-800"
              >
                Prescription file
              </label>

              <input
                id="prescription-file"
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={handleFileChange}
                className="block w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-700"
              />
            </div>

            {selectedFile && (
              <div className="rounded-lg bg-slate-100 p-4 text-sm text-slate-700">
                <p>
                  <strong>Name:</strong> {selectedFile.name}
                </p>

                <p>
                  <strong>Type:</strong>{" "}
                  {selectedFile.type || "Unknown"}
                </p>

                <p>
                  <strong>Size:</strong>{" "}
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isUploading
                ? "Processing prescription..."
                : "Upload prescription"}
            </button>
          </form>
        </section>

        {result && (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              OCR draft
            </h2>

            <div className="my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              This extraction is an unconfirmed draft. A pharmacist must
              review it before it can be treated as final.
            </div>

            <dl className="mb-6 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-slate-700">
                  Prescription ID
                </dt>
                <dd className="break-all text-slate-600">
                  {result.prescription_id}
                </dd>
              </div>

              <div>
                <dt className="font-semibold text-slate-700">
                  Status
                </dt>
                <dd className="text-slate-600">{result.status}</dd>
              </div>
            </dl>

            <div className="space-y-4">
              {result.ocr_items.map((item) => (
                <article
                  key={item.line_id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <p className="mb-3 text-sm text-slate-500">
                    Original OCR text: {item.raw_text}
                  </p>

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <p>
                      <strong>Name:</strong>{" "}
                      {item.extracted_name ?? "Not detected"}
                    </p>

                    <p>
                      <strong>Strength:</strong>{" "}
                      {item.strength ?? "Not detected"}
                    </p>

                    <p>
                      <strong>Dosage form:</strong>{" "}
                      {item.dosage_form ?? "Not detected"}
                    </p>

                    <p>
                      <strong>Directions:</strong>{" "}
                      {item.directions ?? "Not detected"}
                    </p>

                    <p>
                      <strong>Match status:</strong>{" "}
                      {item.match_status}
                    </p>

                    <p>
                      <strong>Confidence:</strong>{" "}
                      {item.confidence === null
                        ? "Unavailable"
                        : `${Math.round(item.confidence * 100)}%`}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}