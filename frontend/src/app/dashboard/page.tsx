"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFiling } from "@/contexts/FilingContext";
import { useEffect, useState } from "react";
import Card, { CardContent, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isReady } = useAuth();
  const { onboardingData, setOnboardingData, setCurrentStep } = useFiling();

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, isReady, router]);

  if (!isAuthenticated) return null;

  if (!onboardingData) {
    return <OnboardingFlow onComplete={(data) => {
      setOnboardingData(data);
    }} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(" ")[0]}</h1>
          <p className="text-muted mt-1">
            {onboardingData ? `FY ${onboardingData.financialYear} | AY 2025-26` : "Let's get your taxes filed"}
          </p>
        </div>
        <Link href="/filing/upload">
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Tax Return
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card variant="bordered">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Tax Liability</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(0)}</p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Expected Refund</p>
                <p className="text-2xl font-bold mt-1 text-secondary">{formatCurrency(0)}</p>
              </div>
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Deductions Claimed</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(0)}</p>
              </div>
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Tax Saving Potential</p>
                <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(75000)}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filing Progress & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card variant="bordered" className="lg:col-span-2">
          <CardTitle>Filing Progress</CardTitle>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted">FY 2024-25 (AY 2025-26)</span>
              <Badge variant="warning">Not Started</Badge>
            </div>
            <ProgressBar value={0} showLabel />
            <div className="mt-4 flex gap-3">
              <Link href="/filing/upload">
                <Button size="sm">Start Filing</Button>
              </Link>
              <Link href="/advisor">
                <Button variant="outline" size="sm">Get AI Advice</Button>
              </Link>
            </div>
          </div>
        </Card>

        <Card variant="bordered">
          <CardTitle>Quick Actions</CardTitle>
          <div className="mt-4 space-y-2">
            <Link href="/filing/upload" className="block">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left" onClick={() => setCurrentStep("upload")}>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <span className="text-sm font-medium">Upload Form 16</span>
              </button>
            </Link>
            <Link href="/filing/compute" className="block">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium">Tax Calculator</span>
              </button>
            </Link>
            <Link href="/advisor" className="block">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <span className="text-sm font-medium">AI Tax Advisor</span>
              </button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Investment Recommendations Preview */}
      <Card variant="bordered">
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Recommended Investments</CardTitle>
          <Link href="/filing/suggestions">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: "ELSS Mutual Funds", section: "80C", returns: "12-15%", risk: "Medium", lockIn: "3 years" },
            { name: "NPS (Tier 1)", section: "80CCD(1B)", returns: "9-12%", risk: "Medium", lockIn: "Till 60" },
            { name: "Health Insurance", section: "80D", returns: "Protection", risk: "Low", lockIn: "Annual" },
          ].map((inv) => (
            <div key={inv.name} className="bg-background rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{inv.name}</span>
                <Badge variant="info">Sec {inv.section}</Badge>
              </div>
              <div className="space-y-1 text-xs text-muted">
                <div className="flex justify-between"><span>Expected Returns</span><span className="font-medium text-foreground">{inv.returns}</span></div>
                <div className="flex justify-between"><span>Risk</span><span className="font-medium text-foreground">{inv.risk}</span></div>
                <div className="flex justify-between"><span>Lock-in</span><span className="font-medium text-foreground">{inv.lockIn}</span></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Onboarding Flow Component
import { OnboardingData } from "@/lib/types";

function OnboardingFlow({ onComplete }: { onComplete: (data: OnboardingData) => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    financialYear: "2024-25",
    employmentType: "salaried",
    taxRegimePreference: "compare",
  });

  const handleComplete = () => {
    onComplete(data);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Let&apos;s set up your tax filing</h1>
        <p className="text-muted mt-2">Step {step} of 3</p>
        <ProgressBar value={step} max={3} className="mt-4" />
      </div>

      <Card variant="bordered">
        <CardContent>
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Select Financial Year</h2>
              <div className="grid grid-cols-2 gap-3">
                {["2024-25", "2023-24"].map((fy) => (
                  <button
                    key={fy}
                    onClick={() => setData((d) => ({ ...d, financialYear: fy }))}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      data.financialYear === fy
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="font-semibold">FY {fy}</div>
                    <div className="text-xs text-muted mt-1">AY {parseInt(fy.split("-")[0]) + 1}-{parseInt(fy.split("-")[1]) + 1}</div>
                  </button>
                ))}
              </div>
              <Button className="w-full" onClick={() => setStep(2)}>Continue</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Employment Type</h2>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: "salaried", label: "Salaried", desc: "Working for an employer" },
                  { key: "business", label: "Business Owner", desc: "Running a business" },
                  { key: "freelancer", label: "Freelancer", desc: "Self-employed / consultant" },
                  { key: "pensioner", label: "Pensioner", desc: "Receiving pension" },
                ] as const).map((emp) => (
                  <button
                    key={emp.key}
                    onClick={() => setData((d) => ({ ...d, employmentType: emp.key }))}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      data.employmentType === emp.key
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="font-semibold text-sm">{emp.label}</div>
                    <div className="text-xs text-muted mt-1">{emp.desc}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={() => setStep(3)}>Continue</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Tax Regime Preference</h2>
              <div className="space-y-3">
                {([
                  { key: "compare", label: "Compare Both (Recommended)", desc: "We'll calculate both and recommend the best one" },
                  { key: "old", label: "Old Tax Regime", desc: "With all deductions (80C, 80D, HRA, etc.)" },
                  { key: "new", label: "New Tax Regime", desc: "Lower slabs with fewer deductions" },
                ] as const).map((regime) => (
                  <button
                    key={regime.key}
                    onClick={() => setData((d) => ({ ...d, taxRegimePreference: regime.key }))}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      data.taxRegimePreference === regime.key
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="font-semibold text-sm">{regime.label}</div>
                    <div className="text-xs text-muted mt-1">{regime.desc}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                <Button className="flex-1" onClick={handleComplete}>Complete Setup</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
