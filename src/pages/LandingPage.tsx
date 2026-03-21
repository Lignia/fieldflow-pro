import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Users,
  ClipboardCheck,
  FileText,
  CalendarDays,
  ArrowRight,
  CheckCircle2,
  Flame,
} from "lucide-react";
import { useEffect, useRef } from "react";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          el.style.filter = "blur(0)";
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function RevealSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        transform: "translateY(20px)",
        filter: "blur(4px)",
        transition: "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), filter 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {children}
    </div>
  );
}

const features = [
  {
    icon: Users,
    title: "Clients & Projets",
    desc: "Centralisez vos clients, propriétés et projets. Suivez chaque affaire du premier contact à la clôture.",
  },
  {
    icon: ClipboardCheck,
    title: "Relevé technique terrain",
    desc: "Remplissez vos relevés sur chantier, même hors ligne. 55 points de contrôle structurés, zéro papier perdu.",
  },
  {
    icon: FileText,
    title: "Devis & Facturation",
    desc: "Créez vos devis en quelques clics depuis votre catalogue. Facturez, suivez les paiements, relancez automatiquement.",
  },
  {
    icon: CalendarDays,
    title: "Planning & Interventions",
    desc: "Planifiez ramonages, SAV et installations. Vos techniciens voient leur agenda en temps réel.",
  },
];

const steps = [
  "Créez votre compte en 2 minutes",
  "Ajoutez vos premiers clients et projets",
  "Planifiez, chiffrez, facturez",
];

const painPoints = [
  "Devis perdus dans les mails, relances oubliées",
  "Planning techniciens sur carnet, jamais à jour",
  "Facturation en retard, trésorerie sous tension",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground font-bold text-sm">
              L
            </div>
            <span className="text-lg font-bold tracking-tight">LIGNIA</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#how" className="text-muted-foreground hover:text-foreground transition-colors">Comment ça marche</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Connexion</Link>
            </Button>
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
              <Link to="/dashboard">Essai gratuit</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent mb-6">
              <Flame className="h-3.5 w-3.5" />
              Conçu pour les artisans du chauffage bois, HVAC et plomberie
            </div>
            <h1
              className="text-4xl md:text-5xl font-bold tracking-tight text-foreground"
              style={{ lineHeight: "1.08", textWrap: "balance" } as React.CSSProperties}
            >
              Gérez votre activité artisanale. Simplement.
            </h1>
            <p
              className="mt-5 text-lg text-muted-foreground max-w-lg"
              style={{ textWrap: "pretty" } as React.CSSProperties}
            >
              De la demande client à la facturation, LIGNIA structure votre quotidien sans le compliquer.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
                <Link to="/dashboard">
                  Démarrer gratuitement
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg">
                Demander une démo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <RevealSection>
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2
              className="text-2xl font-bold text-center mb-8"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              Vous jonglez entre carnets, tableurs et relances oubliées ?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {painPoints.map((p, i) => (
                <div key={i} className="rounded-lg border bg-card p-5 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3">
                    <span className="text-sm font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm text-foreground font-medium">{p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* Features */}
      <RevealSection>
        <section id="features" className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2
              className="text-2xl md:text-3xl font-bold text-center mb-4"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              Tout ce qu'il faut, rien de superflu
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-md mx-auto">
              Quatre modules pensés pour le terrain, qui s'adaptent à votre rythme.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="group rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent mb-4 transition-colors group-hover:bg-accent/20">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* How it works */}
      <RevealSection>
        <section id="how" className="border-y bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              En route en 3 étapes
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {steps.map((s, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-lg mb-4">
                    {i + 1}
                  </div>
                  <p className="text-sm font-medium">{s}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* Testimonial */}
      <RevealSection>
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <blockquote className="text-lg md:text-xl font-medium italic text-foreground leading-relaxed">
              "Avant LIGNIA, mes devis traînaient une semaine. Maintenant je les envoie le soir même depuis le chantier."
            </blockquote>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                PL
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Patrick Lefèvre</p>
                <p className="text-xs text-muted-foreground">Artisan chauffagiste — Annecy</p>
              </div>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* Final CTA */}
      <RevealSection>
        <section className="border-t bg-primary text-primary-foreground py-16">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Prêt à structurer votre activité ?
            </h2>
            <p className="text-primary-foreground/70 mb-8 max-w-md mx-auto text-sm">
              Essayez LIGNIA gratuitement pendant 14 jours. Aucune carte bancaire requise.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
                <Link to="/dashboard">Essai gratuit 14 jours</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                Demander une démo
              </Button>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-accent text-accent-foreground font-bold text-[10px]">
              L
            </div>
            <span className="font-medium text-foreground">LIGNIA</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground transition-colors">Mentions légales</a>
            <a href="#" className="hover:text-foreground transition-colors">CGU</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p>© 2026 LIGNIA. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
