/**
 * Turns the tax computation into everyday language: how much tax the taxpayer's savings and
 * expenses already knocked off, and simple next steps to pay less — no section numbers first.
 */
import { TaxInput, TaxResult, computeTax } from "@/lib/tax-engine";

export interface SavedItem {
  key: string;
  /** e.g. "Sukanya Samriddhi, PPF, LIC, ELSS, school fees" */
  what: string;
  amount: number;
  /** Rough tax this item removed under the old method. */
  taxCut: number;
}

export interface SimpleTip {
  key: string;
  /** "Put ₹50,000 more into PPF / Sukanya / LIC" */
  action: string;
  /** Why it helps, in plain words. */
  why: string;
  /** Room still left under the limit. */
  roomLeft: number;
  /** Approx. tax you would save if you use the full room. */
  saveAbout: number;
  /** Things to know before doing it (money locked, etc.). */
  keepInMind: string;
  /** Concrete everyday options. */
  options: string[];
}

export interface PlainSavings {
  /** Total tax-saving money the user put in / spent this year. */
  totalInvested: number;
  /** Tax the user would have paid (old method) with none of those savings. */
  taxWithoutSavings: number;
  /** Tax the user actually pays under the better method. */
  taxYouPay: number;
  /** taxWithoutSavings - taxYouPay, floored at 0. */
  taxSaved: number;
  items: SavedItem[];
  tips: SimpleTip[];
  /** One friendly headline. */
  headline: string;
  /** Second line with the regime story. */
  explain: string;
  betterMethod: "old" | "new";
  /** Marginal rate (incl. cess) used for "save about" estimates. */
  rate: number;
}

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Old-method marginal rate (incl. 4% cess) at the given taxable income. */
export function marginalRateOld(taxable: number): number {
  const base = taxable > 1000000 ? 0.3 : taxable > 500000 ? 0.2 : taxable > 250000 ? 0.05 : 0;
  return base * 1.04;
}

