"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import type {
  ChangeEvent,
  FormEvent,
} from "react";

import {
  CheckCircle2,
  FileText,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";

import {
  DEMO_BRANCH_ID,
  uploadPrescription,
  type PrescriptionResponse,
} from "@/lib/api/prescriptions";


export default function PrescriptionUploadPage() {
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [result, setResult] =
    useState<PrescriptionResponse | null>(null);

  const [isUploading, setIsUploading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const inputRef =
    useRef<HTMLInputElement | null>(null);


  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setResult(null);
    setError(null);
  }


  function clearFile() {
    setSelectedFile(null);
    setResult(null);
    setError(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedFile) {
      setError(
        "Please select a prescription file first.",
      );
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const prescription =
        await uploadPrescription(
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
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <ShieldCheck className="h-4 w-4" />
            Prescription safety
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-secondary sm:text-4xl">
            Upload your prescription
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
            Upload a clear prescription image or PDF.
            MediCheck creates an extraction draft that
            must be reviewed by a pharmacist before it
            is considered final.
          </p>
        </div>


        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">

          {/* Upload card */}
          <section className="rounded-2xl border bg-background p-6 shadow-sm">

            <div className="mb-6 flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-3">
                <UploadCloud className="h-6 w-6 text-primary" />
              </div>

              <div>
                <h2 className="font-semibold text-secondary">
                  Prescription file
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  JPG, PNG or PDF.
                </p>
              </div>
            </div>


            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <input
                ref={inputRef}
                id="prescription-file"
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />


              {!selectedFile ? (
                <button
                  type="button"
                  onClick={() =>
                    inputRef.current?.click()
                  }
                  className="flex min-h-52 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-muted/30 px-6 text-center transition hover:border-primary hover:bg-primary/[0.03]"
                >
                  <div className="rounded-full bg-primary/10 p-4">
                    <UploadCloud className="h-8 w-8 text-primary" />
                  </div>

                  <p className="mt-4 font-semibold text-secondary">
                    Choose a prescription
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Click to browse your files
                  </p>
                </button>
              ) : (
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <div className="flex items-start gap-4">

                    <div className="rounded-xl bg-background p-3 shadow-sm">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-secondary">
                        {selectedFile.name}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {selectedFile.type || "Unknown type"}
                        {" · "}
                        {(selectedFile.size / 1024).toFixed(1)}
                        {" KB"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={clearFile}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove selected file"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}


              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  {error}
                </div>
              )}


              <button
                type="submit"
                disabled={
                  !selectedFile ||
                  isUploading
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UploadCloud className="h-5 w-5" />

                {isUploading
                  ? "Uploading prescription..."
                  : "Upload prescription"}
              </button>
            </form>


            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Development stage
                  </p>

                  <p className="mt-1 text-sm leading-5 text-amber-800">
                    Uploads now reach the real Person 3
                    backend and are persisted privately.
                    OCR output is still temporary stub data
                    until the real extraction pipeline is
                    integrated.
                  </p>
                </div>
              </div>
            </div>
          </section>


          {/* Workflow info */}
          <aside className="rounded-2xl border bg-background p-6 shadow-sm">

            <h2 className="font-semibold text-secondary">
              What happens next?
            </h2>

            <div className="mt-6 space-y-5">

              <WorkflowStep
                number="1"
                title="Secure upload"
                description="Your prescription is registered with a tracked prescription ID."
              />

              <WorkflowStep
                number="2"
                title="Extraction draft"
                description="Medication information is extracted as a draft only."
              />

              <WorkflowStep
                number="3"
                title="Pharmacist review"
                description="A pharmacist confirms or corrects the extracted medications."
              />

              <WorkflowStep
                number="4"
                title="Reviewed result"
                description="Only the reviewed result is considered authoritative."
              />

            </div>
          </aside>
        </div>


        {/* Result */}
        {result && (
          <section className="mt-8 overflow-hidden rounded-2xl border bg-background shadow-sm">

            <div className="border-b bg-primary/[0.03] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-green-100 p-3">
                    <CheckCircle2 className="h-6 w-6 text-green-700" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-secondary">
                      Prescription uploaded
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      The extraction below is an
                      unconfirmed OCR draft.
                    </p>
                  </div>
                </div>

                <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  Pending pharmacist review
                </span>

              </div>
            </div>


            <div className="p-6">

              <div className="grid gap-4 sm:grid-cols-2">

                <InfoCard
                  label="Prescription ID"
                  value={result.prescription_id}
                />

                <InfoCard
                  label="Status"
                  value={result.status.replaceAll("_", " ")}
                />

                <InfoCard
                  label="File"
                  value={result.file.original_name}
                />

                <InfoCard
                  label="OCR status"
                  value={result.ocr_status.replaceAll("_", " ")}
                />

              </div>


              <div className="mt-8">
                <div className="mb-4">
                  <h3 className="font-semibold text-secondary">
                    OCR draft
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    These fields are not final until
                    pharmacist review.
                  </p>
                </div>


                <div className="space-y-4">
                  {result.ocr_items.map(
                    (item) => (
                      <article
                        key={item.line_id}
                        className="rounded-2xl border p-5"
                      >
                        <div className="mb-5 rounded-xl bg-muted/50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Original OCR text
                          </p>

                          <p className="mt-2 text-sm text-secondary">
                            {item.raw_text}
                          </p>
                        </div>


                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                          <Field
                            label="Medication"
                            value={
                              item.extracted_name ??
                              "Not detected"
                            }
                          />

                          <Field
                            label="Strength"
                            value={
                              item.strength ??
                              "Not detected"
                            }
                          />

                          <Field
                            label="Dosage form"
                            value={
                              item.dosage_form ??
                              "Not detected"
                            }
                          />

                          <Field
                            label="Directions"
                            value={
                              item.directions ??
                              "Not detected"
                            }
                          />

                          <Field
                            label="Match"
                            value={item.match_status}
                          />

                          <Field
                            label="OCR confidence"
                            value={
                              item.confidence === null
                                ? "Unavailable"
                                : `${Math.round(
                                    item.confidence *
                                      100,
                                  )}%`
                            }
                          />

                        </div>
                      </article>
                    ),
                  )}
                </div>
              </div>

            </div>
            <div className="border-t px-6 py-6">

              <Link
                href={`/patient/prescriptions/${encodeURIComponent(
                  result.prescription_id,
                )}`}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                View prescription status
              </Link>

            </div>
          </section>
        )}
      </div>
    </main>
  );
}


function WorkflowStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {number}
      </div>

      <div>
        <p className="font-medium text-secondary">
          {title}
        </p>

        <p className="mt-1 text-sm leading-5 text-gray-500">
          {description}
        </p>
      </div>
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