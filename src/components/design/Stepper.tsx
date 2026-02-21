"use client";

import { cn } from "@/lib/utils";

export interface StepperProps {
  steps: { label: string }[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <nav className="w-full" aria-label="התקדמות">
      <ol className="flex items-center justify-between gap-2">
        {steps.map((step, i) => {
          const isActive = i + 1 === currentStep;
          const isDone = i + 1 < currentStep;
          return (
            <li
              key={i}
              className={cn(
                "flex flex-1 items-center",
                i < steps.length - 1 && "after:mx-2 after:h-0.5 after:flex-1 after:bg-[var(--color-border)]",
                isDone && "after:bg-[var(--color-primary)]"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                  isActive && "bg-[var(--color-primary)] text-white",
                  isDone && "bg-[var(--color-primary)] text-white",
                  !isActive && !isDone && "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]"
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <span
                className={cn(
                  "mr-2 hidden text-sm font-medium sm:inline",
                  isActive ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
