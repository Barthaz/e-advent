import type { ReactNode } from 'react';

interface WizardShellProps {
  title: string;
  steps: string[];
  stepLabels: string[];
  currentStep: number;
  children: ReactNode;
}

export default function WizardShell({ title, steps, stepLabels, currentStep, children }: WizardShellProps) {
  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl md:text-3xl font-semibold text-parchment-text mb-2 leading-tight">
        {title}
      </h1>

      <div className="wizard-steps mb-6">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`wizard-step ${
              index === currentStep
                ? 'wizard-step--active'
                : index < currentStep
                  ? 'wizard-step--done'
                  : ''
            }`}
          >
            <span className="wizard-step-badge">{index + 1}</span>
            <span className="wizard-step-label">{stepLabels[index]}</span>
          </div>
        ))}
      </div>

      {children}
    </div>
  );
}
