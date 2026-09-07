"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { computeTax } from "@/lib/tax-engine";
import type { TaxInput, TaxResult } from "@/lib/tax-engine";

export default function TaxCalculatorPage() {
  /* This is a public page - no auth required */
  const [grossSalary, setGrossSalary] = useState("");
  const [hra, setHra] = useState("");
  const [specialAllowance, setSpecialAllowance] = useState("");
  const [section80C, setSection80C] = useState("");
  const [section80D, setSection80D] = useState("");
  const [nps, setNps] = useState("");
  const [homeLoan, setHomeLoan] = useState("");
  const [rentPaid, setRentPaid] = useState("");
  const [isMetro, setIsMetro] = useState(true);
  const [result, setResult] = useState<TaxResult | null>(null);

  const handleCalculate = () => {
    const basic = Math.round(Number(grossSalary) * 0.5) || 0;
    const hraVal = Number(hra) || Math.round(basic * 0.4);
    const specialVal = Number(specialAllowance) || (Number(grossSalary) - basic - hraVal);

    const input: TaxInput = {
      financialYear: "2024-25",
      salary: {
        basicSalary: basic,
        hra: hraVal,
        specialAllowance: specialVal > 0 ? specialVal : 0,
        bonus: 0,
        leaveEncashment: 0,
        otherAllowances: 0,
      },
      deductions: {
        pfContribution: Math.round(basic * 0.12),
        professionalTax: 2400,
        standardDeduction: 75000,
        section80C: Number(section80C) || 0,
        section80CCD1B: Number(nps) || 0,
        section80D: Number(section80D) || 0,
        section80TTA: 0,
        section24: Number(homeLoan) || 0,
        hraExemption: 0,
        otherDeductions: 0,
      },
      additionalIncome: {
        savingsInterest: 0,
        fdInterest: 0,
        rdInterest: 0,
        capitalGainsSTCG: 0,
        capitalGainsLTCG: 0,
        rentalIncome: 0,
        otherIncome: 0,
      },
      tdsDeducted: 0,
      metroCity: isMetro,
      rentPaid: Number(rentPaid) || 0,
    };

    const taxResult = computeTax(input);
    setResult(taxResult);
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Income Tax Calculator</h1>
          <p className="text-muted mt-2">FY 2024-25 (AY 2025-26) — Compare Old vs New Tax Regime</p>
        </div>

        <Card variant="bordered">
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold">Income Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Annual Gross Salary (CTC)</label>
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <span className="px-3 py-2 bg-gray-50 border-r border-border text-sm text-muted">Rs.</span>
                  <input
                    type="number"
                    placeholder="e.g. 1500000"
                    value={grossSalary}
                    onChange={(e) => setGrossSalary(e.target.value)}
                    className="flex-1 px-3 py-2 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">HRA Received (Annual)</label>
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <span className="px-3 py-2 bg-gray-50 border-r border-border text-sm text-muted">Rs.</span>
                  <input
                    type="number"
                    placeholder="Auto-calculated if blank"
                    value={hra}
                    onChange={(e) => setHra(e.target.value)}
                    className="flex-1 px-3 py-2 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Special Allowance</label>
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <span className="px-3 py-2 bg-gray-50 border-r border-border text-sm text-muted">Rs.</span>
                  <input
                    type="number"
                    placeholder="Auto-calculated if blank"
                    value={specialAllowance}
                    onChange={(e) => setSpecialAllowance(e.target.value)}
                    className="flex-1 px-3 py-2 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Annual Rent Paid</label>
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <span className="px-3 py-2 bg-gray-50 border-r border-border text-sm text-muted">Rs.</span>
                  <input
                    type="number"
                    placeholder="For HRA exemption"
                    value={rentPaid}
                    onChange={(e) => setRentPaid(e.target.value)}
                    className="flex-1 px-3 py-2 outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">City Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={isMetro} onChange={() => setIsMetro(true)} />
                  Metro (Delhi, Mumbai, Chennai, Kolkata)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={!isMetro} onChange={() => setIsMetro(false)} />
                  Non-Metro
                </label>
              </div>
            </div>

            <h2 className="text-lg font-semibold pt-4">Deductions (Old Regime)</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Section 80C (ELSS, PPF, LIC, etc.)</label>
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <span className="px-3 py-2 bg-gray-50 border-r border-border text-sm text-muted">Rs.</span>
                  <input
                    type="number"
                    placeholder="Max 1,50,000"
                    value={section80C}
                    onChange={(e) => setSection80C(e.target.value)}
                    className="flex-1 px-3 py-2 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Section 80D (Health Insurance)</label>
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <span className="px-3 py-2 bg-gray-50 border-r border-border text-sm text-muted">Rs.</span>
                  <input
                    type="number"
                    placeholder="Max 25,000/50,000"
                    value={section80D}
                    onChange={(e) => setSection80D(e.target.value)}
                    className="flex-1 px-3 py-2 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Section 80CCD(1B) — NPS</label>
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <span className="px-3 py-2 bg-gray-50 border-r border-border text-sm text-muted">Rs.</span>
                  <input
                    type="number"
                    placeholder="Max 50,000"
                    value={nps}
                    onChange={(e) => setNps(e.target.value)}
                    className="flex-1 px-3 py-2 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Section 24 — Home Loan Interest</label>
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <span className="px-3 py-2 bg-gray-50 border-r border-border text-sm text-muted">Rs.</span>
                  <input
                    type="number"
                    placeholder="Max 2,00,000"
                    value={homeLoan}
                    onChange={(e) => setHomeLoan(e.target.value)}
                    className="flex-1 px-3 py-2 outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleCalculate} className="w-full sm:w-auto">
                Calculate Tax
              </Button>
            </div>
          </div>
        </Card>

        {result && (
          <Card variant="bordered">
            <div className="p-6 space-y-6">
              {result.recommendedRegime === "new" ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-green-800">New Tax Regime is Better for You</h3>
                    <p className="text-sm text-green-700">
                      You save Rs. {formatCurrency(result.totalTaxOld - result.totalTaxNew)} by choosing the new regime
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                  <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-blue-800">Old Tax Regime is Better for You</h3>
                    <p className="text-sm text-blue-700">
                      You save Rs. {formatCurrency(result.totalTaxNew - result.totalTaxOld)} by choosing the old regime
                    </p>
                  </div>
                </div>
              )}

              <h3 className="text-lg font-semibold">Detailed Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2">Particulars</th>
                      <th className="text-right py-3 px-2">Old Regime</th>
                      <th className="text-right py-3 px-2">
                        New Regime
                        {result.recommendedRegime === "new" && (
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Recommended</span>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-3 px-2">Gross Salary</td>
                      <td className="text-right py-3 px-2">Rs. {formatCurrency(result.grossSalary)}</td>
                      <td className="text-right py-3 px-2">Rs. {formatCurrency(result.grossSalary)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2">Total Deductions</td>
                      <td className="text-right py-3 px-2 text-red-600">-Rs. {formatCurrency(result.grossSalary - result.taxableIncomeOld)}</td>
                      <td className="text-right py-3 px-2 text-red-600">-Rs. {formatCurrency(result.grossSalary - result.taxableIncomeNew)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2">Taxable Income</td>
                      <td className="text-right py-3 px-2">Rs. {formatCurrency(result.taxableIncomeOld)}</td>
                      <td className="text-right py-3 px-2">Rs. {formatCurrency(result.taxableIncomeNew)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2">Income Tax</td>
                      <td className="text-right py-3 px-2">Rs. {formatCurrency(result.taxOldRegime)}</td>
                      <td className="text-right py-3 px-2">Rs. {formatCurrency(result.taxNewRegime)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2">Health &amp; Education Cess (4%)</td>
                      <td className="text-right py-3 px-2">Rs. {formatCurrency(result.cessOld)}</td>
                      <td className="text-right py-3 px-2">Rs. {formatCurrency(result.cessNew)}</td>
                    </tr>
                    <tr className="font-semibold">
                      <td className="py-3 px-2">Total Tax Payable</td>
                      <td className="text-right py-3 px-2">Rs. {formatCurrency(result.totalTaxOld)}</td>
                      <td className="text-right py-3 px-2">Rs. {formatCurrency(result.totalTaxNew)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-2">Old Regime Tax Slabs</h4>
                  <ul className="text-xs text-muted space-y-1">
                    <li className="flex justify-between"><span>Up to Rs. 2,50,000</span><span>Nil</span></li>
                    <li className="flex justify-between"><span>Rs. 2,50,001 - 5,00,000</span><span>5%</span></li>
                    <li className="flex justify-between"><span>Rs. 5,00,001 - 10,00,000</span><span>20%</span></li>
                    <li className="flex justify-between"><span>Above Rs. 10,00,000</span><span>30%</span></li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-2">New Regime Tax Slabs (FY 2024-25)</h4>
                  <ul className="text-xs text-muted space-y-1">
                    <li className="flex justify-between"><span>Up to Rs. 3,00,000</span><span>Nil</span></li>
                    <li className="flex justify-between"><span>Rs. 3,00,001 - 7,00,000</span><span>5%</span></li>
                    <li className="flex justify-between"><span>Rs. 7,00,001 - 10,00,000</span><span>10%</span></li>
                    <li className="flex justify-between"><span>Rs. 10,00,001 - 12,00,000</span><span>15%</span></li>
                    <li className="flex justify-between"><span>Rs. 12,00,001 - 15,00,000</span><span>20%</span></li>
                    <li className="flex justify-between"><span>Above Rs. 15,00,000</span><span>30%</span></li>
                  </ul>
                </div>
              </div>

              <div className="text-center pt-4">
                <Link href="/filing/upload">
                  <Button>File Your ITR Now</Button>
                </Link>
              </div>
            </div>
          </Card>
        )}
    </div>
  );
}
