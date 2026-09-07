"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFiling } from "@/contexts/FilingContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { investmentOptions } from "@/lib/tax-engine";

export default function SuggestionsPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { form16Data, taxSuggestions, computeTaxResult, setCurrentStep } = useFiling();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (!form16Data) { router.push("/filing/upload"); return; }
    setCurrentStep("suggestions");
    computeTaxResult();
  }, [isAuthenticated, isReady, form16Data, router, setCurrentStep, computeTaxResult]);

  const totalPotentialSaving = taxSuggestions.reduce((a, s) => a + s.potentialSaving, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tax-Saving Suggestions</h1>
        <p className="text-muted mt-1">Personalized investment recommendations to minimize your tax</p>
      </div>

      {/* Summary Card */}
      {totalPotentialSaving > 0 && (
        <Card variant="bordered" className="bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold">
                You can save up to {formatCurrency(totalPotentialSaving)} in taxes!
              </h3>
              <p className="text-sm text-muted mt-1">
                By investing in the recommended instruments below under the Old Tax Regime
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* AI Suggestions */}
      {taxSuggestions.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Personalized Recommendations</h2>
          {taxSuggestions.map((suggestion, index) => (
            <Card key={index} variant="bordered" className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="info">Section {suggestion.section}</Badge>
                    <Badge variant={
                      suggestion.riskLevel === "low" ? "success" :
                      suggestion.riskLevel === "medium" ? "warning" : "danger"
                    }>
                      {suggestion.riskLevel} risk
                    </Badge>
                  </div>
                  <h3 className="font-semibold">{suggestion.title}</h3>
                  <p className="text-sm text-muted mt-1">{suggestion.description}</p>

                  {/* Usage bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted mb-1">
                      <span>Used: {formatCurrency(suggestion.currentUsed)}</span>
                      <span>Limit: {formatCurrency(suggestion.maxBenefit)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${Math.min((suggestion.currentUsed / suggestion.maxBenefit) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted mt-1">
                      Remaining: {formatCurrency(suggestion.remainingLimit)}
                    </p>
                  </div>

                  {/* Investment options */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggestion.investmentOptions.map((opt) => (
                      <span key={opt} className="text-xs bg-gray-100 text-muted px-2 py-1 rounded">
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted">Potential Tax Saving</p>
                  <p className="text-xl font-bold text-secondary">{formatCurrency(suggestion.potentialSaving)}</p>
                  <p className="text-xs text-muted mt-1">Lock-in: {suggestion.lockInPeriod}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card variant="bordered" className="text-center py-8">
          <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold">Great job!</h3>
          <p className="text-sm text-muted mt-1">You have maximized all available deductions.</p>
        </Card>
      )}

      {/* Investment Options */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Investment Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {investmentOptions.map((inv) => (
            <Card key={inv.name} variant="bordered" className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={
                      inv.riskLevel === "low" ? "success" :
                      inv.riskLevel === "medium" ? "warning" : "danger"
                    }>
                      {inv.riskLevel}
                    </Badge>
                    {inv.section !== "N/A" && <Badge variant="info">Sec {inv.section}</Badge>}
                  </div>
                  <h3 className="font-semibold text-sm">{inv.name}</h3>
                  <p className="text-xs text-muted mt-1">{inv.description}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted">Returns</span>
                  <p className="font-medium">{inv.expectedReturns}</p>
                </div>
                <div>
                  <span className="text-muted">Lock-in</span>
                  <p className="font-medium">{inv.lockInPeriod}</p>
                </div>
                <div>
                  <span className="text-muted">Tax Benefit</span>
                  <p className="font-medium">{inv.taxBenefit}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => { setCurrentStep("compute"); router.push("/filing/compute"); }}>
          Back
        </Button>
        <Button onClick={() => { setCurrentStep("generate"); router.push("/filing/generate"); }}>
          Generate ITR
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
