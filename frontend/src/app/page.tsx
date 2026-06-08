"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    title: "Upload Form 16",
    description: "Simply upload your Form 16 PDF. Our AI extracts all salary, deduction, and TDS details automatically.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: "Smart Tax Computation",
    description: "Instant comparison of Old vs New tax regime. We recommend the regime that saves you the most.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "AI Tax-Saving Advisor",
    description: "Personalized investment suggestions to maximize deductions under 80C, 80D, NPS, and more.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Generate ITR Form",
    description: "Auto-generate ITR-1, ITR-2, ITR-3, or ITR-4. Download as JSON, Excel, or PDF ready for e-filing.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    title: "AI Financial Chatbot",
    description: "Ask anything about tax. Get personalized answers based on your actual tax data.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Bank-Grade Security",
    description: "AES-256 encryption, SSL/TLS, DPDP Act compliant. Your financial data is always protected.",
  },
];

const STEPS = [
  { num: "1", title: "Login", desc: "Mobile OTP, Email, or Google" },
  { num: "2", title: "Upload Form 16", desc: "PDF, Image, or Scanned" },
  { num: "3", title: "Review & Edit", desc: "AI-extracted data" },
  { num: "4", title: "Get Suggestions", desc: "Tax-saving investments" },
  { num: "5", title: "Compare Regimes", desc: "Old vs New side-by-side" },
  { num: "6", title: "Generate & File", desc: "ITR ready in minutes" },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              AY 2025-26 Filing Open
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
              File Your ITR in{" "}
              <span className="text-primary">10 Minutes</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted max-w-2xl mx-auto">
              AI-powered income tax filing for India. Upload Form 16, get smart tax-saving suggestions,
              compare regimes, and generate your ITR form — all in one place.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={isAuthenticated ? "/dashboard" : "/auth/register"}>
                <Button size="lg" className="w-full sm:w-auto text-base px-8">
                  Start Filing Free
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </Link>
              <Link href={isAuthenticated ? "/advisor" : "/auth/login"}>
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8">
                  Talk to AI Advisor
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">No credit card required. Free for salaried individuals.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-surface py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">File in 6 Simple Steps</h2>
            <p className="mt-3 text-muted">From login to filing — done in under 10 minutes</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {STEPS.map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">
                  {step.num}
                </div>
                <h3 className="font-semibold text-sm">{step.title}</h3>
                <p className="text-xs text-muted mt-1">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Powerful Features</h2>
            <p className="mt-3 text-muted">Everything you need to file your taxes confidently</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="bg-surface rounded-xl p-6 border border-border hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tax Regime Comparison Preview */}
      <section className="bg-surface py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Old vs New Tax Regime</h2>
            <p className="mt-3 text-muted">We help you choose the regime that saves you the most</p>
          </div>
          <div className="max-w-3xl mx-auto bg-background rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-primary/5">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold">Particulars</th>
                  <th className="text-right px-6 py-4 font-semibold text-primary">Old Regime</th>
                  <th className="text-right px-6 py-4 font-semibold text-secondary">New Regime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-6 py-3">Gross Salary</td>
                  <td className="px-6 py-3 text-right font-mono">12,00,000</td>
                  <td className="px-6 py-3 text-right font-mono">12,00,000</td>
                </tr>
                <tr>
                  <td className="px-6 py-3">Deductions</td>
                  <td className="px-6 py-3 text-right font-mono text-secondary">-3,50,000</td>
                  <td className="px-6 py-3 text-right font-mono text-secondary">-75,000</td>
                </tr>
                <tr>
                  <td className="px-6 py-3">Taxable Income</td>
                  <td className="px-6 py-3 text-right font-mono">8,50,000</td>
                  <td className="px-6 py-3 text-right font-mono">11,25,000</td>
                </tr>
                <tr className="bg-primary/5 font-semibold">
                  <td className="px-6 py-3">Tax Payable</td>
                  <td className="px-6 py-3 text-right font-mono text-primary">82,160</td>
                  <td className="px-6 py-3 text-right font-mono text-secondary">68,640</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-center mt-4 text-sm text-muted">
            Example for CTC of Rs. 12 Lakhs with standard deductions
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-8 sm:p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to file your taxes?</h2>
            <p className="text-blue-100 mb-8 max-w-xl mx-auto">
              Join thousands of taxpayers who save time and money filing with TaxFilr.
              It&apos;s free for salaried individuals.
            </p>
            <Link href={isAuthenticated ? "/filing/upload" : "/auth/register"}>
              <Button size="lg" className="bg-white text-primary hover:bg-blue-50 px-8 text-base">
                File My ITR Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
