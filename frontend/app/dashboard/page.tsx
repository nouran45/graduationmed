"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, FileText, LogOut, Search, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";

type MedicalRecord = {
  id: string;
  condition: string;
  date?: string;            // ISO or readable date
  doctor?: string;          // optional
  symptoms: string[];
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  confidence?: number;      // 0..1 optional
  hideConfidence?: boolean;
  hide_confidence?: boolean;
};

// 1) Optional manual override via env (wins if set)
const ENV_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "")
  .trim()
  .replace(/\/$/, "");

// 2) Auto-pick by hostname at runtime (safe for SSR)
const HOST_BASE = (() => {
  const prod = "https://faridaaaa-medical-diagnosis-api.hf.space";
  const dev  = "http://127.0.0.1:8000";

  // Client-side (browser)
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    const isLocal =
      h === "localhost" || h === "127.0.0.1" || /^192\.168\./.test(h);
    return isLocal ? dev : prod;
  }

  // Server-side (SSR/Route handlers) – fall back to NODE_ENV
  return process.env.NODE_ENV === "development" ? dev : prod;
})();

// 3) Final base (env override > auto)
export const API_BASE = (ENV_BASE || HOST_BASE).replace(/\/$/, "");

// (optional) token namespacing: separate tokens per environment
export const TOKEN_KEY = `access_token@${new URL(API_BASE).host}`;

// unchanged
export async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}


export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);      // initial page gate
  const [fetching, setFetching] = useState(false);   // data fetch spinner
  const [error, setError] = useState<string | null>(null);

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const boot = async () => {
      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        "";

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        // try to verify token if endpoint exists
        try {
          const verify = await fetch(`${API_BASE}/verify-token`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          // If the endpoint exists and rejects, treat as invalid session
          if (verify.status !== 404 && !verify.ok) {
            throw new Error("Invalid token");
          }
        } catch {
          // swallow network/404 here; we only hard-fail if explicit non-OK and not 404 above
        }

        const userData = localStorage.getItem("user");
        if (userData) setUser(JSON.parse(userData));

        // fetch medical history
        setFetching(true);
        setError(null);

        const endpoints = [`${API_BASE}/dashboard-history`, `${API_BASE}/medical-records`];
        let ok = false;
        for (const url of endpoints) {
          const res = await fetch(url, {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
          if (res.ok) {
            const data = await res.json();
            const safe: MedicalRecord[] = (data ?? []).map((r: any) => ({
              id: String(r.id ?? r._id ?? crypto.randomUUID()),
              condition: r.condition ?? r.diagnosis_name ?? r.diagnosis ?? "Unknown",
              date: r.date ?? r.created_at ?? r.updated_at ?? "",
              doctor: r.doctor ?? r.doctor_name ?? undefined,
              symptoms: Array.isArray(r.symptoms)
                ? r.symptoms
                : (r.symptoms?.split?.(",") ?? []).map((s: string) => s.trim()).filter(Boolean),
              diagnosis: r.diagnosis ?? r.assessment ?? "",
              treatment: r.treatment ?? r.plan ?? "",
              notes: r.notes ?? "",
              confidence: typeof r.confidence === "number" ? r.confidence : undefined,
              hideConfidence: Boolean(
                r.hide_confidence ||
                r.hideConfidence ||
                r.routed_through_attack_retrieval ||
                r.dense_attack_retrieval ||
                String(r.route || r.pipeline || r.model_route || r.selected_model || r.analysis_path || "")
                  .toLowerCase()
                  .includes("retrieval") ||
                String(r.route || r.pipeline || r.model_route || r.selected_model || r.analysis_path || "")
                  .toLowerCase()
                  .includes("protected")
              ),
              hide_confidence: Boolean(r.hide_confidence),            }));
            setRecords(safe);
            ok = true;
            break;
          }
        }
        if (!ok) {
          throw new Error("Failed to fetch medical history");
        }
      } catch (e: any) {
        console.error("Dashboard init error:", e);
        setError(e?.message || "Unable to load medical records.");
        toast({
          title: "Session issue",
          description: "Please sign in again.",
          variant: "destructive",
        });
        // If it's an auth problem, clear and redirect
        localStorage.removeItem("access_token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      } finally {
        setFetching(false);
        setLoading(false);
      }
    };

    boot();
  }, [router, toast]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.condition.toLowerCase().includes(q) ||
        (r.diagnosis ?? "").toLowerCase().includes(q) ||
        (r.doctor ?? "").toLowerCase().includes(q) ||
        (r.symptoms ?? []).some((s) => s.toLowerCase().includes(q))
    );
  }, [records, searchQuery]);

  const toggleRecord = (id: string) =>
    setExpandedRecord((cur) => (cur === id ? null : id));

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast({ title: "Logged out", description: "You have been successfully logged out." });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex justify-between items-center">
            <Logo />
            <h1 className="text-xl font-bold text-secondary hidden md:block">Medical History Dashboard</h1>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                className="border-primary text-primary hover:bg-primary hover:text-white"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 container max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-secondary">Welcome, {user?.firstName}!</h2>
              <p className="text-gray-600">View your complete medical history below</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="hidden md:block">
                <p className="font-medium text-secondary">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="relative mb-6">
            <Input
              type="text"
              placeholder="Search medical records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>

          {fetching && <p className="text-sm text-gray-500 mb-3">Loading records…</p>}
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

          <div className="space-y-4">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record) => (
                <Card key={record.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-medium text-secondary">
                          {record.condition}
                          {typeof record.confidence === "number" &&
                            !record.hideConfidence &&
                            !record.hide_confidence && (
                              <span className="text-primary">
                                ({Math.round(record.confidence)}% confidence)
                              </span>
                            )}
                        </CardTitle>
                        <CardDescription>
                          {[record.date, record.doctor].filter(Boolean).join(" • ")}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRecord(record.id)}
                        className="p-0 h-8 w-8"
                        aria-label={expandedRecord === record.id ? "Collapse" : "Expand"}
                      >
                        {expandedRecord === record.id ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    {(record.symptoms?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {record.symptoms.map((symptom, i) => (
                          <span key={i} className="px-2 py-1 bg-accent text-primary text-xs rounded-full">
                            {symptom}
                          </span>
                        ))}
                      </div>
                    )}

                    {expandedRecord === record.id && (
                      <div className="mt-4 space-y-4 animate-in fade-in-50 duration-300">
                        <div>
                          <h4 className="text-sm font-medium text-secondary mb-1">Diagnosis</h4>
                          <p className="text-sm text-gray-600">{record.diagnosis || "—"}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-secondary mb-1">Treatment</h4>
                          <p className="text-sm text-gray-600">{record.treatment || "—"}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-secondary mb-1">Notes</h4>
                          <p className="text-sm text-gray-600">{record.notes || "—"}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary mb-2">
                  {records.length === 0 ? "No medical records yet" : "No matching records found"}
                </h3>
                <p className="text-gray-600">
                  {records.length === 0
                    ? "Your medical history will appear here after using our services."
                    : "Try a different search term."}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="container text-center text-sm text-gray-500">
          <p>© 2025 MediCheck. All rights reserved.</p>
          <p className="mt-1 text-xs">
            <strong>Medical Disclaimer:</strong> The information provided is not intended to be a substitute for
            professional medical advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
