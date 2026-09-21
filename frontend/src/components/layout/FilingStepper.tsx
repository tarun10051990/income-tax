"use client";

import { cn } from "@/lib/utils";
import { FilingStep } from "@/lib/types";
import { usePortalText } from "@/components/filing/GuidedField";

const STEPS: { key: FilingStep; icon: string }[] = [
  { key: "upload", icon: "1" },
  { key: "review", icon: "2" },
  { key: "additional_income", icon: "3" },
  { key: "deductions", icon: "4" },
  { key: "compute", icon: "5" },
  { key: "suggestions", icon: "6" },
  { key: "generate", icon: "7" },
  { key: "summary", icon: "8" },
];

interface FileStepperProps {
  currentStep: FilingStep;
  onStepClick?: (step: FilingStep) => void;
}

export default function FilingStepper({ currentStep, onStepClick }: FileStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  const t = usePortalText();

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
              <span className="text-sm font-medium">{t(`itr.steps.${step.key}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
