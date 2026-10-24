"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFiling } from "@/contexts/FilingContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  "How can I save tax this year?",
  "Which tax regime is better for me?",
  "How much should I invest in ELSS?",
  "What deductions can I claim?",
  "Can I claim HRA exemption?",
  "Should I invest in NPS for extra deduction?",
];

function generateAIResponse(question: string, hasForm16: boolean, taxResult: { totalTaxOld: number; totalTaxNew: number; recommendedRegime: string; savings: number; deductionsOld: number } | null): string {
  const q = question.toLowerCase();

  if (q.includes("save tax") || q.includes("tax saving")) {
    if (hasForm16 && taxResult) {
      return `Based on your tax data, here are the top ways to save tax:\n\n` +
        `1. **Section 80C** — Invest up to Rs. 1,50,000 in ELSS, PPF, or Tax Saver FD. ELSS has the shortest lock-in of 3 years.\n\n` +
        `2. **Section 80CCD(1B)** — Invest Rs. 50,000 in NPS for additional deduction over 80C.\n\n` +
        `3. **Section 80D** — Get health insurance for self (Rs. 25,000) and parents (Rs. 50,000 if senior citizens).\n\n` +
        `4. **HRA Exemption** — If you pay rent, claim HRA exemption under the Old Regime.\n\n` +
        `These can potentially save you up to Rs. 75,000 in taxes under the Old Regime.`;
    }
    return `To save tax, consider these popular options:\n\n` +
      `1. **80C** — PPF, ELSS, LIC, Tax Saver FD (up to Rs. 1.5L)\n` +
      `2. **80CCD(1B)** — NPS (additional Rs. 50K)\n` +
      `3. **80D** — Health Insurance\n` +
      `4. **Section 24** — Home Loan Interest (up to Rs. 2L)\n\n` +
      `Upload your Form 16 for personalized suggestions with exact amounts!`;
  }

  if (q.includes("regime") || q.includes("old") || q.includes("new")) {
    if (taxResult) {
      return `Based on your income data:\n\n` +
        `- **Old Regime Tax**: ${formatCurrency(taxResult.totalTaxOld)}\n` +
        `- **New Regime Tax**: ${formatCurrency(taxResult.totalTaxNew)}\n\n` +
        `**Recommendation: ${taxResult.recommendedRegime === "new" ? "New" : "Old"} Regime** saves you ${formatCurrency(taxResult.savings)}.\n\n` +
        `The ${taxResult.recommendedRegime === "new" ? "New Regime offers lower slabs without needing deductions" : "Old Regime benefits you because your deductions (" + formatCurrency(taxResult.deductionsOld) + ") significantly reduce your taxable income"}.`;
    }
    return `The choice depends on your deductions:\n\n` +
      `- **New Regime** is better if your deductions are < Rs. 3.75L (for income ~Rs. 15L)\n` +
      `- **Old Regime** is better if you have significant deductions (80C, 80D, HRA, Home Loan)\n\n` +
      `Upload your Form 16 and I'll calculate which is better for you!`;
  }

  if (q.includes("elss")) {
    return `**ELSS (Equity Linked Savings Scheme)** is one of the best tax-saving instruments:\n\n` +
      `- **Tax Benefit**: Deduction under Section 80C (up to Rs. 1,50,000)\n` +
      `- **Lock-in**: Only 3 years (shortest among 80C options)\n` +
      `- **Returns**: 12-15% p.a. historically\n` +
      `- **LTCG Tax**: Gains above Rs. 1.25L taxed at 12.5%\n\n` +
      `**Tip**: Start a monthly SIP of Rs. 12,500 to invest Rs. 1.5L over the year. This also averages out market volatility.`;
  }

  if (q.includes("deduction") || q.includes("claim")) {
    return `Here are the key deductions you can claim under the **Old Tax Regime**:\n\n` +
      `| Section | Deduction | Max Limit |\n` +
      `|---------|-----------|----------|\n` +
      `| 80C | PPF, ELSS, LIC, Tuition | Rs. 1,50,000 |\n` +
      `| 80CCD(1B) | NPS | Rs. 50,000 |\n` +
      `| 80D | Health Insurance | Rs. 1,00,000 |\n` +
      `| 80TTA | Savings Interest | Rs. 10,000 |\n` +
      `| 24(b) | Home Loan Interest | Rs. 2,00,000 |\n` +
      `| Standard | Standard Deduction | Rs. 50,000 |\n\n` +
      `Under the **New Regime**, only Standard Deduction of Rs. 75,000 is available.`;
  }

  if (q.includes("hra") || q.includes("house rent")) {
    return `**HRA Exemption** (available only in Old Regime):\n\n` +
      `The exemption is the **minimum** of:\n` +
      `1. Actual HRA received\n` +
      `2. Rent paid - 10% of basic salary\n` +
      `3. 50% of basic (metro) or 40% (non-metro)\n\n` +
      `**Example**: If Basic = Rs. 6L, HRA = Rs. 3L, Rent = Rs. 15,000/month (Rs. 1.8L/year) in Mumbai:\n` +
      `- Min(3L, 1.8L - 60K = 1.2L, 3L) = **Rs. 1,20,000** exempt\n\n` +
      `**Important**: Keep rent receipts and landlord PAN if rent > Rs. 1L/year.`;
  }

  if (q.includes("nps")) {
    return `**NPS (National Pension System)** — Extra Rs. 50,000 deduction!\n\n` +
      `- **Section 80CCD(1B)**: Additional Rs. 50,000 deduction over and above 80C limit\n` +
      `- **Section 80CCD(2)**: Employer's NPS contribution (up to 10% of basic) — tax-free!\n\n` +
      `**At 30% slab**: Rs. 50K investment saves Rs. 15,600 in tax (incl. cess)\n\n` +
      `**Lock-in**: Till age 60 (partial withdrawal allowed after 3 years for specific reasons)\n` +
      `**Returns**: 9-12% p.a. depending on asset allocation\n\n` +
      `**Tip**: Even under New Regime, employer's NPS contribution under 80CCD(2) is deductible!`;
  }

  return `That's a great question! Here's what I can help with:\n\n` +
    `- Tax regime comparison (Old vs New)\n` +
    `- Tax-saving investment suggestions\n` +
    `- Deduction eligibility check\n` +
    `- HRA/80C/80D/NPS guidance\n` +
    `- Refund estimation\n\n` +
    `For personalized advice, make sure you've uploaded your Form 16. Try asking:\n` +
    `- "Which regime is better for me?"\n` +
    `- "How can I save more tax?"`;
}

