import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Users,
  ClipboardCheck,
  FileText,
  CalendarDays,
  ArrowRight,
  Flame,
  Euro,
  AlertTriangle,
  CheckCircle2,
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

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        transform: "translateY(16px)",
        filter: "blur(3px)",
        transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, filter 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* Mini dashboard mockup built with CSS */
function DashboardMockup() {
  return (
    <div className="relative rounded-xl border bg-card shadow-xl shadow-black/5 overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/40">
        <div className="h-2 w-2 rounded-full bg-destructive/50" />
        <div className="h-2 w-2 rounded-full bg-warning/50" />
        <div className="h-2 w-2 rounded-full bg-accent/50" />
        <span className="ml-2 text-[10px] text-muted-foreground font-medium">LIGNIA — Tableau de bord</span>
      </div>
      <div className="p-4 space-y-3">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "CA mois", val: "12 847 €", color: "text-accent" },
            { label: "Devis", val: "7", color: "text-foreground" },
            { label: "Impayées", val: "3", color: "text-destructive" },
          ].map((k) => (
            <div key={k.label} className="rounded-md border bg-background p-2">
              <p className="text-[9px] text-muted-foreground">{k.label}</p>
              <p className={`text-sm font-bold font-mono ${k.color}`}>{k.val}</p>
            </div>
          ))}
        </div>
        {/* Project rows */}
        <div className="space-y-1.5">
          {[
            { name: "Dupont — Poêle Invicta", badge: "VT planifiée", color: "bg-amber-100 text-amber-700" },
            { name: "Martin — Insert Jøtul", badge: "Devis envoyé", color: "bg-orange-100 text-orange-700" },
            { name: "Garcia — Chaudière bois", badge: "En cours", color: "bg-accent/15 text-accent" },
          ].map((p) => (
            <div key={p.name} className="flex items-center justify-between rounded-md border bg-background px-2.5 py-1.5">
              <span className="text-[10px] font-medium truncate">{p.name}</span>
              <span className={`text-[8px] font-medium rounded-full px-1.5 py-0.5 ${p.color}`}>{p.badge}</span>
            </div>
          ))}
        </div>
        {/* Chart placeholder */}
        <div className="rounded-md border bg-background p-2">
          <div className="flex items-end gap-1 h-10">
            {[40, 55, 35, 65, 50, 75, 60, 80, 70, 90, 65, 85].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-accent/30"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    icon: Users,
    title: "Clients & Projets",
    desc: "Centralisez vos clients, propriétés et projets. Suivez chaque affaire du premier contact à la clôture.",
    highlights: ["Fiche client complète", "Pipeline 17 étapes", "Historique activité"],
  },
  {
    icon: ClipboardCheck,
    title: "Relevé technique terrain",
    desc: "Remplissez vos relevés sur chantier, même hors ligne. 55 points de contrôle structurés, zéro papier perdu.",
    highlights: ["8 sections guidées", "Photos & croquis", "Sauvegarde auto"],
  },
  {
    icon: FileText,
    title: "Devis & Facturation",
    desc: "Créez vos devis en quelques clics depuis votre catalogue. Facturez, suivez les paiements, relancez automatiquement.",
    highlights: ["Catalogue intégré", "Calcul TVA temps réel", "Suivi paiements"],
  },
  {
    icon: CalendarDays,
    title: "Planning & Interventions",
    desc: "Planifiez ramonages, SAV et installations. Vos techniciens voient leur agenda en temps réel.",
    highlights: ["Vue semaine/jour", "Code couleur métier", "Drag & drop"],
  },
];

const steps = [
  { num: "1", text: "Créez votre compte en 2 minutes", sub: "Aucune carte bancaire requise" },
  { num: "2", text: "Ajoutez vos premiers clients et projets", sub: "Import ou saisie progressive" },
  { num: "3", text: "Planifiez, chiffrez, facturez", sub: "Tout au même endroit" },
];