export function explainSavings(input: TaxInput, result: TaxResult): PlainSavings {
  const d = input.deductions;
  const bare: TaxInput = {
    ...input,
    rentPaid: 0,
    deductions: {
      ...d,
      pfContribution: 0,
      section80C: 0,
      section80CCD1B: 0,
      section80D: 0,
      section80TTA: 0,
      section24: 0,
      hraExemption: 0,
      otherDeductions: 0,
    },
  };
  const bareResult = computeTax(bare);

  const taxWithoutSavings = bareResult.totalTaxOld;
  const taxYouPay = Math.min(result.totalTaxOld, result.totalTaxNew);
  const taxSaved = Math.max(0, taxWithoutSavings - taxYouPay);
  const rate = marginalRateOld(bareResult.taxableIncomeOld);

  const raw: Array<[string, string, number, number]> = [
    ["80c", "Long-term savings: PF, PPF, Sukanya Samriddhi, LIC, ELSS, school fees, home-loan principal", d.section80C + d.pfContribution, 150000],
    ["nps", "Extra pension saving (NPS)", d.section80CCD1B, 50000],
    ["80d", "Health insurance for you and family", d.section80D, 100000],
    ["24", "Home loan interest", d.section24, 200000],
    ["80tta", "Savings account interest (tax-free part)", d.section80TTA, 10000],
    ["other", "Donations and other allowed amounts", d.otherDeductions, Number.POSITIVE_INFINITY],
  ];
  const items: SavedItem[] = raw
    .filter(([, , amt]) => amt > 0)
    .map(([key, what, amt, cap]) => ({ key, what, amount: amt, taxCut: Math.round(Math.min(amt, cap) * rate) }));
  const totalInvested = items.reduce((s, i) => s + i.amount, 0);

  const tips: SimpleTip[] = [];
  const used80C = d.section80C + d.pfContribution;
  if (used80C < 150000) {
    const room = 150000 - used80C;
    tips.push({
      key: "80c",
      action: `Put up to ${fmt(room)} more into safe long-term savings`,
      why: `The government lets you take ₹1.5 lakh a year out of your taxable income for these. You have used ${fmt(used80C)} so far.`,
      roomLeft: room,
      saveAbout: Math.round(room * rate),
      keepInMind: "This money stays locked for a few years (3 years for ELSS, 5 for tax-saver FD, 15 for PPF, till your daughter is 21 for Sukanya). Only do it if you will not need the cash soon.",
      options: ["Sukanya Samriddhi (if you have a daughter under 10)", "PPF at any bank or post office", "LIC / life insurance premium", "Tax-saver FD at your bank", "ELSS mutual fund (some ups and downs)", "Children's school tuition fee", "Home-loan principal you already repay"],
    });
  }
  if (d.section80CCD1B < 50000) {
    const room = 50000 - d.section80CCD1B;
    tips.push({
      key: "nps",
      action: `Save up to ${fmt(room)} more in NPS for your retirement`,
      why: "NPS gets an extra ₹50,000 allowance on top of the ₹1.5 lakh above.",
      roomLeft: room,
      saveAbout: Math.round(room * rate),
      keepInMind: "You get most of this money only after age 60. Good for retirement, not for short-term needs.",
      options: ["Open an NPS Tier-1 account at your bank or on the eNPS website"],
    });
  }
  if (d.section80D < 25000) {
    const room = 25000 - d.section80D;
    tips.push({
      key: "80d",
      action: `Buy or top-up health insurance (up to ${fmt(room)} more counts)`,
      why: "Health cover for you, spouse and children reduces your taxable income up to ₹25,000 a year — and ₹50,000 more if you pay for parents above 60.",
      roomLeft: room,
      saveAbout: Math.round(room * rate),
      keepInMind: "It protects your family from hospital bills anyway — the tax saving is a bonus.",
      options: ["Family floater health policy", "Separate policy for parents", "Health check-up bills up to ₹5,000"],
    });
  }
  if ((input.additionalIncome.savingsInterest || 0) > 0 && d.section80TTA < Math.min(10000, input.additionalIncome.savingsInterest)) {
    const room = Math.min(10000, input.additionalIncome.savingsInterest) - d.section80TTA;
    tips.push({
      key: "80tta",
      action: `Claim ${fmt(room)} of your savings-account interest as tax-free`,
      why: "Up to ₹10,000 of interest from savings accounts is not taxed. Nothing to invest — just claim it.",
      roomLeft: room,
      saveAbout: Math.round(room * rate),
      keepInMind: "Only savings-account interest counts, not FD interest.",
      options: ["We can fill this from your bank statement"],
    });
  }
  if (input.salary.hra > 0 && input.rentPaid === 0) {
    tips.push({
      key: "hra",
      action: "Tell us the rent you pay",
      why: "Your salary includes house-rent allowance. If you live on rent, part of your salary becomes tax-free.",
      roomLeft: 0,
      saveAbout: 0,
      keepInMind: "Keep rent receipts; landlord PAN is needed if rent is over ₹1 lakh a year.",
      options: ["Enter yearly rent on the income page"],
    });
  }

  const better = result.recommendedRegime;
  let headline: string;
  let explain: string;
  if (taxYouPay === 0 && totalInvested > 0) {
    headline = `Good news — you pay ₹0 tax this year.`;
    explain = better === "new"
      ? `Even without counting your savings, the new method brings your tax to zero. Your ${fmt(totalInvested)} of savings is still great for your future.`
      : `Your ${fmt(totalInvested)} of savings brought your tax down from ${fmt(taxWithoutSavings)} to nothing.`;
  } else if (taxYouPay === 0) {
    headline = "Good news — you pay ₹0 tax this year.";
    explain = "Your income is within the tax-free zone. Nothing more to do here.";
  } else if (better === "old") {
    headline = `Your savings cut your tax by ${fmt(taxSaved)}.`;
    explain = `Without them you would pay ${fmt(taxWithoutSavings)}; with them you pay ${fmt(taxYouPay)}. The old method (which counts your savings) works best for you.`;
  } else if (taxSaved > 0) {
    headline = `You pay ${fmt(taxSaved)} less than you would have without any savings.`;
    explain = `The new method (which does not count savings) still gives you the lowest tax: ${fmt(taxYouPay)} instead of ${fmt(taxWithoutSavings)}. Your savings help your future; the low tax comes from the new method's lower rates.`;
  } else {
    headline = `Your tax this year is ${fmt(taxYouPay)}.`;
    explain = totalInvested > 0
      ? `The new method (lower rates, no savings counted) beats the old one even with your ${fmt(totalInvested)} of savings. Adding more savings will not lower tax under the new method.`
      : `You have no tax-saving investments yet. Under the old method each ₹1 you save takes about ${Math.round(rate * 100)} paise off your tax — see the tips below and check which method wins after.`;
  }

  return { totalInvested, taxWithoutSavings, taxYouPay, taxSaved, items, tips, headline, explain, betterMethod: better, rate };
}
