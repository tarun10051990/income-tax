"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFiling } from "@/contexts/FilingContext";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Form16Data } from "@/lib/types";

// Sample extracted data for demo
const SAMPLE_FORM16: Form16Data = {
  employer: {
    name: "Tata Consultancy Services Ltd",
    tan: "MUMS12345A",
    pan: "AAACT1234F",
    address: "TCS House, Raveline Street, Fort, Mumbai - 400001",
  },
  employee: {
    name: "Rahul Sharma",
    pan: "ABCPS1234D",
    aadhaar: "XXXX-XXXX-5678",
    designation: "Senior Software Engineer",
  },
  salary: {
    basicSalary: 600000,
    hra: 300000,
    specialAllowance: 200000,
    bonus: 100000,
    leaveEncashment: 50000,
    otherAllowances: 50000,
  },
  deductions: {
    pfContribution: 72000,
    professionalTax: 2400,
    standardDeduction: 50000,
    otherDeductions: 0,
  },
  tax: {
    tdsDeducted: 120000,
    taxDeposited: 120000,
    taxableIncome: 1175600,
  },
};

export default function UploadPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { setForm16Data, setCurrentStep } = useFiling();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) router.push("/auth/login");
    setCurrentStep("upload");
  }, [isAuthenticated, router, setCurrentStep]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  }, []);

  const handleProcess = async () => {
    setIsProcessing(true);
    setProgress(0);

    // Simulate OCR processing with progress
    const steps = [
      { progress: 20, delay: 500 },
      { progress: 40, delay: 700 },
      { progress: 60, delay: 600 },
      { progress: 80, delay: 500 },
      { progress: 100, delay: 400 },
    ];

    for (const step of steps) {
      await new Promise((r) => setTimeout(r, step.delay));
      setProgress(step.progress);
    }

    setForm16Data(SAMPLE_FORM16);
    setCurrentStep("review");
    router.push("/filing/review");
  };

  const handleUseSample = async () => {
    setIsProcessing(true);
    setProgress(0);
    await new Promise((r) => setTimeout(r, 500));
    setProgress(50);
    await new Promise((r) => setTimeout(r, 500));
    setProgress(100);
    setForm16Data(SAMPLE_FORM16);
    setCurrentStep("review");
    router.push("/filing/review");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Form 16</h1>
        <p className="text-muted mt-1">Upload your Form 16 PDF and our AI will extract all details automatically</p>
      </div>

      {!isProcessing ? (
        <>
          {/* Drop zone */}
          <Card variant="bordered">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : file
                  ? "border-secondary bg-secondary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              {file ? (
                <div className="space-y-3">
                  <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={handleProcess}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Extract with AI
                    </Button>
                    <Button variant="outline" onClick={() => setFile(null)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Drop your Form 16 here</p>
                    <p className="text-sm text-muted mt-1">PDF, Image, or Scanned Document (max 10MB)</p>
                  </div>
                  <label className="inline-block">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button variant="outline" className="cursor-pointer" onClick={() => {}}>
                      Browse Files
                    </Button>
                  </label>
                </div>
              )}
            </div>
          </Card>

          {/* Supported formats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "PDF", label: "PDF Documents", desc: "Form 16 Part A & B" },
              { icon: "IMG", label: "Images", desc: "JPG, PNG formats" },
              { icon: "SCAN", label: "Scanned Docs", desc: "OCR supported" },
            ].map((fmt) => (
              <div key={fmt.icon} className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-border">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xs font-bold">
                  {fmt.icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{fmt.label}</p>
                  <p className="text-xs text-muted">{fmt.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Demo data option */}
          <Card variant="bordered" className="bg-blue-50/50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Try with Sample Data</CardTitle>
                <CardDescription>Don&apos;t have Form 16 handy? Use our sample data to explore the platform.</CardDescription>
              </div>
              <Button variant="outline" onClick={handleUseSample}>
                Use Sample Data
              </Button>
            </div>
          </Card>
        </>
      ) : (
        <Card variant="bordered">
          <div className="text-center py-8 space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Processing your Form 16</h3>
              <p className="text-sm text-muted mt-1">
                {progress < 30 && "Uploading document..."}
                {progress >= 30 && progress < 60 && "Running AI OCR extraction..."}
                {progress >= 60 && progress < 90 && "Validating extracted data..."}
                {progress >= 90 && "Almost done!"}
              </p>
            </div>
            <div className="max-w-xs mx-auto">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted mt-2">{progress}% complete</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
