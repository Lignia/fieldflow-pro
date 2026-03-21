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
} from "lucide-react";
import { useEffect, useRef } from "react";

/* ── Scroll reveal ── */
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

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        transform: "translateY(18px)",
        filter: "blur(3px)",
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, filter 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Product mockups ── */
function DashboardMockup() {
  return (
    <div className="rounded-2xl border bg-card shadow-2xl shadow-primary/8 overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b bg-muted/30">
        <div className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
        <div className="h-2.5 w-2.5 rounded-full bg-warning/40" />
        <div className="h-2.5 w-2.5 rounded-full bg-accent/40" />
        <span className="ml-3 text-[10px] text-muted-foreground font-medium tracking-wide">
          LIGNIA — Tableau de bord
        </span>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "CA mois", val: "12 847 €", color: "text-accent" },
            { label: "Devis en cours", val: "7", color: "text-foreground" },
            { label: "Impayées", val: "3", color: "text-destructive" },
          ].map((k) => (
            <div key={k.label} className="rounded-lg border bg-background p-3">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                {k.label}
              </p>
              <p className={`text-base font-bold font-mono mt-0.5 ${k.color}`}>
                {k.val}
              </p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[
            { name: "Dupont — Poêle Invicta", badge: "VT planifiée", color: "bg-amber-100 text-amber-700" },
            { name: "Martin — Insert Jøtul", badge: "Devis envoyé", color: "bg-orange-100 text-orange-700" },
            { name: "Garcia — Chaudière bois", badge: "En cours", color: "bg-accent/15 text-accent" },
          ].map((p) => (
            <div key={p.name} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
              <span className="text-[11px] font-medium truncate">{p.name}</span>
              <span className={`text-[9px] font-semibold rounded-full px-2 py-0.5 ${p.color}`}>
                {p.badge}
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-lg border bg-background p-3">
          <div className="flex items-end gap-1.5 h-12">
            {[40, 55, 35, 65, 50, 75, 60, 80, 70, 90, 65, 85].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-accent/25"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanningMockup() {
  const slots = [
    { time: "08:00", label: "Dupont — Ramonage", type: "sav" },
    { time: "10:30", label: "Martin — Pose insert", type: "install" },
    { time: "14:00", label: "Garcia — Diagnostic", type: "sav" },
    { time: "16:00", label: "Lefèvre — VT chaudière", type: "install" },
  ];
  return (
    <div className="rounded-2xl border bg-card shadow-xl shadow-primary/5 overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <span className="text-[11px] font-semibold">Planning — Lundi 17 mars</span>
        <div className="flex gap-1.5">
          <span className="text-[8px] rounded-full px-2 py-0.5 bg-primary/10 text-primary font-medium">Installation</span>
          <span className="text-[8px] rounded-full px-2 py-0.5 bg-warning/15 text-warning font-medium">SAV</span>
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        {slots.map((s) => (
          <div key={s.time} className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
            <span className="text-[10px] font-mono text-muted-foreground w-10">{s.time}</span>
            <div className={`h-6 w-1 rounded-full ${s.type === "install" ? "bg-primary" : "bg-warning"}`} />
            <span className="text-[11px] font-medium">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuoteMockup() {
  return (
    <div className="rounded-2xl border bg-card shadow-xl shadow-primary/5 overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <span className="text-[11px] font-semibold">Devis DEV-2026-0042</span>
        <span className="text-[9px] rounded-full px-2 py-0.5 bg-accent/15 text-accent font-semibold">Signé</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="space-y-1.5">
          {[
            { desc: "Poêle à bois Invicta Onsen", qty: "1", price: "2 890 €" },
            { desc: "Kit raccordement inox", qty: "1", price: "485 €" },
            { desc: "Main d'œuvre installation", qty: "8h", price: "640 €" },
          ].map((l) => (
            <div key={l.desc} className="flex items-center justify-between text-[10px] border-b border-dashed pb-1.5">
              <span className="font-medium text-foreground">{l.desc}</span>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">{l.qty}</span>
                <span className="font-mono font-semibold w-16 text-right">{l.price}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <div className="text-right space-y-0.5">
            <p className="text-[9px] text-muted-foreground">Total TTC</p>
            <p className="text-lg font-bold font-mono text-foreground">4 818 €</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 border-b bg-card/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-5 sm:px-8 h-14">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground font-bold text-sm">
              L
            </div>
            <span className="text-lg font-bold tracking-tight">LIGNIA</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Fonctionnalités
            </a>
            <a href="#how" className="text-muted-foreground hover:text-foreground transition-colors">
              Comment ça marche
            </a>
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

      {/* ─── Hero ─── */}
      <section className="relative pt-16 pb-20 md:pt-28 md:pb-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <div>
              <Reveal>
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-medium text-accent mb-8">
                  <Flame className="h-3.5 w-3.5" />
                  Chauffage bois · HVAC · Plomberie
                </div>
              </Reveal>
              <Reveal delay={80}>
                <h1
                  className="text-4xl sm:text-5xl md:text-[3.25rem] font-bold tracking-tight text-foreground"
                  style={{ lineHeight: "1.08", textWrap: "balance" } as React.CSSProperties}
                >
                  Gérez votre activité artisanale.{" "}
                  <span className="text-accent">Simplement.</span>
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p
                  className="mt-6 text-lg text-muted-foreground max-w-md leading-relaxed"
                  style={{ textWrap: "pretty" } as React.CSSProperties}
                >
                  De la demande client à la facturation, LIGNIA structure votre quotidien sans le compliquer.
                </p>
              </Reveal>
              <Reveal delay={240}>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground active:scale-[0.97] transition-transform text-base px-8 h-12"
                    asChild
                  >
                    <Link to="/dashboard">
                      Démarrer gratuitement
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="active:scale-[0.97] transition-transform text-base h-12"
                  >
                    Demander une démo
                  </Button>
                </div>
              </Reveal>
              <Reveal delay={320}>
                <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-accent" /> 14 jours gratuits
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-accent" /> Sans carte bancaire
                  </span>
                </div>
              </Reveal>
            </div>

            <Reveal delay={200}>
              <div className="relative">
                <div className="absolute -inset-8 bg-accent/[0.04] rounded-3xl blur-3xl" />
                <div className="relative">
                  <DashboardMockup />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── Problem — full-width accent band ─── */}
      <Reveal>
        <section className="bg-primary text-primary-foreground py-20 md:py-28">
          <div className="mx-auto max-w-4xl px-5 sm:px-8 text-center">
            <h2
              className="text-2xl md:text-3xl font-bold mb-4"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              Vous jonglez entre carnets, tableurs et relances oubliées ?
            </h2>
            <p className="text-primary-foreground/60 text-base mb-14 max-w-lg mx-auto">
              Chaque jour, des artisans perdent du temps et de l'argent à cause d'outils inadaptés.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: FileText, text: "Devis perdus dans les mails, relances oubliées", stat: "2h/jour", statLabel: "perdues en admin" },
                { icon: CalendarDays, text: "Planning techniciens sur carnet, jamais à jour", stat: "30%", statLabel: "de trajets inutiles" },
                { icon: Euro, text: "Facturation en retard, trésorerie sous tension", stat: "45j", statLabel: "délai moyen de paiement" },
              ].map((p, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/10 mb-4">
                      <p.icon className="h-5 w-5 text-primary-foreground/80" />
                    </div>
                    <p className="text-sm font-medium leading-snug text-primary-foreground/90 mb-4">{p.text}</p>
                    <div className="pt-3 border-t border-primary-foreground/10">
                      <p className="text-2xl font-bold font-mono text-warning">{p.stat}</p>
                      <p className="text-[11px] text-primary-foreground/50 mt-0.5">{p.statLabel}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ─── Feature 1 — Clients & Projets (text left, visual right) ─── */}
      <Reveal>
        <section id="features" className="py-24 md:py-32">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="text-center mb-20">
              <Reveal>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">Fonctionnalités</p>
              </Reveal>
              <Reveal delay={60}>
                <h2
                  className="text-2xl md:text-3xl font-bold"
                  style={{ textWrap: "balance" } as React.CSSProperties}
                >
                  Tout ce qu'il faut, rien de superflu
                </h2>
              </Reveal>
            </div>

            {/* Feature row 1 — asymmetric left text / right visual */}
            <div className="grid md:grid-cols-5 gap-12 md:gap-16 items-center mb-28">
              <div className="md:col-span-2">
                <Reveal>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent mb-5">
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Clients & Projets</h3>
                  <p className="text-muted-foreground leading-relaxed mb-5">
                    Centralisez vos clients, propriétés et projets. Suivez chaque affaire du premier contact à la clôture.
                  </p>
                  <div className="space-y-2.5">
                    {["Fiche client complète", "Pipeline 17 étapes", "Historique activité"].map((h) => (
                      <div key={h} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                        <span className="text-foreground font-medium">{h}</span>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
              <div className="md:col-span-3">
                <Reveal delay={120}>
                  <DashboardMockup />
                </Reveal>
              </div>
            </div>

            {/* Feature row 2 — reverse: visual left / text right */}
            <div className="grid md:grid-cols-5 gap-12 md:gap-16 items-center mb-28">
              <div className="md:col-span-3 md:order-1">
                <Reveal>
                  <PlanningMockup />
                </Reveal>
              </div>
              <div className="md:col-span-2 md:order-2">
                <Reveal delay={120}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10 text-warning mb-5">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Planning & Interventions</h3>
                  <p className="text-muted-foreground leading-relaxed mb-5">
                    Planifiez ramonages, SAV et installations. Vos techniciens voient leur agenda en temps réel.
                  </p>
                  <div className="space-y-2.5">
                    {["Vue semaine / jour", "Code couleur métier", "Drag & drop"].map((h) => (
                      <div key={h} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-warning shrink-0" />
                        <span className="text-foreground font-medium">{h}</span>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
            </div>

            {/* Feature row 3 — text left / visual right */}
            <div className="grid md:grid-cols-5 gap-12 md:gap-16 items-center">
              <div className="md:col-span-2">
                <Reveal>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-5">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Devis & Facturation</h3>
                  <p className="text-muted-foreground leading-relaxed mb-5">
                    Créez vos devis en quelques clics depuis votre catalogue. Facturez, suivez les paiements, relancez.
                  </p>
                  <div className="space-y-2.5">
                    {["Catalogue intégré", "Calcul TVA temps réel", "Suivi paiements"].map((h) => (
                      <div key={h} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-foreground font-medium">{h}</span>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
              <div className="md:col-span-3">
                <Reveal delay={120}>
                  <QuoteMockup />
                </Reveal>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ─── Survey highlight — full-width muted band ─── */}
      <Reveal>
        <section className="bg-muted/40 border-y py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent mb-5">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Relevé technique terrain
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6 max-w-md">
                  Remplissez vos relevés sur chantier, même hors ligne. 55 points de contrôle structurés, zéro papier perdu.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: ClipboardCheck, label: "8 sections guidées" },
                    { icon: Zap, label: "Sauvegarde auto" },
                    { icon: BarChart3, label: "55 points de contrôle" },
                    { icon: Clock, label: "Optimisé mobile" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5">
                      <item.icon className="h-4 w-4 text-accent shrink-0" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                {/* Stylized form mockup */}
                <div className="rounded-2xl border bg-card shadow-xl shadow-primary/5 overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/30">
                    <span className="text-[11px] font-semibold">Relevé technique — Dupont</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Progress */}
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <div
                          key={s}
                          className={`h-1.5 flex-1 rounded-full ${s <= 5 ? "bg-accent" : "bg-border"}`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Section 5/8 — Pièce d'installation</p>
                    <div className="space-y-2">
                      {[
                        { label: "Surface pièce (m²)", value: "42" },
                        { label: "Hauteur sous plafond", value: "2.50 m" },
                        { label: "Type de sol", value: "Carrelage" },
                        { label: "Ventilation", value: "VMC simple flux" },
                      ].map((f) => (
                        <div key={f.label} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                          <span className="text-[10px] text-muted-foreground">{f.label}</span>
                          <span className="text-[11px] font-medium">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ─── How it works — numbered, horizontal ─── */}
      <Reveal>
        <section id="how" className="py-24 md:py-32">
          <div className="mx-auto max-w-4xl px-5 sm:px-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">Démarrage</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-16">
              En route en 3 étapes
            </h2>
            <div className="grid md:grid-cols-3 gap-10 md:gap-6 relative">
              {/* Connector line */}
              <div className="hidden md:block absolute top-7 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] border-t-2 border-dashed border-border" />
              {[
                { num: "1", text: "Créez votre compte en 2 minutes", sub: "Aucune carte bancaire requise", icon: Zap },
                { num: "2", text: "Ajoutez vos premiers clients et projets", sub: "Import ou saisie progressive", icon: Users },
                { num: "3", text: "Planifiez, chiffrez, facturez", sub: "Tout au même endroit", icon: BarChart3 },
              ].map((s, i) => (
                <Reveal key={i} delay={i * 120}>
                  <div className="relative flex flex-col items-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground font-bold text-lg mb-5 shadow-lg shadow-accent/20 relative z-10">
                      {s.num}
                    </div>
                    <p className="text-base font-semibold mb-1.5">{s.text}</p>
                    <p className="text-sm text-muted-foreground">{s.sub}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ─── Testimonial — asymmetric large quote ─── */}
      <Reveal>
        <section className="bg-muted/30 border-y py-20 md:py-28">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="grid md:grid-cols-3 gap-10 items-center">
              <div className="md:col-span-2">
                <div className="flex gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className="h-5 w-5 text-warning fill-warning" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote
                  className="text-xl md:text-2xl font-medium text-foreground leading-relaxed"
                  style={{ textWrap: "balance" } as React.CSSProperties}
                >
                  "Avant LIGNIA, mes devis traînaient une semaine. Maintenant je les envoie le soir même depuis le chantier."
                </blockquote>
              </div>
              <div className="flex md:justify-end">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-base font-bold">
                    PL
                  </div>
                  <div>
                    <p className="text-base font-semibold">Patrick Lefèvre</p>
                    <p className="text-sm text-muted-foreground">Artisan chauffagiste</p>
                    <p className="text-xs text-muted-foreground">Annecy (74)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ─── Final CTA — accent color band ─── */}
      <Reveal>
        <section className="bg-accent py-20 md:py-28">
          <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-accent-foreground">
              Prêt à structurer votre activité ?
            </h2>
            <p className="text-accent-foreground/70 mb-10 max-w-md mx-auto">
              Essayez LIGNIA gratuitement pendant 14 jours. Aucune carte bancaire requise.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground active:scale-[0.97] transition-transform text-base h-12 px-8"
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
                className="border-accent-foreground/30 text-accent-foreground hover:bg-accent-foreground/10 hover:text-accent-foreground active:scale-[0.97] transition-transform h-12"
              >
                Demander une démo
              </Button>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ─── Footer ─── */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-accent text-accent-foreground font-bold text-[10px]">
              L
            </div>
            <span className="font-semibold text-foreground">LIGNIA</span>
          </div>
          <div className="flex gap-6">
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