const painPoints = [
  { icon: FileText, text: "Devis perdus dans les mails, relances oubliées" },
  { icon: CalendarDays, text: "Planning techniciens sur carnet, jamais à jour" },
  { icon: Euro, text: "Facturation en retard, trésorerie sous tension" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-card/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground font-bold text-sm">L</div>
            <span className="text-lg font-bold tracking-tight">LIGNIA</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#how" className="text-muted-foreground hover:text-foreground transition-colors">Comment ça marche</a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Connexion</Link>
            </Button>
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
              <Link to="/dashboard">Essai gratuit</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero — 2 columns */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-10 md:pt-20 md:pb-16">
          <div className="grid md:grid-cols-2 gap-10 md:gap-12 items-center">
            {/* Left text */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent mb-5">
                <Flame className="h-3.5 w-3.5" />
                Chauffage bois · HVAC · Plomberie
              </div>
              <h1
                className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight text-foreground"
                style={{ lineHeight: "1.1", textWrap: "balance" } as React.CSSProperties}
              >
                Gérez votre activité artisanale. Simplement.
              </h1>
              <p className="mt-4 text-base text-muted-foreground max-w-md" style={{ textWrap: "pretty" } as React.CSSProperties}>
                De la demande client à la facturation, LIGNIA structure votre quotidien sans le compliquer.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground active:scale-[0.97] transition-transform" asChild>
                  <Link to="/dashboard">
                    Démarrer gratuitement
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="active:scale-[0.97] transition-transform">
                  Demander une démo
                </Button>
              </div>
              <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /> 14 jours gratuits</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /> Sans carte bancaire</span>
              </div>
            </div>

            {/* Right — mock dashboard */}
            <div className="relative">
              <div className="absolute -inset-4 bg-accent/5 rounded-2xl blur-2xl" />
              <div className="relative">
                <DashboardMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <Reveal>
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 md:py-16">
            <h2 className="text-xl md:text-2xl font-bold text-center mb-8" style={{ textWrap: "balance" } as React.CSSProperties}>
              Vous jonglez entre carnets, tableurs et relances oubliées ?
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {painPoints.map((p, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                      <p.icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm text-foreground font-medium leading-snug pt-1">{p.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* Features */}
      <Reveal>
        <section id="features" className="py-14 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-xl md:text-2xl font-bold text-center mb-3" style={{ textWrap: "balance" } as React.CSSProperties}>
              Tout ce qu'il faut, rien de superflu
            </h2>
            <p className="text-center text-sm text-muted-foreground mb-10 max-w-sm mx-auto">
              Quatre modules pensés pour le terrain, qui s'adaptent à votre rythme.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {features.map((f, i) => (
                <Reveal key={i} delay={i * 70}>
                  <div className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-lg transition-[box-shadow] h-full">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent/20">
                        <f.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{f.desc}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {f.highlights.map((h) => (
                            <span key={h} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              <CheckCircle2 className="h-2.5 w-2.5 text-accent" />
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* How it works */}
      <Reveal>
        <section id="how" className="border-y bg-muted/30 py-14 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-xl md:text-2xl font-bold text-center mb-10">
              En route en 3 étapes
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {steps.map((s, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="relative flex flex-col items-center text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-base mb-3 shadow-md shadow-accent/20">
                      {s.num}
                    </div>
                    <p className="text-sm font-semibold mb-1">{s.text}</p>
                    <p className="text-xs text-muted-foreground">{s.sub}</p>
                    {i < steps.length - 1 && (
                      <div className="hidden md:block absolute top-5 left-[calc(50%+28px)] w-[calc(100%-56px)] border-t border-dashed border-border" />
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* Testimonial */}
      <Reveal>
        <section className="py-14 md:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="rounded-xl border bg-card p-8 shadow-sm text-center">
              <div className="flex justify-center mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} className="h-4 w-4 text-warning fill-warning" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ))}
              </div>
              <blockquote className="text-base md:text-lg font-medium italic text-foreground leading-relaxed max-w-xl mx-auto">
                "Avant LIGNIA, mes devis traînaient une semaine. Maintenant je les envoie le soir même depuis le chantier."
              </blockquote>
              <div className="mt-5 flex items-center justify-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  PL
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Patrick Lefèvre</p>
                  <p className="text-xs text-muted-foreground">Artisan chauffagiste — Annecy</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Final CTA */}
      <Reveal>
        <section className="bg-primary text-primary-foreground py-14 md:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
            <h2 className="text-xl md:text-2xl font-bold mb-3">
              Prêt à structurer votre activité ?
            </h2>
            <p className="text-sm text-primary-foreground/70 mb-6 max-w-sm mx-auto">
              Essayez LIGNIA gratuitement pendant 14 jours. Aucune carte bancaire requise.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground active:scale-[0.97] transition-transform" asChild>
                <Link to="/dashboard">Essai gratuit 14 jours</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                Demander une démo
              </Button>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-accent text-accent-foreground font-bold text-[10px]">L</div>
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
