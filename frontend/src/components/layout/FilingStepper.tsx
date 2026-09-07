"use client";

import { cn } from "@/lib/utils";
import { FilingStep } from "@/lib/types";

const STEPS: { key: FilingStep; label: string; icon: string }[] = [
  { key: "upload", label: "Upload Form 16", icon: "1" },
  { key: "review", label: "Review Data", icon: "2" },
  { key: "additional_income", label: "Other Income", icon: "3" },
  { key: "deductions", label: "Deductions", icon: "4" },
  { key: "compute", label: "Tax Computation", icon: "5" },
  { key: "suggestions", label: "Tax Saving Tips", icon: "6" },
  { key: "generate", label: "Generate ITR", icon: "7" },
  { key: "summary", label: "Summary", icon: "8" },
];

interface FileStepperProps {
  currentStep: FilingStep;
  onStepClick?: (step: FilingStep) => void;
}

export default function FilingStepper({ currentStep, onStepClick }: FileStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="bg-surface rounded-xl p-4 border border-border">
      <h3 className="text-sm font-semibold text-muted mb-4 uppercase tracking-wider">Filing Progress</h3>
      <div className="space-y-1">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = step.key === currentStep;
          const isClickable = index <= currentIndex && onStepClick;

          return (
            <button
              key={step.key}
              onClick={() => isClickable && onStepClick(step.key)}
              disabled={!isClickable}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
                isCurrent && "bg-primary/10 text-primary",
                isCompleted && "text-secondary hover:bg-gray-50",
                !isCurrent && !isCompleted && "text-muted/50",
                isClickable && "cursor-pointer hover:bg-gray-50"
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                  isCurrent && "bg-primary text-white",
                  isCompleted && "bg-secondary text-white",
                  !isCurrent && !isCompleted && "bg-gray-200 text-gray-400"
                )}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.icon
                )}
              </div>
              <span className="text-sm font-medium">{step.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
