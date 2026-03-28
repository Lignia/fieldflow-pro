import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingLayoutProps {
  currentStep: 1 | 2;
  children: React.ReactNode;
}

const STEPS = [
  { num: 1, label: "Votre entreprise" },
  { num: 2, label: "Votre profil" },
] as const;

export function OnboardingLayout({ currentStep, children }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center bg-background px-4 py-8 sm:py-12">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg leading-none">L</span>
        </div>
        <span className="text-2xl font-bold tracking-tight text-foreground">LIGNIA</span>
      </Link>

      {/* Stepper */}
      <div className="flex items-center gap-3 mb-8">
        {STEPS.map((s, i) => {
          const done = s.num < currentStep;
          const active = s.num === currentStep;
          return (
            <div key={s.num} className="flex items-center gap-3">
              {i > 0 && (
                <div className={cn("w-8 h-px", done ? "bg-accent" : "bg-border")} />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                    done
                      ? "bg-accent text-accent-foreground"
                      : active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : s.num}
                </div>
                <span
                  className={cn(
                    "text-sm hidden sm:inline",
                    active ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="w-full max-w-[680px]">{children}</div>
    </div>
  );
}
