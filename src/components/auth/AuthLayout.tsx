import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

const PITCH_POINTS = [
  "Devis professionnels en 2 minutes",
  "Factures conformes Factur-X",
  "Suivi de chantier simplifié",
];

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left pitch panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[40%] bg-primary text-primary-foreground flex-col justify-center px-12 xl:px-16">
        <Link to="/" className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-accent-foreground font-bold text-lg leading-none">L</span>
          </div>
          <span className="text-2xl font-bold tracking-tight">LIGNIA</span>
        </Link>

        <h1 className="text-3xl xl:text-4xl font-bold leading-tight mb-8">
          Gérez vos devis et factures en quelques clics
        </h1>

        <ul className="space-y-4">
          {PITCH_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
              <span className="text-lg opacity-90">{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg leading-none">L</span>
              </div>
              <span className="text-2xl font-bold tracking-tight text-foreground">LIGNIA</span>
            </Link>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Devis et factures pour artisans du bâtiment
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
