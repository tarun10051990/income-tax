"use client";

import FilingStepper from "@/components/layout/FilingStepper";
import { useFiling } from "@/contexts/FilingContext";

export default function FilingLayout({ children }: { children: React.ReactNode }) {
  const { currentStep, setCurrentStep } = useFiling();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-64 flex-shrink-0">
          <div className="lg:sticky lg:top-24">
            <FilingStepper currentStep={currentStep} onStepClick={setCurrentStep} />
          </div>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
