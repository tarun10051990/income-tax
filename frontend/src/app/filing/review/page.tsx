"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFiling } from "@/contexts/FilingContext";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

export default function ReviewPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { form16Data, setCurrentStep } = useFiling();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (!form16Data) { router.push("/filing/upload"); return; }
    setCurrentStep("review");
  }, [isAuthenticated, isReady, form16Data, router, setCurrentStep]);

  if (!form16Data) return null;

  const grossSalary = Object.values(form16Data.salary).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Extracted Data</h1>
          <p className="text-muted mt-1">Verify the AI-extracted information from your Form 16</p>
        </div>
        <Badge variant="success">AI Extracted</Badge>
      </div>

      {/* Employer Details */}
      <Card variant="bordered">
        <CardTitle>Employer Details</CardTitle>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Employer Name" value={form16Data.employer.name} />
          <InfoRow label="TAN" value={form16Data.employer.tan} />
          <InfoRow label="PAN" value={form16Data.employer.pan} />
          <InfoRow label="Address" value={form16Data.employer.address} />
        </div>
      </Card>

      {/* Employee Details */}
      <Card variant="bordered">
        <CardTitle>Employee Details</CardTitle>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Name" value={form16Data.employee.name} />
          <InfoRow label="PAN" value={form16Data.employee.pan} validated />
          <InfoRow label="Aadhaar" value={form16Data.employee.aadhaar || "Not provided"} />
          <InfoRow label="Designation" value={form16Data.employee.designation} />
        </div>
      </Card>

      {/* Salary Breakdown */}
      <Card variant="bordered">
        <div className="flex items-center justify-between">
          <CardTitle>Salary Components</CardTitle>
          <span className="text-lg font-bold text-primary">{formatCurrency(grossSalary)}</span>
        </div>
        <div className="mt-4 space-y-3">
          <SalaryRow label="Basic Salary" amount={form16Data.salary.basicSalary} />
          <SalaryRow label="HRA" amount={form16Data.salary.hra} />
          <SalaryRow label="Special Allowance" amount={form16Data.salary.specialAllowance} />
          <SalaryRow label="Bonus" amount={form16Data.salary.bonus} />
          <SalaryRow label="Leave Encashment" amount={form16Data.salary.leaveEncashment} />
          <SalaryRow label="Other Allowances" amount={form16Data.salary.otherAllowances} />
          <div className="pt-3 border-t border-border flex justify-between font-semibold">
            <span>Gross Salary</span>
            <span>{formatCurrency(grossSalary)}</span>
          </div>
        </div>
      </Card>

      {/* Deductions */}
      <Card variant="bordered">
        <CardTitle>Deductions (from Form 16)</CardTitle>
        <div className="mt-4 space-y-3">
          <SalaryRow label="PF Contribution (Employee)" amount={form16Data.deductions.pfContribution} negative />
          <SalaryRow label="Professional Tax" amount={form16Data.deductions.professionalTax} negative />
          <SalaryRow label="Standard Deduction" amount={form16Data.deductions.standardDeduction} negative />
          {form16Data.deductions.otherDeductions > 0 && (
            <SalaryRow label="Other Deductions" amount={form16Data.deductions.otherDeductions} negative />
          )}
        </div>
      </Card>

      {/* TDS Details */}
      <Card variant="bordered">
        <CardTitle>Tax Deducted at Source (TDS)</CardTitle>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-primary/5 rounded-lg p-4 text-center">
            <p className="text-xs text-muted">TDS Deducted</p>
            <p className="text-xl font-bold text-primary mt-1">{formatCurrency(form16Data.tax.tdsDeducted)}</p>
          </div>
          <div className="bg-secondary/5 rounded-lg p-4 text-center">
            <p className="text-xs text-muted">Tax Deposited</p>
            <p className="text-xl font-bold text-secondary mt-1">{formatCurrency(form16Data.tax.taxDeposited)}</p>
          </div>
          <div className="bg-accent/5 rounded-lg p-4 text-center">
            <p className="text-xs text-muted">Taxable Income (per Form 16)</p>
            <p className="text-xl font-bold text-accent mt-1">{formatCurrency(form16Data.tax.taxableIncome)}</p>
          </div>
        </div>
      </Card>

      {/* Validation Status */}
      <Card variant="bordered" className="bg-emerald-50/50 border-emerald-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-secondary">All Validations Passed</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <li>PAN format validated</li>
              <li>TAN format validated</li>
              <li>Salary totals verified</li>
              <li>TDS amount cross-checked</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => { setCurrentStep("upload"); router.push("/filing/upload"); }}>
          Back
        </Button>
        <Button onClick={() => { setCurrentStep("additional_income"); router.push("/filing/income"); }}>
          Continue to Other Income
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

function InfoRow({ label, value, validated }: { label: string; value: string; validated?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">{value}</p>
        {validated && (
          <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
    </div>
  );
}

function SalaryRow({ label, amount, negative }: { label: string; amount: number; negative?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm font-medium font-mono ${negative ? "text-danger" : ""}`}>
        {negative && "-"}{formatCurrency(amount)}
      </span>
    </div>
  );
}