export default function AdvisorPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { form16Data, taxResult } = useFiling();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I'm your AI Tax Advisor. I can help you with:\n\n` +
        `- Tax-saving strategies\n` +
        `- Regime comparison\n` +
        `- Investment recommendations\n` +
        `- Deduction eligibility\n\n` +
        (form16Data ? "I can see your Form 16 data. Ask me anything about your taxes!" : "Upload your Form 16 first for personalized advice, or ask me a general tax question."),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isReady && !isAuthenticated) router.push("/auth/login");
  }, [isAuthenticated, isReady, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const msgCounter = useRef(0);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userIdx = ++msgCounter.current;
    const userMsg: Message = {
      id: `msg_${userIdx}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));

    const response = generateAIResponse(text, !!form16Data, taxResult);
    const aiIdx = ++msgCounter.current;
    const aiMsg: Message = {
      id: `msg_${aiIdx}`,
      role: "assistant",
      content: response,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setIsTyping(false);
  }, [form16Data, taxResult]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">AI Tax Advisor</h1>
          <p className="text-muted mt-1">Ask anything about your taxes</p>
        </div>
        {form16Data && (
          <span className="text-xs bg-secondary/10 text-secondary px-3 py-1 rounded-full font-medium">
            Form 16 Connected
          </span>
        )}
      </div>

      <Card variant="bordered" className="h-[calc(100vh-20rem)] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-br-md"
                    : "bg-gray-100 text-foreground rounded-bl-md"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                <p className={`text-xs mt-1 ${msg.role === "user" ? "text-blue-200" : "text-muted"}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions */}
        <div className="px-4 py-2 border-t border-border">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="flex-shrink-0 text-xs bg-primary/5 text-primary px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about tax saving, deductions, regime comparison..."
              className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
              disabled={isTyping}
            />
            <Button type="submit" disabled={!input.trim() || isTyping}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
