"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFiling } from "@/contexts/FilingContext";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { usePortalText } from "@/components/filing/GuidedField";
import { FILL_FIELD_LABELS, ReadDocument, readDocument, totalsByField } from "@/lib/document-reader";
import { formatCurrency } from "@/lib/utils";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv";

const EXAMPLES = [
  { emoji: "👧", text: "Sukanya Samriddhi passbook / statement" },
  { emoji: "🏦", text: "Bank or post-office statement (savings interest, PPF, LIC, SIP payments)" },
  { emoji: "📈", text: "Mutual fund / ELSS statement (CAMS, KFintech, Groww, Zerodha)" },
  { emoji: "🛡️", text: "LIC or health-insurance premium receipt" },
  { emoji: "🏠", text: "Home-loan interest certificate" },
  { emoji: "💰", text: "FD / interest certificate, NPS statement, school fee receipt, donation receipt" },
];

export default function DocumentsPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { form16Data, documents, setDocuments, applyDocuments, setCurrentStep } = useFiling();
  const t = usePortalText();
  const inputRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<ReadDocument[]>(documents);
  const [busy, setBusy] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (!form16Data) { router.push("/filing/upload"); return; }
    setCurrentStep("documents");
  }, [isAuthenticated, isReady, form16Data, router, setCurrentStep]);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setErrors([]);
    setBusy((b) => [...b, ...list.map((f) => f.name)]);
    for (const file of list) {
      try {
        const doc = await readDocument(file);
        setDocs((prev) => [...prev, doc]);
      } catch (err) {
        console.error("Could not read document", file.name, err);
        setErrors((e) => [...e, `${file.name}: we could not open this file. Please upload a PDF, photo (JPG/PNG) or CSV.`]);
      } finally {
        setBusy((b) => b.filter((n) => n !== file.name));
      }
    }
  }, []);

  const updateFill = (docId: string, fillId: string, patch: { amount?: number; include?: boolean }) => {
    setDocs((prev) => prev.map((d) => d.id !== docId ? d : {
      ...d,
      fills: d.fills.map((f) => f.id !== fillId ? f : { ...f, ...patch }),
    }));
  };

  const removeDoc = (docId: string) => setDocs((prev) => prev.filter((d) => d.id !== docId));

  const totals = totalsByField(docs);
  const totalEntries = Object.entries(totals).filter(([, v]) => (v ?? 0) > 0) as Array<[keyof typeof FILL_FIELD_LABELS, number]>;
  const hasForm16 = docs.some((d) => d.form16);

  const goNext = () => {
    applyDocuments(docs);
    setCurrentStep("additional_income");
    router.push("/filing/income");
  };

  const skip = () => {
    setDocuments(docs);
    setCurrentStep("additional_income");
    router.push("/filing/income");
  };

  if (!form16Data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("itr.docs.title")}</h1>
        <p className="text-muted mt-1">{t("itr.docs.subtitle")}</p>
      </div>

      <Card variant="bordered">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); void addFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
        >
          <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden"
            onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
          <div className="text-4xl mb-2">📂</div>
          <p className="font-semibold">{t("itr.docs.drop")}</p>
          <p className="text-sm text-muted mt-1">{t("itr.docs.dropHint")}</p>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {EXAMPLES.map((ex) => (
            <div key={ex.text} className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2">
              <span>{ex.emoji}</span>
              <span className="text-muted">{ex.text}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">{t("itr.docs.privacy")}</p>
      </Card>

      {busy.length > 0 && (
        <Card variant="bordered" className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>{t("itr.docs.reading")} {busy.join(", ")}</span>
          </div>
        </Card>
      )}

      {errors.map((e) => (
        <div key={e} className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">{e}</div>
      ))}

      {docs.map((doc) => (
        <Card key={doc.id} variant="bordered">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{doc.title}</CardTitle>
              <CardDescription className="break-all">{doc.fileName}</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={doc.confidence === "high" ? "success" : doc.confidence === "medium" ? "warning" : "default"}>
                {doc.confidence === "high" ? "Read clearly" : doc.confidence === "medium" ? "Please check" : "Could not read"}
              </Badge>
              <button type="button" onClick={() => removeDoc(doc.id)} className="text-xs text-muted hover:text-danger" aria-label="Remove file">
                Remove
              </button>
            </div>
          </div>

          {doc.form16 && (
            <p className="mt-3 text-sm rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
              Salary read: <strong>{formatCurrency(doc.form16.salary.basicSalary + doc.form16.salary.hra + doc.form16.salary.specialAllowance + doc.form16.salary.bonus + doc.form16.salary.leaveEncashment + doc.form16.salary.otherAllowances)}</strong>,
              tax already cut by employer: <strong>{formatCurrency(doc.form16.tax.tdsDeducted)}</strong>.
            </p>
          )}

          {doc.fills.length > 0 && (
            <div className="mt-4 space-y-3">
              {doc.fills.map((f) => (
                <div key={f.id} className={`rounded-lg border p-3 ${f.include ? "border-border" : "border-border/50 opacity-60"}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="flex items-start gap-2 flex-1 text-sm cursor-pointer">
                      <input type="checkbox" className="mt-1" checked={f.include} onChange={(e) => updateFill(doc.id, f.id, { include: e.target.checked })} />
                      <span>
                        <span className="font-medium">{f.label}</span>
                        <span className="block text-xs text-muted mt-0.5">Goes into: {FILL_FIELD_LABELS[f.field]}</span>
                      </span>
                    </label>
                    <div className="relative sm:w-44">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs text-muted">₹</span>
                      <input
                        type="number" min={0} value={f.amount || ""} aria-label={`Amount for ${f.label}`}
                        onChange={(e) => updateFill(doc.id, f.id, { amount: Number(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-border bg-surface pl-7 pr-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-light"
                      />
                    </div>
                  </div>
                  <details className="mt-2 text-xs text-muted">
                    <summary className="cursor-pointer">Where we saw this</summary>
                    <p className="mt-1 font-mono break-words">{f.evidence}</p>
                  </details>
                </div>
              ))}
            </div>
          )}

          {doc.notes.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-muted list-disc pl-5">
              {doc.notes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          )}
        </Card>
      ))}

      {(totalEntries.length > 0 || hasForm16) && (
        <Card variant="bordered" className="bg-emerald-50 border-emerald-200">
          <CardTitle>{t("itr.docs.summary.title")}</CardTitle>
          <CardDescription>{t("itr.docs.summary.body")}</CardDescription>
          <ul className="mt-3 divide-y divide-emerald-200 text-sm">
            {totalEntries.map(([field, amount]) => (
              <li key={field} className="flex justify-between py-2 gap-4">
                <span>{FILL_FIELD_LABELS[field]}</span>
                <span className="font-mono font-semibold">{formatCurrency(amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <Button variant="outline" onClick={() => {
          if (form16Data.salary.basicSalary > 0) { setCurrentStep("review"); router.push("/filing/review"); }
          else { setCurrentStep("upload"); router.push("/filing/upload"); }
        }}>
          {t("itr.docs.back")}
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={skip}>{t("itr.docs.skip")}</Button>
          <Button onClick={goNext} disabled={busy.length > 0}>
            {docs.length ? t("itr.docs.next") : t("itr.docs.nextEmpty")}
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
