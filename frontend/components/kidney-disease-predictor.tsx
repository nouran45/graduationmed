"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Heart, Activity } from "lucide-react";

interface KidneyData {
  age: number;
  bloodPressure: number;
  specificGravity: number;
  albumin: number;
  sugar: number;
  bloodGlucoseRandom: number;
  bloodUrea: number;
  serumCreatinine: number;
  sodium: number;
  potassium: number;
  hemoglobin: number;
  packedCellVolume: number;
  whiteBloodCellCount: number;
  redBloodCellCount: number;
  hypertension: string;
  diabetes: string;
  anemia: string;
  pedalEdema: string;
  redBloodCells: string;
  pusCell: string;
  pusCellClumps: string;
  bacteria: string;
  coronaryArteryDisease: string;
  appetite: string;
}

interface RiskResult {
  riskLevel: "Low" | "Moderate" | "High";
  riskPercentage: number;
  recommendations: string[];
  riskFactors: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export function KidneyDiseasePredictor() {
  const [formData, setFormData] = useState<KidneyData>({
    age: 45,
    bloodPressure: 80,
    specificGravity: 1.02,
    albumin: 1,
    sugar: 0,
    bloodGlucoseRandom: 100,
    bloodUrea: 40,
    serumCreatinine: 1.2,
    sodium: 137,
    potassium: 4.5,
    hemoglobin: 13.5,
    packedCellVolume: 40,
    whiteBloodCellCount: 9000,
    redBloodCellCount: 4.8,
    hypertension: "",
    diabetes: "",
    anemia: "",
    pedalEdema: "",
    redBloodCells: "normal",
    pusCell: "normal",
    pusCellClumps: "notpresent",
    bacteria: "notpresent",
    coronaryArteryDisease: "no",
    appetite: "good",
  });

  const [result, setResult] = useState<RiskResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFormData = (field: keyof KidneyData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toPercent = (value: any) => {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return 0;
    return n <= 1 ? n * 100 : n;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "Low": return "text-green-600";
      case "Moderate": return "text-yellow-600";
      case "High": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "Low": return <CheckCircle className="h-6 w-6 text-green-600" />;
      case "Moderate": return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case "High": return <AlertTriangle className="h-6 w-6 text-red-600" />;
      default: return <Activity className="h-6 w-6 text-gray-600" />;
    }
  };

  const handleCalculate = async () => {
    setError(null);
    setResult(null);

    // Required fields validation
    if (!formData.hypertension || !formData.diabetes || !formData.anemia || !formData.pedalEdema) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setIsCalculating(true);

      // Get JWT token
      const token = localStorage.getItem("access_token") || "";

      if (!token) {
        setError("You are not signed in. Please log in first.");
        return;
      }

      // Build payload using the UCI kidney feature names accepted by the backend.
      // These names match the Phase 6 model metadata and the existing KidneyDiseaseInput aliases.
      const payload = {
        age: Number(formData.age),
        bp: Number(formData.bloodPressure),
        sg: Number(formData.specificGravity),
        al: Number(formData.albumin),
        su: Number(formData.sugar),
        rbc: formData.redBloodCells,
        pc: formData.pusCell,
        pcc: formData.pusCellClumps,
        ba: formData.bacteria,
        bgr: Number(formData.bloodGlucoseRandom),
        bu: Number(formData.bloodUrea),
        sc: Number(formData.serumCreatinine),
        sod: Number(formData.sodium),
        pot: Number(formData.potassium),
        hemo: Number(formData.hemoglobin),
        pcv: Number(formData.packedCellVolume),
        wc: Number(formData.whiteBloodCellCount),
        rc: Number(formData.redBloodCellCount),
        htn: formData.hypertension === "yes" ? "yes" : "no",
        dm: formData.diabetes === "yes" ? "yes" : "no",
        cad: formData.coronaryArteryDisease === "yes" ? "yes" : "no",
        appet: formData.appetite,
        pe: formData.pedalEdema === "yes" ? "yes" : "no",
        ane: formData.anemia === "yes" ? "yes" : "no",
      };

      // Correct API endpoint (remove /api prefix)
      const res = await fetch(`${API_BASE.replace(/\/$/, "")}/predict-kidney`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await safeText(res);
        throw new Error(errorText || `Prediction failed (${res.status})`);
      }

      const data = await res.json();

      // Backend may return probabilities as decimals (0.73) or percentages (73).
      const ckdPercent = toPercent(data.probability_ckd ?? data.all_probabilities?.CKD ?? 0);

      const mapped: RiskResult = {
        riskLevel: data.risk_level ?? (data.has_kidney_disease ? "High" : (ckdPercent >= 25 ? "Moderate" : "Low")),
        riskPercentage: Math.round(ckdPercent),
        recommendations: data.recommendations ?? [],
        riskFactors: [],
      };

      setResult(mapped);
    } catch (e: any) {
      setError(e?.message || "Unable to calculate risk right now.");
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4">
      <Card className="shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Heart className="h-6 w-6 text-primary" />
            Kidney Disease Risk Assessment
          </CardTitle>
          <p className="mx-auto max-w-2xl text-sm text-gray-600">
            Please provide the following information for a comprehensive kidney disease risk evaluation.
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              <section className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-secondary">Basic Information</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Age: {formData.age} years</Label>
                    <Slider
                      value={[formData.age]}
                      onValueChange={([v]) => updateFormData("age", v)}
                      min={1}
                      max={100}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bloodPressure">Blood Pressure (mmHg)</Label>
                    <Input
                      id="bloodPressure"
                      type="number"
                      value={formData.bloodPressure}
                      onChange={(e) => updateFormData("bloodPressure", parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specificGravity">Specific Gravity</Label>
                    <Select
                      value={formData.specificGravity.toString()}
                      onValueChange={(v) => updateFormData("specificGravity", parseFloat(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1.005">1.005</SelectItem>
                        <SelectItem value="1.010">1.010</SelectItem>
                        <SelectItem value="1.015">1.015</SelectItem>
                        <SelectItem value="1.020">1.020</SelectItem>
                        <SelectItem value="1.025">1.025</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-secondary">Kidney & Chemistry Values</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Albumin: {formData.albumin}</Label>
                    <Slider value={[formData.albumin]} onValueChange={([v]) => updateFormData("albumin", v)} min={0} max={5} step={1} />
                  </div>

                  <div className="space-y-2">
                    <Label>Sugar: {formData.sugar}</Label>
                    <Slider value={[formData.sugar]} onValueChange={([v]) => updateFormData("sugar", v)} min={0} max={5} step={1} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bloodGlucose">Blood Glucose Random (mg/dL)</Label>
                    <Input
                      id="bloodGlucose"
                      type="number"
                      value={formData.bloodGlucoseRandom}
                      onChange={(e) => updateFormData("bloodGlucoseRandom", parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bloodUrea">Blood Urea (mg/dL)</Label>
                    <Input
                      id="bloodUrea"
                      type="number"
                      value={formData.bloodUrea}
                      onChange={(e) => updateFormData("bloodUrea", parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serumCreatinine">Serum Creatinine (mg/dL)</Label>
                    <Input
                      id="serumCreatinine"
                      type="number"
                      value={formData.serumCreatinine}
                      onChange={(e) => updateFormData("serumCreatinine", parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-secondary">Electrolytes & Blood Parameters</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sodium">Sodium (mEq/L)</Label>
                    <Input id="sodium" type="number" value={formData.sodium} onChange={(e) => updateFormData("sodium", parseFloat(e.target.value))} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="potassium">Potassium (mEq/L)</Label>
                    <Input id="potassium" type="number" value={formData.potassium} onChange={(e) => updateFormData("potassium", parseFloat(e.target.value))} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hemoglobin">Hemoglobin (g/dL)</Label>
                    <Input id="hemoglobin" type="number" value={formData.hemoglobin} onChange={(e) => updateFormData("hemoglobin", parseFloat(e.target.value))} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="packedCellVolume">Packed Cell Volume</Label>
                    <Input id="packedCellVolume" type="number" value={formData.packedCellVolume} onChange={(e) => updateFormData("packedCellVolume", parseFloat(e.target.value))} />
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              <section className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-secondary">Cell Counts</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="wbc">WBC Count (cells/cumm)</Label>
                    <Input id="wbc" type="number" value={formData.whiteBloodCellCount} onChange={(e) => updateFormData("whiteBloodCellCount", parseFloat(e.target.value))} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rbcCount">RBC Count (millions/cmm)</Label>
                    <Input id="rbcCount" type="number" value={formData.redBloodCellCount} onChange={(e) => updateFormData("redBloodCellCount", parseFloat(e.target.value))} />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-secondary">Medical History</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hypertension">Hypertension *</Label>
                    <Select value={formData.hypertension} onValueChange={(v) => updateFormData("hypertension", v)}>
                      <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diabetes">Diabetes Mellitus *</Label>
                    <Select value={formData.diabetes} onValueChange={(v) => updateFormData("diabetes", v)}>
                      <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="anemia">Anemia *</Label>
                    <Select value={formData.anemia} onValueChange={(v) => updateFormData("anemia", v)}>
                      <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pedalEdema">Pedal Edema *</Label>
                    <Select value={formData.pedalEdema} onValueChange={(v) => updateFormData("pedalEdema", v)}>
                      <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coronaryArteryDisease">Coronary Artery Disease</Label>
                    <Select value={formData.coronaryArteryDisease} onValueChange={(v) => updateFormData("coronaryArteryDisease", v)}>
                      <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appetite">Appetite</Label>
                    <Select value={formData.appetite} onValueChange={(v) => updateFormData("appetite", v)}>
                      <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-secondary">Microscopy Findings</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="redBloodCells">Red Blood Cells</Label>
                    <Select value={formData.redBloodCells} onValueChange={(v) => updateFormData("redBloodCells", v)}>
                      <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="abnormal">Abnormal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pusCell">Pus Cell</Label>
                    <Select value={formData.pusCell} onValueChange={(v) => updateFormData("pusCell", v)}>
                      <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="abnormal">Abnormal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pusCellClumps">Pus Cell Clumps</Label>
                    <Select value={formData.pusCellClumps} onValueChange={(v) => updateFormData("pusCellClumps", v)}>
                      <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="notpresent">Not Present</SelectItem>
                        <SelectItem value="present">Present</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bacteria">Bacteria</Label>
                    <Select value={formData.bacteria} onValueChange={(v) => updateFormData("bacteria", v)}>
                      <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="notpresent">Not Present</SelectItem>
                        <SelectItem value="present">Present</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="border-t pt-6">
            <Button
              onClick={handleCalculate}
              disabled={
                isCalculating ||
                !formData.hypertension ||
                !formData.diabetes ||
                !formData.anemia ||
                !formData.pedalEdema
              }
              className="w-full bg-primary text-white hover:bg-primary/90"
              size="lg"
            >
              {isCalculating ? "Calculating Risk..." : "Calculate Kidney Disease Risk"}
            </Button>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getRiskIcon(result.riskLevel)}
              Risk Assessment Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className={`text-3xl font-bold ${getRiskColor(result.riskLevel)}`}>{result.riskLevel} Risk</div>
              <div className="text-lg text-gray-600">Risk Score: {result.riskPercentage}%</div>
              <Progress value={result.riskPercentage} className="w-full h-3" />
            </div>

            {result.riskFactors.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-secondary">Identified Risk Factors:</h4>
                <ul className="space-y-2">
                  {result.riskFactors.map((factor, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommendations.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-secondary">Recommendations:</h4>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Medical Disclaimer:</strong> This assessment is for informational purposes only and should not
                  replace professional medical advice. Please consult with a healthcare provider or nephrologist for proper diagnosis and treatment.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}