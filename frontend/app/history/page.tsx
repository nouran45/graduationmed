"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ArrowRight, Clock, FileImage, Activity, Calendar, Loader2 } from "lucide-react";

type Result = {
  id: string;
  label: string; // Changed from number to string for better readability
  confidence: number;
  timestamp: string;
  filename: string;
  imageUrl?: string;
};

export default function HistoryPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("http://localhost:8000/history");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
        console.error("Fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="bg-primary py-2">
          <div className="container flex justify-between items-center">
            <div className="flex items-center gap-2 text-white text-sm">
              <span>MediCheck Health Assistant</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-white text-sm hover:underline">
                Patient Portal
              </Link>
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
            <nav className="hidden md:flex items-center gap-8">
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/">
                Home
              </Link>
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/symptom-checker">
                Symptom Checker
              </Link>
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/services">
                Services
              </Link>
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/history">
                History
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex border-primary text-primary hover:bg-primary hover:text-white"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/symptom-checker">
                <Button size="sm" className="bg-primary text-white hover:bg-primary/90">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 py-12">
        <section className="container">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-4">Prediction History</h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Review your previous medical analysis results
              </p>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-12 bg-red-50 rounded-lg">
                <p className="text-red-500 mb-4">Error loading history: {error}</p>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="border-red-300 text-red-500 hover:bg-red-50"
                >
                  Retry
                </Button>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">No history records found</p>
                <Link href="/symptom-checker">
                  <Button className="bg-primary text-white hover:bg-primary/90">
                    Start New Analysis <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 rounded-t-lg border-b">
                  <div className="col-span-4 md:col-span-3 font-medium text-sm text-gray-500">Image</div>
                  <div className="col-span-3 md:col-span-2 font-medium text-sm text-gray-500">Condition</div>
                  <div className="col-span-3 md:col-span-2 font-medium text-sm text-gray-500">Confidence</div>
                  <div className="col-span-2 md:col-span-3 font-medium text-sm text-gray-500">Date</div>
                  <div className="col-span-1 md:col-span-2 font-medium text-sm text-gray-500 text-right">Actions</div>
                </div>

                {results.map((result) => (
                  <div 
                    key={result.id} 
                    className="grid grid-cols-12 gap-4 items-center p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="col-span-4 md:col-span-3 flex items-center gap-3">
                      {result.imageUrl ? (
                        <img 
                          src={result.imageUrl} 
                          alt={result.filename} 
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      ) : (
                        <FileImage className="h-5 w-5 text-primary" />
                      )}
                      <p className="font-medium truncate">{result.filename}</p>
                    </div>
                    
                    <div className="col-span-3 md:col-span-2">
                      <p className="font-medium">{result.label}</p>
                    </div>
                    
                    <div className="col-span-3 md:col-span-2">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${result.confidence * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{(result.confidence * 100).toFixed(1)}%</p>
                    </div>
                    
                    <div className="col-span-2 md:col-span-3">
                      <p className="text-sm text-gray-600">
                        {new Date(result.timestamp).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="col-span-1 md:col-span-2 flex justify-end">
                      <Link href={`/symptom-checker?historyId=${result.id}`}>
                        <Button variant="outline" size="sm" className="text-primary border-primary">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-secondary text-white">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <Logo />
              <p className="text-gray-300 text-sm">
                MediCheck provides accurate medical analysis powered by AI.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link href="/" className="text-gray-300 hover:text-white">Home</Link></li>
                <li><Link href="/symptom-checker" className="text-gray-300 hover:text-white">Symptom Checker</Link></li>
                <li><Link href="/history" className="text-gray-300 hover:text-white">History</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><Link href="/contact" className="text-gray-300 hover:text-white">Contact Us</Link></li>
                <li><Link href="/faq" className="text-gray-300 hover:text-white">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-gray-300 hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-gray-300 hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-sm text-gray-400">© {new Date().getFullYear()} MediCheck. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}