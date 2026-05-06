"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Info, Heart, Activity, Droplets } from "lucide-react";

type YesNo = "yes" | "no";
type Gender = "male" | "female";
type Smoking = "never" | "former" | "current" | "ever" | "not current";

interface DiabetesFormData {
    age: number;
    bmi: number;
    hypertension: YesNo;
    heart_disease: YesNo;
    smoking_history: Smoking;
    HbA1c_level: number;
    blood_glucose_level: number; // mg/dL
    gender: Gender;
}

interface RiskResult {
    riskLevel: "Low" | "Moderate" | "High";
    riskPercentage: number; // 0..100
    riskFactors: string[];
    recommendations: string[];
}

type PredictResponse = {
    diabetes_probability: number;  // 0..1
    diabetes_prediction: 0 | 1;    // class
    threshold_used: number;         // e.g. 0.83
    success: boolean;
    // optional extras if you add them later:
    risk_factors?: string[];
    recommendations?: string[];
};

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export function DiabetesRiskPredictor() {
    const [form, setForm] = useState<DiabetesFormData>({
        age: 45,
        bmi: 25,
        hypertension: "no",
        heart_disease: "no",
        smoking_history: "never",
        HbA1c_level: 5.5,
        blood_glucose_level: 100,
        gender: "female",
    });

    const [result, setResult] = useState<RiskResult | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getBMICategory = (bmi: number) => {
        if (bmi < 18.5) return "Underweight";
        if (bmi < 25) return "Normal weight";
        if (bmi < 30) return "Overweight";
        if (bmi < 35) return "Obesity Class I";
        if (bmi < 40) return "Obesity Class II";
        return "Obesity Class III";
    };
    const getHbA1cCategory = (h: number) => (h < 5.7 ? "Normal" : h < 6.5 ? "Prediabetes" : "Diabetes");
    const getGlucoseCategory = (g: number) => (g < 100 ? "Normal" : g < 126 ? "Prediabetes" : "Diabetes");

    async function handleCalculate() {
        setError(null);
        setResult(null);
        setIsCalculating(true);

        try {
            const API = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

            // get JWT from localStorage
            // Try multiple possible keys in order of likelihood
            const token = typeof window !== "undefined"
                ? (localStorage.getItem("access_token") 
                || localStorage.getItem("token") 
                || localStorage.getItem("authToken") 
                || "").trim()
                : "";

            if (!token) {
                setError("You are not signed in. Please log in first.");
                return;
            }

            // build payload with backend keys
            const payload = {
                age: Number(form.age),
                bmi: Number(form.bmi),
                gender: form.gender,
                HbA1c_level: Number(form.HbA1c_level),
                blood_glucose_level: Number(form.blood_glucose_level),
                hypertension: form.hypertension,
                heart_disease: form.heart_disease,
                smoking_history: form.smoking_history,
            };

            const res = await fetch(`${API}/predict-diabetes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,   // ← important
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error(await res.text());

            const data = await res.json();
            const prob = Number(data?.diabetes_probability ?? 0);
            const cls = Number(data?.diabetes_prediction ?? 0);
            const pct = Math.round(prob * 100);
            setResult({
                riskLevel: cls === 1 ? "High" : pct >= 50 ? "Moderate" : "Low",
                riskPercentage: pct,
                riskFactors: data?.risk_factors ?? [],
                recommendations: data?.recommendations ?? [],
            });
        } catch (e: any) {
            setError(e?.message || "Unable to calculate risk right now.");
        } finally {
            setIsCalculating(false);
        }
    }


    function handleReset() {
        setForm({
            age: 45,
            bmi: 25,
            hypertension: "no",
            heart_disease: "no",
            smoking_history: "never",
            HbA1c_level: 5.5,
            blood_glucose_level: 100,
            gender: "female",
        });
        setResult(null);
        setError(null);
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Droplets className="h-6 w-6 text-primary" />
                        Diabetes Risk Assessment
                    </CardTitle>
                    <p className="text-muted-foreground">
                        Evaluate your risk of developing Type 2 diabetes using key health indicators
                    </p>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Age */}
                        <div className="space-y-2">
                            <Label htmlFor="age">Age: {form.age} years</Label>
                            <Slider
                                id="age"
                                min={18}
                                max={100}
                                step={1}
                                value={[form.age]}
                                onValueChange={([v]) => setForm((p) => ({ ...p, age: v }))}
                            />
                        </div>

                        {/* Gender */}
                        <div className="space-y-2">
                            <Label htmlFor="gender">Gender *</Label>
                            <Select value={form.gender} onValueChange={(v) => setForm((p) => ({ ...p, gender: v as Gender }))}>
                                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* BMI */}
                        <div className="space-y-2">
                            <Label htmlFor="bmi">BMI: {form.bmi} ({getBMICategory(form.bmi)})</Label>
                            <Slider
                                id="bmi"
                                min={15}
                                max={50}
                                step={0.1}
                                value={[form.bmi]}
                                onValueChange={([v]) => setForm((p) => ({ ...p, bmi: v }))}
                            />
                        </div>

                        {/* HbA1c */}
                        <div className="space-y-2">
                            <Label htmlFor="hba1c">HbA1c Level: {form.HbA1c_level}% ({getHbA1cCategory(form.HbA1c_level)})</Label>
                            <Slider
                                id="hba1c"
                                min={4.0}
                                max={12.0}
                                step={0.1}
                                value={[form.HbA1c_level]}
                                onValueChange={([v]) => setForm((p) => ({ ...p, HbA1c_level: v }))}
                            />
                            <p className="text-xs text-muted-foreground">
                                Normal: &lt;5.7% | Prediabetes: 5.7–6.4% | Diabetes: ≥6.5%
                            </p>
                        </div>

                        {/* Fasting glucose */}
                        <div className="space-y-2">
                            <Label htmlFor="blood_glucose_level">
                                Fasting Blood Glucose (mg/dL) ({getGlucoseCategory(form.blood_glucose_level)})
                            </Label>
                            <Input
                                id="blood_glucose_level"
                                type="number"
                                min={70}
                                max={300}
                                value={form.blood_glucose_level}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, blood_glucose_level: Number(e.target.value || 0) }))
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Normal: &lt;100 | Prediabetes: 100–125 | Diabetes: ≥126
                            </p>
                        </div>

                        {/* Hypertension */}
                        <div className="space-y-2">
                            <Label htmlFor="hypertension">Do you have hypertension? *</Label>
                            <Select value={form.hypertension} onValueChange={(v) => setForm((p) => ({ ...p, hypertension: v as YesNo }))}>
                                <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="yes">Yes</SelectItem>
                                    <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Heart disease */}
                        <div className="space-y-2">
                            <Label htmlFor="heart_disease">Do you have heart disease? *</Label>
                            <Select value={form.heart_disease} onValueChange={(v) => setForm((p) => ({ ...p, heart_disease: v as YesNo }))}>
                                <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="yes">Yes</SelectItem>
                                    <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Smoking history */}
                        <div className="space-y-2">
                            <Label htmlFor="smoking_history">Smoking History *</Label>
                            <Select
                                value={form.smoking_history}
                                onValueChange={(v) => setForm((p) => ({ ...p, smoking_history: v as Smoking }))}
                            >
                                <SelectTrigger><SelectValue placeholder="Select smoking history" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="never">Never smoked</SelectItem>
                                    <SelectItem value="former">Former smoker</SelectItem>
                                    <SelectItem value="current">Current smoker</SelectItem>
                                    <SelectItem value="ever">Ever</SelectItem>
                                    <SelectItem value="not current">Not current</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button onClick={handleCalculate} disabled={isCalculating} className="flex-1">
                            {isCalculating ? "Calculating..." : "Calculate Diabetes Risk"}
                        </Button>
                        <Button variant="outline" onClick={handleReset}>Reset Form</Button>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {result.riskLevel === "Low" && <CheckCircle className="h-6 w-6 text-green-500" />}
                            {result.riskLevel === "Moderate" && <Info className="h-6 w-6 text-yellow-500" />}
                            {result.riskLevel === "High" && <AlertTriangle className="h-6 w-6 text-red-500" />}
                            Diabetes Risk Assessment Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-center space-y-4">
                            <div
                                className={`text-4xl font-bold ${result.riskLevel === "Low"
                                        ? "text-green-500"
                                        : result.riskLevel === "Moderate"
                                            ? "text-yellow-500"
                                            : "text-red-500"
                                    }`}
                            >
                                {result.riskLevel} Risk
                            </div>
                            <div className="text-2xl text-muted-foreground">
                                {result.riskPercentage}% Risk Score
                            </div>
                            <Progress
                                value={result.riskPercentage}
                                className={`w-full h-3 ${result.riskLevel === "Low"
                                        ? "[&>div]:bg-green-500"
                                        : result.riskLevel === "Moderate"
                                            ? "[&>div]:bg-yellow-500"
                                            : "[&>div]:bg-red-500"
                                    }`}
                            />
                        </div>

                        {result.riskFactors.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <Activity className="h-5 w-5" />
                                    Risk Factors Identified
                                </h3>
                                <ul className="space-y-2">
                                    {result.riskFactors.map((f, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                                            <span className="text-sm">{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div>
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <Heart className="h-5 w-5" />
                                Recommendations
                            </h3>
                            <ul className="space-y-2">
                                {result.recommendations.map((r, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm">{r}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                                <strong>Important:</strong> This assessment is for informational purposes only and should not replace
                                professional medical advice. Please consult with your healthcare provider.
                            </p>
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