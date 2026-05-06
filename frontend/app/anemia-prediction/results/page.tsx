"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Droplets, AlertTriangle, CheckCircle, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";

interface AnemiaApiResult {
  success?: boolean;
  prediction?: number;
  has_anemia?: boolean;
  confidence?: number;               // 0..1 or 0..100
  probability_no_anemia?: number;    // 0..1 or 0..100
  probability_anemia?: number;       // 0..1 or 0..100
  risk_level?: string;
  disease?: string;
  diagnosis?: string;
  anemia_type?: string;
  message?: string;
}

const normalizePercent = (v: unknown): number | undefined => {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return n <= 1 ? n * 100 : n;
};

export default function AnemiaResults() {
  const router = useRouter();
  const [results, setResults] = useState<AnemiaApiResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("anemiaResults");
    if (!raw) {
      router.push("/anemia-prediction");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as AnemiaApiResult;

      // normalize numeric fields (to percentages)
      const confidence = normalizePercent(parsed.confidence);
      const probAnemia = normalizePercent(parsed.probability_anemia);
      const probNoAnemia = normalizePercent(parsed.probability_no_anemia);

      setResults({
        ...parsed,
        ...(confidence !== undefined ? { confidence } : {}),
        ...(probAnemia !== undefined ? { probability_anemia: probAnemia } : {}),
        ...(probNoAnemia !== undefined ? { probability_no_anemia: probNoAnemia } : {}),
      });
    } catch {
      router.push("/anemia-prediction");
    }
  }, [router]);

  const { riskLabel, riskColorClass, riskIcon } = useMemo(() => {
    if (!results) {
      return {
        riskLabel: "Unknown",
        riskColorClass: "text-gray-600",
        riskIcon: <Clock className="h-8 w-8 text-gray-600" />,
      };
    }

    const level = results.risk_level?.toLowerCase();

    let label = results.risk_level || "Unknown";
    let color = "text-gray-600";
    let icon: JSX.Element = <Clock className="h-8 w-8 text-gray-600" />;

    if (level === "low") {
      color = "text-green-600";
      icon = <CheckCircle className="h-8 w-8 text-green-600" />;
    } else if (level === "moderate") {
      color = "text-yellow-600";
      icon = <AlertTriangle className="h-8 w-8 text-yellow-600" />;
    } else if (level === "high") {
      color = "text-red-600";
      icon = <AlertTriangle className="h-8 w-8 text-red-600" />;
    } else if (!results.risk_level) {
      // fallback if backend didn't include risk_level
      // simple heuristic: if has_anemia true → High, else if prob_anemia >= 50 → Moderate, else Low.
      const pa = Number(results.probability_anemia ?? 0);
      if (results.has_anemia) {
        label = "High";
        color = "text-red-600";
        icon = <AlertTriangle className="h-8 w-8 text-red-600" />;
      } else if (pa >= 50) {
        label = "Moderate";
        color = "text-yellow-600";
        icon = <AlertTriangle className="h-8 w-8 text-yellow-600" />;
      } else {
        label = "Low";
        color = "text-green-600";
        icon = <CheckCircle className="h-8 w-8 text-green-600" />;
      }
    }

    return { riskLabel: label, riskColorClass: color, riskIcon: icon };
  }, [results]);

  if (!results) {
    return <div className="min-h-screen bg-muted flex items-center justify-center">Loading...</div>;
  }

  const confidenceDisplay = (results.confidence ?? 0).toFixed(1);
  const probAnemiaPct = (results.probability_anemia ?? 0).toFixed(1);
  const probNoAnemiaPct = (results.probability_no_anemia ?? 0).toFixed(1);

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="bg-primary py-2">
          <div className="container flex justify-between items-center">
            <div className="flex items-center gap-2 text-white text-sm">
              <span>Patient Support: (800) 555-1234</span>
            </div>
            <div className="flex items-center gap-4">
              <div id="auth-links">
                <Link href="/login" className="text-white text-sm hover:underline">
                  Patient Portal
                </Link>
              </div>
              <div id="user-links" className="hidden">
                <Link href="/dashboard" className="text-white text-sm hover:underline">
                  Dashboard
                </Link>
              </div>
              <Link href="/about" className="text-white text-sm hover:underline">
                About Us
              </Link>
              <Link href="/contact" className="text-white text-sm hover:underline">
                Contact
              </Link>
            </div>
          </div>
        </div>
        <div className="container py-4">
          <div className="flex justify-between items-center">
            <Logo />
            <div className="flex items-center gap-4">
              <Link href="/anemia-prediction" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors">
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Assessment</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-4xl py-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-blue-100 p-4 rounded-full mb-4">
            <Droplets className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary mb-4">Complete Blood Count Analysis Results</h1>
          <p className="text-gray-600">Based on your blood test parameters analysis</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">{riskIcon}</div>
              <h3 className={`text-2xl font-bold mb-2 ${riskColorClass}`}>{riskLabel} Risk</h3>
              <p className="text-gray-600">Anemia Risk Level</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">{confidenceDisplay}%</div>
              <h3 className="text-lg font-semibold mb-2">Confidence Score</h3>
              <p className="text-gray-600">Analysis Accuracy</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {results.has_anemia ? "Detected" : "Not Detected"}
              </div>
              <h3 className="text-lg font-semibold mb-2">Anemia Status</h3>
              <p className="text-gray-600">Detection Result</p>
            </CardContent>
          </Card>
        </div>

        {/* Probability Breakdown (fixed colours/labels) */}
        <Card className="border-0 shadow-md mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">Detailed Probabilities</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{probAnemiaPct}%</div>
                <div className="text-sm text-gray-600">Probability of Anemia</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{probNoAnemiaPct}%</div>
                <div className="text-sm text-gray-600">Probability of No Anemia</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4 flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Blood Analysis Summary
            </h2>
            <p className="text-gray-700 mb-4">{results.diagnosis || results.message || "No diagnosis available"}</p>
            <p className="text-gray-700">
              <strong>Condition:</strong> {results.disease || results.anemia_type || "Unknown"}
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-blue-800 mb-2">Understanding Your Results</h3>
              <p className="text-blue-700 text-sm">
                This analysis evaluates key Complete Blood Count (CBC) parameters including hemoglobin,
                MCH (Mean Corpuscular Hemoglobin), MCHC (Mean Corpuscular Hemoglobin Concentration),
                and MCV (Mean Corpuscular Volume). These values help identify potential anemia types
                and guide appropriate next steps for medical evaluation.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">Recommended Medical Follow-up</h2>
            <ul className="space-y-3">
              {results.has_anemia ? (
                <>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Consult with a hematologist for comprehensive evaluation</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Increase iron-rich foods in your diet (red meat, leafy greens, beans)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Consider iron supplements under medical supervision</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Schedule follow-up blood tests in 2-3 months</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Continue maintaining a balanced diet rich in iron</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Schedule regular health check-ups annually</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Monitor blood parameters during routine exams</span>
                  </li>
                </>
              )}
            </ul>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4 mt-8">
          <Button asChild className="bg-primary text-white hover:bg-primary/90">
            <Link href="/services">Back to Services</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Consult a Hematologist</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/anemia-prediction">New Analysis</Link>
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 max-w-[700px] mx-auto">
            <strong>Medical Disclaimer:</strong> This analysis is based on standard CBC parameter interpretation
            and should not replace professional medical evaluation. Laboratory reference ranges may vary.
            Always consult with a healthcare professional for accurate diagnosis and treatment.
          </p>
        </div>
      </div>
    </div>
  );
}
