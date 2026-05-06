"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
  FileIcon as FileHistory,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type MedicalRecord = {
  id: string;
  condition: string;
  date: string; // ISO string or readable date
  doctor: string;
  symptoms: string[];
  diagnosis?: string;
  treatment?: string;
  notes?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL; // e.g. "https://api.mediscan.eu.org"

export default function MedicalHistoryPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ---- auth / gate ----
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    const userData = localStorage.getItem("user");
    if (userData) setUser(JSON.parse(userData));

    setLoading(false);
  }, [router]);

  // ---- fetch records ----
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!API_BASE) {
      setError(
        "API base URL is missing. Set NEXT_PUBLIC_API_BASE_URL in your env."
      );
      return;
    }

    const run = async () => {
      setError(null);
      setFetching(true);

      try {
        // If you store token under another key, change here.
        const token =
          localStorage.getItem("authToken") ||
          localStorage.getItem("token") ||
          localStorage.getItem("access_token") ||
          "";

        // optional: build query param for server-side filtering
        const url = new URL(`${API_BASE.replace(/\/$/, "")}/medical-records`);
        if (searchQuery.trim()) url.searchParams.set("search", searchQuery);

        const res = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          // If your API is on another domain and you set cookies there:
          // credentials: "include",
        });

        if (!res.ok) {
          const msg = await safeText(res);
          throw new Error(
            `Fetch failed (${res.status})${
              msg ? `: ${msg}` : ""
            }`
          );
        }

       const data: any[] = await res.json();

        // Defensive: normalize fields we rely on
        const safe = (data ?? []).map((r) => ({
          id: r.id,
          condition: r.condition ?? "Unknown",
          date: r.date ?? "",
          doctor: r.doctor ?? "—",
          symptoms: Array.isArray(r.symptoms) ? r.symptoms : [],
          diagnosis: r.diagnosis ?? "",
          treatment: r.treatment ?? "",
          notes: r.notes ?? "",
        }));

        setRecords(safe);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load medical records.");
      } finally {
        setFetching(false);
      }
    };

    // debounce when typing in the search box (300ms)
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(run, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [loading, searchQuery]);

  const toggleRecord = (id: string) => {
    setExpandedRecord((cur) => (cur === id ? null : id));
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    router.push("/");
  };

  // client-side filtering (kept, in case your backend doesn’t support ?search)
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.condition.toLowerCase().includes(q) ||
        r.doctor.toLowerCase().includes(q) ||
        r.symptoms?.some((s) => s.toLowerCase().includes(q))
    );
  }, [records, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex">
      {/* Sidebar */}
      <div className="w-64 bg-secondary text-white hidden md:block">
        <div className="p-4 border-b border-secondary-700">
          <Logo />
        </div>
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-300">{user?.email}</p>
            </div>
          </div>

          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary-700"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/dashboard/appointments"
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary-700"
            >
              <Calendar className="h-5 w-5" />
              <span>Appointments</span>
            </Link>
            <Link
              href="/dashboard/medical-history"
              className="flex items-center space-x-3 p-3 rounded-lg bg-secondary-700"
            >
              <FileHistory className="h-5 w-5 text-primary" />
              <span>Medical History</span>
            </Link>
            <Link
              href="/dashboard/health-records"
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary-700"
            >
              <FileText className="h-5 w-5" />
              <span>Health Records</span>
            </Link>
            <Link
              href="/dashboard/vitals"
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary-700"
            >
              <Heart className="h-5 w-5" />
              <span>Vitals</span>
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary-700"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>
          </nav>
        </div>
        <div className="absolute bottom-0 w-64 p-4 border-t border-secondary-700">
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-secondary-700 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="container py-4">
            <div className="flex justify-between items-center">
              <div className="md:hidden">
                <Logo />
              </div>
              <h1 className="text-xl font-bold text-secondary hidden md:block">
                Medical History
              </h1>
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

        <main className="flex-1 p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-secondary mb-4">
              Medical History
            </h2>
            <p className="text-gray-600 mb-6">
              View your complete medical history, including past diagnoses,
              treatments, and consultations.
            </p>

            <div className="relative mb-4">
              <Input
                type="text"
                placeholder="Search medical records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {error && (
              <div className="mb-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {fetching && (
              <div className="mb-4 text-sm text-gray-500">Loading records…</div>
            )}

            <Tabs defaultValue="all">
              <TabsList className="mb-6">
                <TabsTrigger value="all">All Records</TabsTrigger>
                <TabsTrigger value="conditions">Conditions</TabsTrigger>
                <TabsTrigger value="consultations">Consultations</TabsTrigger>
                <TabsTrigger value="treatments">Treatments</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <Card key={record.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg font-medium text-secondary">
                              {record.condition}
                            </CardTitle>
                            <CardDescription>
                              {record.date} • {record.doctor}
                            </CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRecord(record.id)}
                            className="p-0 h-8 w-8"
                            aria-label={
                              expandedRecord === record.id
                                ? "Collapse"
                                : "Expand"
                            }
                          >
                            {expandedRecord === record.id ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(record.symptoms ?? []).map((symptom, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-accent text-primary text-xs rounded-full"
                            >
                              {symptom}
                            </span>
                          ))}
                        </div>

                        {expandedRecord === record.id && (
                          <div className="mt-4 space-y-4 animate-in fade-in-50 duration-300">
                            <div>
                              <h4 className="text-sm font-medium text-secondary mb-1">
                                Diagnosis
                              </h4>
                              <p className="text-sm text-gray-600">
                                {record.diagnosis || "—"}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-secondary mb-1">
                                Treatment
                              </h4>
                              <p className="text-sm text-gray-600">
                                {record.treatment || "—"}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-secondary mb-1">
                                Notes
                              </h4>
                              <p className="text-sm text-gray-600">
                                {record.notes || "—"}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Link
                          href={`/dashboard/medical-history/${record.id}`}
                          className="text-primary text-sm"
                        >
                          View full record
                        </Link>
                      </CardFooter>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-secondary mb-2">
                      No records found
                    </h3>
                    <p className="text-gray-600">
                      No medical records match your search criteria.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="conditions">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-secondary mb-2">
                    Conditions
                  </h3>
                  <p className="text-gray-600">
                    View your diagnosed conditions here.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="consultations">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-secondary mb-2">
                    Consultations
                  </h3>
                  <p className="text-gray-600">
                    View your past consultations here.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="treatments">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-secondary mb-2">
                    Treatments
                  </h3>
                  <p className="text-gray-600">
                    View your treatment history here.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Read response text safely without throwing if body is empty */
async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
