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
import { usePortalText } from "@/components/filing/GuidedField";

export default function SuggestionsPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { form16Data, plainSavings, computeTaxResult, setCurrentStep } = useFiling();
  const t = usePortalText();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (!form16Data) { router.push("/filing/upload"); return; }
    setCurrentStep("suggestions");
    computeTaxResult();
  }, [isAuthenticated, isReady, form16Data, router, setCurrentStep, computeTaxResult]);

  const tips = plainSavings?.tips ?? [];
  const totalSave = tips.reduce((a, s) => a + s.saveAbout, 0);
  const onNew = plainSavings?.betterMethod === "new";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("itr.tips.title")}</h1>
        <p className="text-muted mt-1">{t("itr.tips.subtitle")}</p>
      </div>

      {plainSavings && (
        <Card variant="bordered" className="bg-amber-50 border-amber-200">
          <p className="text-lg font-semibold">{plainSavings.headline}</p>
          <p className="text-sm text-muted mt-1">{plainSavings.explain}</p>
        </Card>
      )}

      {totalSave > 0 && (
        <Card variant="bordered" className="bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 text-2xl">💡</div>
            <div>
              <h3 className="text-lg font-bold">{t("itr.tips.total")} {formatCurrency(totalSave)}</h3>
              {onNew && <p className="text-sm text-muted mt-1">{t("itr.tips.newRegime")}</p>}
            </div>
          </div>
        </Card>
      )}

      {tips.length > 0 ? (
        <div className="space-y-4">
          {tips.map((tip, index) => (
            <Card key={tip.key} variant="bordered" className="hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">{index + 1}</span>
                    <h3 className="font-semibold">{tip.action}</h3>
                  </div>
                  <p className="text-sm">{tip.why}</p>
                  <p className="text-sm text-muted mt-2"><span className="font-medium text-foreground">{t("itr.tips.keepInMind")}: </span>{tip.keepInMind}</p>
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("itr.tips.options")}</p>
                    <div className="flex flex-wrap gap-2">
                      {tip.options.map((opt) => (
                        <span key={opt} className="text-xs bg-gray-100 text-foreground px-2 py-1 rounded">{opt}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {tip.saveAbout > 0 && (
                  <div className="md:text-right flex-shrink-0 rounded-lg bg-emerald-50 px-4 py-3">
                    <p className="text-xs text-muted">{t("itr.tips.saveAbout")}</p>
                    <p className="text-xl font-bold text-secondary">{formatCurrency(tip.saveAbout)}</p>
                    <p className="text-xs text-muted mt-1">{t("itr.tips.roomLeft")}: {formatCurrency(tip.roomLeft)}</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card variant="bordered" className="text-center py-8">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="font-semibold">{t("itr.tips.none")}</h3>
        </Card>
      )}

      {/* Investment Options */}
      <details className="group">
        <summary className="cursor-pointer text-lg font-semibold mb-4 list-none flex items-center gap-2">
          <span className="transition-transform group-open:rotate-90">▸</span> Want details? All the saving options compared
        </summary>
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
      </details>

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
