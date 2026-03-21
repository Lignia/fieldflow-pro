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
  CheckCircle2,
  BarChart3,
  Clock,
  Zap,
  Shield,
  Smartphone,
} from "lucide-react";
import { useEffect, useRef } from "react";

/* ═══ Scroll reveal ═══ */
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
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section";
}) {
  const ref = useScrollReveal();
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        transform: "translateY(20px)",
        filter: "blur(4px)",
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, filter 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}

/* ═══ Large hero mockup ═══ */
function HeroMockup() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-[0_24px_80px_-12px_rgba(0,0,0,0.12)] overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b bg-muted/40">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-destructive/30" />
          <div className="h-3 w-3 rounded-full bg-warning/30" />
          <div className="h-3 w-3 rounded-full bg-accent/30" />
        </div>
        <span className="ml-3 text-[11px] text-muted-foreground font-medium tracking-wide">
          LIGNIA — Tableau de bord
        </span>
      </div>
      <div className="p-6 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "CA mois", val: "12 847 €", color: "text-accent", trend: "+12%" },
            { label: "Devis en cours", val: "7", color: "text-foreground", trend: null },
            { label: "Interventions", val: "14", color: "text-foreground", trend: null },
            { label: "Impayées", val: "3", color: "text-destructive", trend: null },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border bg-background p-3.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                {k.label}
              </p>
              <div className="flex items-end gap-2">
                <p className={`text-lg font-bold font-mono leading-none ${k.color}`}>{k.val}</p>
                {k.trend && (
                  <span className="text-[10px] font-semibold text-accent leading-none mb-0.5">{k.trend}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Project list */}
          <div className="col-span-2 rounded-xl border bg-background p-4">
            <p className="text-[11px] font-semibold mb-3">Projets en cours</p>
            <div className="space-y-2">
              {[
                { name: "Dupont — Poêle Invicta", badge: "VT planifiée", color: "bg-amber-100 text-amber-800" },
                { name: "Martin — Insert Jøtul", badge: "Devis envoyé", color: "bg-orange-100 text-orange-800" },
                { name: "Garcia — Chaudière bois", badge: "Installation", color: "bg-accent/15 text-accent" },
                { name: "Bernard — Tubage inox", badge: "Facturation", color: "bg-primary/10 text-primary" },
              ].map((p) => (
                <div key={p.name} className="flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors">
                  <span className="text-[11px] font-medium truncate">{p.name}</span>
                  <span className={`text-[9px] font-semibold rounded-full px-2.5 py-1 whitespace-nowrap ${p.color}`}>
                    {p.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-xl border bg-background p-4">
            <p className="text-[11px] font-semibold mb-3">CA 12 mois</p>
            <div className="flex items-end gap-1 h-28">
              {[40, 55, 35, 65, 50, 75, 60, 80, 70, 90, 65, 85].map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-sm transition-colors ${i === 11 ? "bg-accent" : "bg-accent/20"}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[8px] text-muted-foreground">
              <span>Mar</span>
              <span>Sep</span>
              <span>Fév</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Planning mockup — larger ═══ */
function PlanningMockup() {
  const days = ["Lun 17", "Mar 18", "Mer 19"];
  const slots = [
    [
      { time: "08:00", label: "Dupont — Ramonage", type: "sav", dur: 2 },
      { time: "14:00", label: "Garcia — Diagnostic", type: "sav", dur: 1.5 },
    ],
    [
      { time: "09:00", label: "Martin — Pose insert", type: "install", dur: 4 },
      { time: "15:30", label: "Moreau — SAV chaudière", type: "sav", dur: 1 },
    ],
    [
      { time: "08:30", label: "Lefèvre — VT chaudière", type: "install", dur: 2 },
    ],
  ];

  return (
    <div className="rounded-2xl border bg-card shadow-[0_20px_60px_-12px_rgba(0,0,0,0.10)] overflow-hidden">
      <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
        <span className="text-[12px] font-semibold">Planning — Semaine 12</span>
        <div className="flex gap-2">
          <span className="text-[9px] rounded-full px-2.5 py-1 bg-primary/10 text-primary font-semibold">Installation</span>
          <span className="text-[9px] rounded-full px-2.5 py-1 bg-warning/15 text-warning font-semibold">SAV</span>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x">
        {days.map((day, di) => (
          <div key={day} className="p-3">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2.5 text-center">{day}</p>
            <div className="space-y-2">
              {slots[di].map((s) => (
                <div
                  key={s.time + s.label}
                  className={`rounded-lg px-2.5 py-2 border-l-[3px] ${
                    s.type === "install"
                      ? "border-l-primary bg-primary/[0.04]"
                      : "border-l-warning bg-warning/[0.04]"
                  }`}
                >
                  <p className="text-[9px] font-mono text-muted-foreground">{s.time}</p>
                  <p className="text-[10px] font-medium mt-0.5 leading-snug">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ Quote mockup — larger ═══ */
function QuoteMockup() {
  return (
    <div className="rounded-2xl border bg-card shadow-[0_20px_60px_-12px_rgba(0,0,0,0.10)] overflow-hidden">
      <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
        <div>
          <span className="text-[12px] font-semibold">Devis DEV-2026-0042</span>
          <span className="text-[10px] text-muted-foreground ml-2">v2</span>
        </div>
        <span className="text-[9px] rounded-full px-2.5 py-1 bg-accent/15 text-accent font-semibold">
          Signé ✓
        </span>
      </div>
      <div className="p-5">
        {/* Client info */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed">
          <div>
            <p className="text-[10px] text-muted-foreground">Client</p>
            <p className="text-[12px] font-semibold">M. & Mme Dupont</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Date</p>
            <p className="text-[12px] font-medium">15/03/2026</p>
          </div>
        </div>

        {/* Lines */}
        <table className="w-full text-[10px] mb-4">
          <thead>
            <tr className="text-muted-foreground text-left border-b">
              <th className="pb-2 font-medium">Désignation</th>
              <th className="pb-2 font-medium text-center w-12">Qté</th>
              <th className="pb-2 font-medium text-right w-20">P.U. HT</th>
              <th className="pb-2 font-medium text-right w-20">Total</th>
            </tr>
          </thead>
          <tbody>
            {[
              { desc: "Poêle à bois Invicta Onsen", qty: "1", pu: "2 890 €", total: "2 890 €" },
              { desc: "Kit raccordement inox Ø150", qty: "1", pu: "485 €", total: "485 €" },
              { desc: "Plaque de sol verre trempé", qty: "1", pu: "189 €", total: "189 €" },
              { desc: "Main d'œuvre installation", qty: "8h", pu: "80 €/h", total: "640 €" },
              { desc: "Déplacement", qty: "1", pu: "45 €", total: "45 €" },
            ].map((l) => (
              <tr key={l.desc} className="border-b border-dashed">
                <td className="py-2.5 font-medium">{l.desc}</td>
                <td className="py-2.5 text-center text-muted-foreground">{l.qty}</td>
                <td className="py-2.5 text-right font-mono text-muted-foreground">{l.pu}</td>
                <td className="py-2.5 text-right font-mono font-semibold">{l.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-48 space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">Total HT</span>
              <span className="font-mono font-medium">4 249 €</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">TVA 10%</span>
              <span className="font-mono font-medium">424,90 €</span>
            </div>
            <div className="flex justify-between text-[12px] font-bold pt-1.5 border-t">
              <span>Total TTC</span>
              <span className="font-mono text-accent">4 673,90 €</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Survey mockup ═══ */
function SurveyMockup() {
  return (
    <div className="rounded-2xl border bg-card shadow-[0_20px_60px_-12px_rgba(0,0,0,0.10)] overflow-hidden">
      <div className="px-5 py-3.5 border-b bg-muted/30">
        <span className="text-[12px] font-semibold">Relevé technique — Dupont</span>
      </div>
      <div className="p-5 space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-colors ${s <= 5 ? "bg-accent" : "bg-border"}`}
              />
            ))}
          </div>
          <div className="flex justify-between">
            <p className="text-[10px] text-muted-foreground font-medium">Section 5/8 — Pièce d'installation</p>
            <p className="text-[10px] text-accent font-semibold">62%</p>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-2.5">
          {[
            { label: "Surface pièce", value: "42 m²", filled: true },
            { label: "Hauteur sous plafond", value: "2.50 m", filled: true },
            { label: "Type de sol", value: "Carrelage", filled: true },
            { label: "Ventilation existante", value: "VMC simple flux", filled: true },
            { label: "Arrivée d'air", value: "", filled: false },
          ].map((f) => (
            <div key={f.label} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${f.filled ? "bg-background" : "bg-muted/30 border-dashed"}`}>
              <span className="text-[11px] text-muted-foreground">{f.label}</span>
              {f.filled ? (
                <span className="text-[11px] font-semibold flex items-center gap-1.5">
                  {f.value}
                  <CheckCircle2 className="h-3 w-3 text-accent" />
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground/50 italic">À remplir</span>
              )}
            </div>
          ))}
        </div>

        {/* Action */}
        <div className="flex gap-2 pt-1">
          <div className="flex-1 h-9 rounded-lg bg-muted/50 border border-dashed flex items-center justify-center text-[10px] text-muted-foreground">
            + Ajouter photo
          </div>
          <div className="h-9 rounded-lg bg-accent text-accent-foreground px-4 flex items-center text-[10px] font-semibold">
            Section suivante →
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Page ═══ */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 sm:px-10 h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground font-bold text-sm">
              L
            </div>
            <span className="text-lg font-bold tracking-tight">LIGNIA</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">
              Fonctionnalités
            </a>
            <a href="#how" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">
              Comment ça marche
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/dashboard">Connexion</Link>
            </Button>
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
              <Link to="/dashboard">Essai gratuit</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO — dark bg continuous with nav ═══ */}
      <section className="relative bg-primary text-primary-foreground pt-16 pb-8 md:pt-24 md:pb-12 overflow-hidden">
        {/* Decorative accent arc */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] pointer-events-none">
          <div className="absolute top-[-100px] right-[-150px] w-[500px] h-[500px] rounded-full border-[40px] border-accent/15" />
          <div className="absolute top-[-40px] right-[-80px] w-[300px] h-[300px] rounded-full border-[24px] border-accent/10" />
        </div>

        <div className="mx-auto max-w-7xl px-6 sm:px-10 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent mb-8">
                <Flame className="h-3.5 w-3.5" />
                Chauffage bois · HVAC · Plomberie
              </div>
            </Reveal>
            <Reveal delay={80}>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight"
                style={{ lineHeight: "1.06" } as React.CSSProperties}
              >
                Gérez votre activité artisanale.{" "}
                <span className="text-accent">Simplement.</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 text-lg md:text-xl text-primary-foreground/60 max-w-xl mx-auto leading-relaxed">
                De la demande client à la facturation, LIGNIA structure votre quotidien sans le compliquer.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground active:scale-[0.97] transition-transform text-base px-8 h-13 rounded-xl"
                  asChild
                >
                  <Link to="/dashboard">
                    Démarrer gratuitement
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground active:scale-[0.97] transition-transform text-base h-13 rounded-xl"
                >
                  Demander une démo
                </Button>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-primary-foreground/50">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-accent" /> 14 jours gratuits
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-accent" /> Sans carte bancaire
                </span>
              </div>
            </Reveal>
          </div>

          {/* BIG hero mockup — overlaps into next section */}
          <Reveal delay={300}>
            <div className="relative max-w-5xl mx-auto mb-[-80px] md:mb-[-120px]">
              <div className="relative">
                <HeroMockup />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF strip ═══ */}
      <Reveal>
        <section className="pt-28 md:pt-40 pb-12 md:pb-16 border-b">
          <div className="mx-auto max-w-4xl px-6 sm:px-10">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-muted-foreground">
              {[
                { icon: Shield, text: "Données hébergées en France" },
                { icon: Smartphone, text: "Optimisé terrain & mobile" },
                { icon: Users, text: "Conçu pour les PME artisans" },
                { icon: Zap, text: "Prise en main en 10 minutes" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-accent" />
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ═══ PROBLEM — dark band ═══ */}
      <Reveal>
        <section className="bg-primary text-primary-foreground py-24 md:py-32">
          <div className="mx-auto max-w-5xl px-6 sm:px-10 text-center">
            <h2
              className="text-3xl md:text-4xl font-bold mb-5"
              style={{ lineHeight: "1.1" } as React.CSSProperties}
            >
              Vous jonglez entre carnets, tableurs<br className="hidden md:block" /> et relances oubliées ?
            </h2>
            <p className="text-primary-foreground/50 text-base mb-16 max-w-lg mx-auto leading-relaxed">
              Chaque jour, des artisans perdent du temps et de l'argent à cause d'outils inadaptés.
            </p>
            <div className="grid md:grid-cols-3 gap-6 md:gap-10">
              {[
                {
                  icon: FileText,
                  text: "Devis perdus dans les mails, relances oubliées",
                  stat: "2h/jour",
                  statLabel: "perdues en administratif",
                },
                {
                  icon: CalendarDays,
                  text: "Planning techniciens sur carnet, jamais à jour",
                  stat: "30%",
                  statLabel: "de trajets évitables",
                },
                {
                  icon: Euro,
                  text: "Facturation en retard, trésorerie sous tension",
                  stat: "45j",
                  statLabel: "délai moyen de paiement",
                },
              ].map((p, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/[0.07] mb-5">
                      <p.icon className="h-6 w-6 text-primary-foreground/70" />
                    </div>
                    <p className="text-sm font-medium leading-snug text-primary-foreground/80 mb-6 max-w-[220px]">
                      {p.text}
                    </p>
                    <div className="pt-4 border-t border-primary-foreground/10 w-full">
                      <p className="text-3xl md:text-4xl font-bold font-mono text-warning">{p.stat}</p>
                      <p className="text-[11px] text-primary-foreground/40 mt-1">{p.statLabel}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ═══ FEATURE 1 — Clients & Projets (centered title, then big visual) ═══ */}
      <Reveal>
        <section id="features" className="py-28 md:py-36">
          <div className="mx-auto max-w-7xl px-6 sm:px-10">
            <div className="text-center mb-20">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-4">
                Fonctionnalités
              </p>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ lineHeight: "1.1" } as React.CSSProperties}>
                Tout ce qu'il faut, rien de superflu
              </h2>
            </div>

            {/* Feature 1 — text left narrow, mockup right wide */}
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center mb-32">
              <div className="lg:col-span-4">
                <Reveal>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent mb-6">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 leading-tight">Clients & Projets</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Centralisez vos clients, propriétés et projets. Suivez chaque affaire du premier contact à la clôture avec un pipeline en 17 étapes.
                  </p>
                  <div className="space-y-3">
                    {["Fiche client complète", "Pipeline visuel 17 étapes", "Historique d'activité"].map((h) => (
                      <div key={h} className="flex items-center gap-3 text-sm">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10">
                          <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                        </div>
                        <span className="font-medium">{h}</span>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
              <div className="lg:col-span-8">
                <Reveal delay={150}>
                  <HeroMockup />
                </Reveal>
              </div>
            </div>

            {/* Feature 2 — REVERSE: mockup left wide, text right narrow */}
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center mb-32">
              <div className="lg:col-span-8 lg:order-1">
                <Reveal>
                  <PlanningMockup />
                </Reveal>
              </div>
              <div className="lg:col-span-4 lg:order-2">
                <Reveal delay={150}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/10 text-warning mb-6">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 leading-tight">Planning & Interventions</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Planifiez ramonages, SAV et installations. Vos techniciens voient leur agenda en temps réel.
                  </p>
                  <div className="space-y-3">
                    {["Vue semaine / jour", "Code couleur par métier", "Drag & drop"].map((h) => (
                      <div key={h} className="flex items-center gap-3 text-sm">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-warning/10">
                          <CheckCircle2 className="h-3.5 w-3.5 text-warning" />
                        </div>
                        <span className="font-medium">{h}</span>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
            </div>

            {/* Feature 3 — text left, mockup right */}
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              <div className="lg:col-span-4">
                <Reveal>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 leading-tight">Devis & Facturation</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Créez vos devis en quelques clics depuis votre catalogue. Facturez, suivez les paiements, relancez automatiquement.
                  </p>
                  <div className="space-y-3">
                    {["Catalogue produits intégré", "Calcul TVA temps réel", "Suivi des paiements"].map((h) => (
                      <div key={h} className="flex items-center gap-3 text-sm">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-medium">{h}</span>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
              <div className="lg:col-span-8">
                <Reveal delay={150}>
                  <QuoteMockup />
                </Reveal>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ═══ SURVEY — full-width accent background ═══ */}
      <Reveal>
        <section className="bg-accent/[0.06] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-6 sm:px-10">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              <div className="lg:col-span-5">
                <Reveal>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent mb-6">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-5 leading-tight">
                    Relevé technique<br />terrain
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-8 text-lg">
                    Remplissez vos relevés sur chantier, même hors ligne. 55 points de contrôle structurés, zéro papier perdu.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: ClipboardCheck, label: "8 sections guidées" },
                      { icon: Zap, label: "Sauvegarde auto" },
                      { icon: BarChart3, label: "55 points de contrôle" },
                      { icon: Clock, label: "Optimisé mobile" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2.5 rounded-xl border bg-card px-4 py-3">
                        <item.icon className="h-4 w-4 text-accent shrink-0" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
              <div className="lg:col-span-7">
                <Reveal delay={150}>
                  <SurveyMockup />
                </Reveal>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ═══ HOW IT WORKS ═══ */}
      <Reveal>
        <section id="how" className="py-28 md:py-36">
          <div className="mx-auto max-w-4xl px-6 sm:px-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-4">
              Démarrage
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-20" style={{ lineHeight: "1.1" } as React.CSSProperties}>
              En route en 3 étapes
            </h2>
            <div className="grid md:grid-cols-3 gap-12 md:gap-8 relative">
              {/* Connector line */}
              <div className="hidden md:block absolute top-8 left-[calc(16.67%+32px)] right-[calc(16.67%+32px)] border-t-2 border-dashed border-border" />
              {[
                { num: "1", text: "Créez votre compte en 2 minutes", sub: "Aucune carte bancaire requise" },
                { num: "2", text: "Ajoutez vos premiers clients et projets", sub: "Import ou saisie progressive" },
                { num: "3", text: "Planifiez, chiffrez, facturez", sub: "Tout au même endroit" },
              ].map((s, i) => (
                <Reveal key={i} delay={i * 120}>
                  <div className="relative flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground font-bold text-xl mb-6 shadow-lg shadow-accent/20 relative z-10">
                      {s.num}
                    </div>
                    <p className="text-base font-semibold mb-2">{s.text}</p>
                    <p className="text-sm text-muted-foreground">{s.sub}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ═══ TESTIMONIAL — asymmetric, large ═══ */}
      <Reveal>
        <section className="bg-primary text-primary-foreground py-24 md:py-32">
          <div className="mx-auto max-w-5xl px-6 sm:px-10">
            <div className="grid md:grid-cols-5 gap-10 items-center">
              <div className="md:col-span-3">
                <div className="flex gap-1 mb-8">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className="h-6 w-6 text-warning fill-warning" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote
                  className="text-2xl md:text-3xl font-medium leading-snug"
                  style={{ lineHeight: "1.3" } as React.CSSProperties}
                >
                  "Avant LIGNIA, mes devis traînaient une semaine. Maintenant je les envoie le soir même depuis le chantier."
                </blockquote>
              </div>
              <div className="md:col-span-2 flex md:justify-end">
                <div className="flex items-center gap-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 text-primary-foreground text-lg font-bold">
                    PL
                  </div>
                  <div>
                    <p className="text-lg font-semibold">Patrick Lefèvre</p>
                    <p className="text-sm text-primary-foreground/60">Artisan chauffagiste</p>
                    <p className="text-sm text-primary-foreground/40">Annecy (74)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ═══ FINAL CTA — accent band ═══ */}
      <Reveal>
        <section className="py-28 md:py-36">
          <div className="mx-auto max-w-3xl px-6 sm:px-10 text-center">
            <h2
              className="text-3xl md:text-4xl font-bold mb-5"
              style={{ lineHeight: "1.1" } as React.CSSProperties}
            >
              Prêt à structurer votre activité ?
            </h2>
            <p className="text-muted-foreground mb-10 max-w-md mx-auto text-lg">
              Essayez LIGNIA gratuitement pendant 14 jours. Aucune carte bancaire requise.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground active:scale-[0.97] transition-transform text-base h-13 px-8 rounded-xl"
                asChild
              >
                <Link to="/dashboard">
                  Essai gratuit 14 jours
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="active:scale-[0.97] transition-transform h-13 rounded-xl text-base"
              >
                Demander une démo
              </Button>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t py-10">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground font-bold text-[11px]">
              L
            </div>
            <span className="font-semibold text-foreground">LIGNIA</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-foreground transition-colors">Mentions légales</a>
            <a href="#" className="hover:text-foreground transition-colors">CGU</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p className="text-xs">© 2026 LIGNIA. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
