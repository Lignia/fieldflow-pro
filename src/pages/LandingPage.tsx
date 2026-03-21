import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
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
  Star,
  Briefcase,
  Wrench,
  Receipt,
  BookOpen,
  HelpCircle,
  MessageSquare,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
        transform: "translateY(18px)",
        filter: "blur(3px)",
        transition: `opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, filter 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}

/* ═══ Hero mockup — the star ═══ */
function HeroMockup() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-[0_32px_100px_-16px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b bg-muted/30">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive/25" />
          <div className="h-2.5 w-2.5 rounded-full bg-warning/25" />
          <div className="h-2.5 w-2.5 rounded-full bg-accent/25" />
        </div>
        <span className="ml-3 text-[10px] text-muted-foreground/60 font-medium tracking-wide">LIGNIA — Tableau de bord</span>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: "CA mois", val: "12 847 €", color: "text-accent", trend: "+12%" },
            { label: "Devis en cours", val: "7", color: "text-foreground" },
            { label: "Interventions", val: "14", color: "text-foreground" },
            { label: "Impayées", val: "3", color: "text-destructive" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border bg-background p-3">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{k.label}</p>
              <div className="flex items-end gap-1.5">
                <p className={`text-base font-bold font-mono leading-none ${k.color}`}>{k.val}</p>
                {k.trend && <span className="text-[9px] font-semibold text-accent leading-none mb-0.5">{k.trend}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 rounded-xl border bg-background p-3.5">
            <p className="text-[10px] font-semibold mb-2.5">Projets en cours</p>
            <div className="space-y-1.5">
              {[
                { name: "Dupont — Poêle Invicta", badge: "VT planifiée", color: "bg-amber-100 text-amber-800" },
                { name: "Martin — Insert Jøtul", badge: "Devis envoyé", color: "bg-orange-100 text-orange-800" },
                { name: "Garcia — Chaudière bois", badge: "Installation", color: "bg-accent/15 text-accent" },
                { name: "Bernard — Tubage inox", badge: "Facturation", color: "bg-primary/10 text-primary" },
              ].map((p) => (
                <div key={p.name} className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/30 transition-colors">
                  <span className="text-[10px] font-medium truncate">{p.name}</span>
                  <span className={`text-[8px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap ${p.color}`}>{p.badge}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-background p-3.5">
            <p className="text-[10px] font-semibold mb-2.5">CA 12 mois</p>
            <div className="flex items-end gap-[3px] h-24">
              {[40, 55, 35, 65, 50, 75, 60, 80, 70, 90, 65, 85].map((h, i) => (
                <div key={i} className={`flex-1 rounded-sm ${i === 11 ? "bg-accent" : "bg-accent/20"}`} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Planning mockup ═══ */
function PlanningMockup() {
  return (
    <div className="rounded-2xl border bg-card shadow-[0_24px_72px_-12px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
        <span className="text-[11px] font-semibold">Planning — Semaine 12</span>
        <div className="flex gap-2">
          <span className="text-[8px] rounded-full px-2 py-0.5 bg-primary/10 text-primary font-semibold">Installation</span>
          <span className="text-[8px] rounded-full px-2 py-0.5 bg-warning/15 text-warning font-semibold">SAV</span>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x">
        {[
          { day: "Lun 17", slots: [{ time: "08:00", label: "Dupont — Ramonage", type: "sav" }, { time: "14:00", label: "Garcia — Diagnostic", type: "sav" }] },
          { day: "Mar 18", slots: [{ time: "09:00", label: "Martin — Pose insert", type: "install" }, { time: "15:30", label: "Moreau — SAV chaudière", type: "sav" }] },
          { day: "Mer 19", slots: [{ time: "08:30", label: "Lefèvre — VT chaudière", type: "install" }] },
        ].map((d) => (
          <div key={d.day} className="p-3">
            <p className="text-[9px] font-semibold text-muted-foreground mb-2 text-center">{d.day}</p>
            <div className="space-y-1.5">
              {d.slots.map((s) => (
                <div key={s.time + s.label} className={`rounded-lg px-2 py-1.5 border-l-[3px] ${s.type === "install" ? "border-l-primary bg-primary/[0.04]" : "border-l-warning bg-warning/[0.04]"}`}>
                  <p className="text-[8px] font-mono text-muted-foreground">{s.time}</p>
                  <p className="text-[9px] font-medium mt-0.5 leading-snug">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ Quote mockup ═══ */
function QuoteMockup() {
  return (
    <div className="rounded-2xl border bg-card shadow-[0_24px_72px_-12px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
        <div><span className="text-[11px] font-semibold">Devis DEV-2026-0042</span><span className="text-[9px] text-muted-foreground ml-2">v2</span></div>
        <span className="text-[8px] rounded-full px-2 py-0.5 bg-accent/15 text-accent font-semibold">Signé ✓</span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-dashed">
          <div><p className="text-[9px] text-muted-foreground">Client</p><p className="text-[11px] font-semibold">M. & Mme Dupont</p></div>
          <div className="text-right"><p className="text-[9px] text-muted-foreground">Date</p><p className="text-[11px] font-medium">15/03/2026</p></div>
        </div>
        <table className="w-full text-[9px] mb-3">
          <thead><tr className="text-muted-foreground text-left border-b"><th className="pb-1.5 font-medium">Désignation</th><th className="pb-1.5 font-medium text-center w-10">Qté</th><th className="pb-1.5 font-medium text-right w-16">P.U. HT</th><th className="pb-1.5 font-medium text-right w-16">Total</th></tr></thead>
          <tbody>
            {[
              { desc: "Poêle à bois Invicta Onsen", qty: "1", pu: "2 890 €", total: "2 890 €" },
              { desc: "Kit raccordement inox Ø150", qty: "1", pu: "485 €", total: "485 €" },
              { desc: "Main d'œuvre installation", qty: "8h", pu: "80 €/h", total: "640 €" },
            ].map((l) => (
              <tr key={l.desc} className="border-b border-dashed"><td className="py-2 font-medium">{l.desc}</td><td className="py-2 text-center text-muted-foreground">{l.qty}</td><td className="py-2 text-right font-mono text-muted-foreground">{l.pu}</td><td className="py-2 text-right font-mono font-semibold">{l.total}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end">
          <div className="w-40 space-y-1">
            <div className="flex justify-between text-[9px]"><span className="text-muted-foreground">Total HT</span><span className="font-mono font-medium">4 249 €</span></div>
            <div className="flex justify-between text-[9px]"><span className="text-muted-foreground">TVA 10%</span><span className="font-mono font-medium">424,90 €</span></div>
            <div className="flex justify-between text-[11px] font-bold pt-1 border-t"><span>Total TTC</span><span className="font-mono text-accent">4 673,90 €</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Survey mockup ═══ */
function SurveyMockup() {
  return (
    <div className="rounded-2xl border bg-card shadow-[0_24px_72px_-12px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/30"><span className="text-[11px] font-semibold">Relevé technique — Dupont</span></div>
      <div className="p-4 space-y-3">
        <div>
          <div className="flex gap-0.5 mb-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (<div key={s} className={`h-1.5 flex-1 rounded-full ${s <= 5 ? "bg-accent" : "bg-border"}`} />))}
          </div>
          <div className="flex justify-between"><p className="text-[9px] text-muted-foreground font-medium">Section 5/8 — Pièce d'installation</p><p className="text-[9px] text-accent font-semibold">62%</p></div>
        </div>
        <div className="space-y-2">
          {[
            { label: "Surface pièce", value: "42 m²", filled: true },
            { label: "Hauteur sous plafond", value: "2.50 m", filled: true },
            { label: "Type de sol", value: "Carrelage", filled: true },
            { label: "Arrivée d'air", value: "", filled: false },
          ].map((f) => (
            <div key={f.label} className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 ${f.filled ? "bg-background" : "bg-muted/30 border-dashed"}`}>
              <span className="text-[10px] text-muted-foreground">{f.label}</span>
              {f.filled ? <span className="text-[10px] font-semibold flex items-center gap-1">{f.value}<CheckCircle2 className="h-3 w-3 text-accent" /></span> : <span className="text-[9px] text-muted-foreground/50 italic">À remplir</span>}
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <div className="flex-1 h-8 rounded-lg bg-muted/50 border border-dashed flex items-center justify-center text-[9px] text-muted-foreground">+ Ajouter photo</div>
          <div className="h-8 rounded-lg bg-accent text-accent-foreground px-3.5 flex items-center text-[9px] font-semibold">Section suivante →</div>
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
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 sm:px-10 h-[60px]">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">L</div>
            <span className="text-[15px] font-bold tracking-tight text-foreground">LIGNIA</span>
          </Link>
          <div className="hidden md:flex items-center">
            <NavigationMenu>
              <NavigationMenuList className="gap-0.5">
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-[13px] font-medium text-muted-foreground bg-transparent hover:bg-muted/50 hover:text-foreground data-[state=open]:text-foreground data-[state=open]:bg-muted/50 rounded-lg h-9 px-3 transition-all duration-200">Produit</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[520px] p-5">
                      <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-[0.15em] mb-3 px-2">Fonctionnalités</p>
                      <div className="grid grid-cols-2 gap-0.5">
                        {[
                          { icon: Briefcase, title: "Gestion clients", desc: "Fiches clients, historique et suivi complet" },
                          { icon: ClipboardCheck, title: "Relevé technique", desc: "Formulaires terrain sur mobile et tablette" },
                          { icon: Receipt, title: "Devis & facturation", desc: "Créez et envoyez vos documents en minutes" },
                          { icon: CalendarDays, title: "Planning", desc: "Planifiez interventions et équipes" },
                          { icon: BarChart3, title: "Tableau de bord", desc: "Suivez votre CA et vos KPIs en temps réel" },
                          { icon: Wrench, title: "Demandes SAV", desc: "Gérez le service après-vente efficacement" },
                        ].map((item) => (
                          <NavigationMenuLink key={item.title} asChild>
                            <a href="#features" className="flex items-start gap-3 rounded-xl p-3 transition-all duration-200 hover:bg-accent/[0.06] group cursor-pointer">
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background group-hover:border-accent/40 group-hover:bg-accent/[0.06] transition-all duration-200">
                                <item.icon className="h-[15px] w-[15px] text-muted-foreground/70 group-hover:text-accent transition-colors duration-200" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-foreground leading-tight">{item.title}</p>
                                <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-snug">{item.desc}</p>
                              </div>
                            </a>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-[13px] font-medium text-muted-foreground bg-transparent hover:bg-muted/50 hover:text-foreground data-[state=open]:text-foreground data-[state=open]:bg-muted/50 rounded-lg h-9 px-3 transition-all duration-200">Ressources</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[380px] p-5">
                      <div className="grid gap-0.5">
                        {[
                          { icon: BookOpen, title: "Guide de démarrage", desc: "Prenez en main LIGNIA en 15 minutes" },
                          { icon: Video, title: "Tutoriels vidéo", desc: "Apprenez chaque fonctionnalité pas à pas" },
                          { icon: HelpCircle, title: "Centre d'aide", desc: "FAQ et articles de support détaillés" },
                          { icon: MessageSquare, title: "Contactez-nous", desc: "Notre équipe répond en moins de 2h" },
                        ].map((item) => (
                          <NavigationMenuLink key={item.title} asChild>
                            <a href="#" className="flex items-start gap-3 rounded-xl p-3 transition-all duration-200 hover:bg-accent/[0.06] group cursor-pointer">
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background group-hover:border-accent/40 group-hover:bg-accent/[0.06] transition-all duration-200">
                                <item.icon className="h-[15px] w-[15px] text-muted-foreground/70 group-hover:text-accent transition-colors duration-200" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-foreground leading-tight">{item.title}</p>
                                <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-snug">{item.desc}</p>
                              </div>
                            </a>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <a href="#how" className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-muted/50">Tarifs</a>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground rounded-lg font-medium text-[13px] h-9" asChild>
              <Link to="/dashboard">Connexion</Link>
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all rounded-lg font-medium text-[13px] h-9 px-4 shadow-none" asChild>
              <Link to="/dashboard">Démarrer maintenant</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO — product-first, asymmetric ═══ */}
      <section className="relative pt-16 pb-0 md:pt-24 overflow-hidden">
        {/* Accent gradient blob — top right, guides the eye */}
        <div className="absolute -top-20 right-0 w-[600px] h-[600px] bg-accent/[0.07] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-40 -left-20 w-[300px] h-[300px] bg-warning/[0.04] rounded-full blur-[80px] pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-6 sm:px-10 relative z-10">
          {/* Text — left-aligned, narrow, punchy */}
          <div className="max-w-xl mb-12 md:mb-16">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.07] px-3.5 py-1 text-[11px] font-medium text-accent mb-6">
                <Flame className="h-3 w-3" />
                Chauffage · HVAC · Plomberie
              </div>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-foreground" style={{ lineHeight: "1.06" }}>
                Gérez votre activité artisanale.{" "}
                <span className="text-accent">Simplement.</span>
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-5 text-base text-muted-foreground max-w-md leading-relaxed">
                De la demande client à la facturation, LIGNIA structure votre quotidien sans le compliquer.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="mt-7 flex items-center gap-4">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_6px_24px_-4px_rgba(0,0,0,0.12)] active:scale-[0.97] transition-all text-sm font-semibold px-7 h-11 rounded-lg" asChild>
                  <Link to="/dashboard">
                    Démarrer maintenant
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />)}
                  <span className="ml-1 font-semibold text-foreground">4.8</span>
                </div>
                <span className="text-border">|</span>
                <span>200+ artisans équipés</span>
              </div>
            </Reveal>
          </div>
        </div>

        {/* HERO PRODUCT — full-width, bleeds to edges, heroized */}
        <Reveal delay={200}>
          <div className="relative mx-auto max-w-6xl px-4 sm:px-8">
            {/* Accent line — runs under the mockup */}
            <div className="absolute bottom-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
            
            {/* Floating stat cards — break the grid, add depth */}
            <div className="absolute -left-2 md:left-4 top-[15%] z-20 hidden lg:block">
              <div className="rounded-xl border bg-card p-3 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)] backdrop-blur-sm">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Nouveaux clients</p>
                <p className="text-lg font-bold font-mono text-accent leading-none">+23</p>
                <p className="text-[8px] text-accent mt-0.5 font-medium">↑ ce mois</p>
              </div>
            </div>
            <div className="absolute -right-2 md:right-6 top-[30%] z-20 hidden lg:block">
              <div className="rounded-xl border bg-card p-3 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)] backdrop-blur-sm">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Taux conversion</p>
                <p className="text-lg font-bold font-mono text-foreground leading-none">72%</p>
                <div className="flex gap-0.5 mt-1.5">
                  {[60, 45, 70, 55, 80, 65, 72].map((v, i) => (
                    <div key={i} className="w-2 rounded-sm bg-accent/30" style={{ height: `${v * 0.2}px` }}>
                      {i === 6 && <div className="w-full rounded-sm bg-accent" style={{ height: '100%' }} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main mockup — pushed down to overlap next section */}
            <div className="relative mb-[-80px] md:mb-[-120px]">
              <HeroMockup />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══ FEATURE BAR — floats above the next section ═══ */}
      <section className="relative z-10 pt-28 md:pt-36 pb-8">
        <div className="mx-auto max-w-5xl px-6 sm:px-10">
          <Reveal>
            <div className="rounded-2xl bg-primary text-primary-foreground p-1">
              <div className="grid grid-cols-2 md:grid-cols-4">
                {[
                  { icon: Briefcase, label: "Gestion clients" },
                  { icon: ClipboardCheck, label: "Relevé terrain" },
                  { icon: Receipt, label: "Devis & factures" },
                  { icon: CalendarDays, label: "Planning" },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2.5 px-4 py-3.5 text-[13px] font-medium text-primary-foreground/80">
                    <f.icon className="h-4 w-4 text-accent shrink-0" />
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ PROBLEM — asymmetric, not 3 equal cards ═══ */}
      <Reveal>
        <section className="bg-primary text-primary-foreground py-24 md:py-32 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/[0.03] rounded-full blur-[120px] pointer-events-none" />
          <div className="mx-auto max-w-6xl px-6 sm:px-10 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left — big statement */}
              <div>
                <Reveal>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/30 mb-4">Le constat</p>
                  <h2 className="text-3xl md:text-[2.75rem] font-bold leading-[1.08] mb-5">
                    Vous jonglez entre carnets, tableurs et relances oubliées&nbsp;?
                  </h2>
                  <p className="text-primary-foreground/45 text-base leading-relaxed max-w-md">
                    Chaque jour, des artisans perdent du temps et de l'argent à cause d'outils inadaptés.
                  </p>
                </Reveal>
              </div>
              {/* Right — stacked stats, not a grid */}
              <div className="space-y-4">
                {[
                  { stat: "2h/jour", label: "perdues en admin", desc: "Devis perdus dans les mails, relances oubliées", icon: FileText },
                  { stat: "30%", label: "de trajets évitables", desc: "Planning techniciens sur carnet, jamais à jour", icon: CalendarDays },
                  { stat: "45j", label: "délai moyen de paiement", desc: "Facturation en retard, trésorerie sous tension", icon: Euro },
                ].map((p, i) => (
                  <Reveal key={i} delay={i * 100}>
                    <div className="flex items-start gap-5 rounded-xl border border-primary-foreground/[0.07] bg-primary-foreground/[0.03] p-5 backdrop-blur-sm">
                      <div className="shrink-0">
                        <p className="text-2xl font-bold font-mono text-warning/90 leading-none">{p.stat}</p>
                        <p className="text-[9px] text-primary-foreground/35 uppercase tracking-wider font-medium mt-1">{p.label}</p>
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm text-primary-foreground/55 leading-relaxed">{p.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ═══ FEATURES — varied layouts, product-centric ═══ */}
      <section id="features" className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <Reveal>
            <div className="mb-20">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent mb-3">Fonctionnalités</p>
              <h2 className="text-3xl md:text-4xl font-bold max-w-lg" style={{ lineHeight: "1.1" }}>
                Tout ce qu'il faut,<br />rien de superflu
              </h2>
            </div>
          </Reveal>

          {/* Feature 1 — FULL WIDTH product hero, text overlaid at bottom */}
          <div className="mb-28 md:mb-36">
            <Reveal>
              <div className="relative">
                {/* Big mockup — takes the full stage */}
                <div className="relative z-10">
                  <HeroMockup />
                </div>
                {/* Accent bar at bottom — grounds it */}
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-accent/[0.04] to-transparent rounded-b-2xl pointer-events-none" />
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="grid md:grid-cols-3 gap-8 mt-10">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Users className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="text-lg font-bold">Clients & Projets</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Centralisez vos clients et projets. Pipeline visuel en 17 étapes, du premier contact à la clôture.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <BarChart3 className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="text-lg font-bold">Tableau de bord</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    CA, devis, interventions, impayés — vos KPIs en un coup d'œil, actualisés en temps réel.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Wrench className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="text-lg font-bold">Demandes SAV</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Centralisez les réclamations, planifiez les interventions et suivez les résolutions.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Feature 2 — Split but ASYMMETRIC: 7/5 not 6/6, mockup offset */}
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-28 md:mb-36">
            <div className="lg:col-span-7 relative">
              <Reveal>
                {/* Mockup slightly rotated and elevated */}
                <div className="relative">
                  <div className="absolute -inset-4 bg-warning/[0.03] rounded-3xl -z-10" />
                  <PlanningMockup />
                </div>
              </Reveal>
            </div>
            <div className="lg:col-span-5">
              <Reveal delay={120}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-warning mb-3">Planning</p>
                <h3 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">
                  Votre planning,<br />enfin lisible
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Planifiez ramonages, SAV et installations. Vos techniciens voient leur agenda en temps réel depuis leur mobile.
                </p>
                <div className="space-y-2.5">
                  {["Vue semaine / jour", "Code couleur par métier", "Drag & drop intuitif"].map((h) => (
                    <div key={h} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-warning shrink-0" />
                      <span className="font-medium">{h}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>

          {/* Feature 3 — REVERSE asymmetric 5/7, with accent background bleed */}
          <div className="relative mb-28 md:mb-36">
            <div className="absolute top-[-40px] bottom-[-40px] -left-6 -right-6 bg-accent/[0.04] rounded-3xl -z-10" />
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center py-10">
              <div className="lg:col-span-5 lg:order-1">
                <Reveal>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent mb-3">Facturation</p>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">
                    Du devis à la facture,<br />sans friction
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Créez vos devis depuis votre catalogue. Un clic pour convertir en facture. Suivi des paiements et relances automatiques.
                  </p>
                  <div className="space-y-2.5">
                    {["Catalogue produits intégré", "Calcul TVA temps réel", "Signature électronique"].map((h) => (
                      <div key={h} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                        <span className="font-medium">{h}</span>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
              <div className="lg:col-span-7 lg:order-2">
                <Reveal delay={120}>
                  <QuoteMockup />
                </Reveal>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SURVEY — immersive full-bleed dark section ═══ */}
      <Reveal>
        <section className="bg-primary text-primary-foreground py-20 md:py-28 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/[0.05] rounded-full blur-[100px] pointer-events-none" />
          <div className="mx-auto max-w-7xl px-6 sm:px-10 relative z-10">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              <div className="lg:col-span-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent mb-3">Terrain</p>
                <h2 className="text-3xl md:text-4xl font-bold mb-5 leading-tight">
                  Relevé technique<br />terrain
                </h2>
                <p className="text-primary-foreground/50 leading-relaxed mb-8">
                  Remplissez vos relevés sur chantier, même hors ligne. 55 points de contrôle, zéro papier perdu.
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { icon: ClipboardCheck, label: "8 sections guidées" },
                    { icon: Zap, label: "Sauvegarde auto" },
                    { icon: BarChart3, label: "55 points de contrôle" },
                    { icon: Clock, label: "Optimisé mobile" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 rounded-lg border border-primary-foreground/[0.08] bg-primary-foreground/[0.03] px-3 py-2.5">
                      <item.icon className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className="text-[12px] font-medium text-primary-foreground/70">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-7">
                <Reveal delay={150}>
                  {/* Survey mockup on dark — stands out */}
                  <div className="relative">
                    <div className="absolute -inset-3 bg-accent/[0.04] rounded-3xl" />
                    <div className="relative">
                      <SurveyMockup />
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ═══ HOW — horizontal timeline, connected ═══ */}
      <Reveal>
        <section id="how" className="py-24 md:py-32">
          <div className="mx-auto max-w-5xl px-6 sm:px-10">
            <div className="text-center mb-14">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent mb-3">Démarrage</p>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ lineHeight: "1.1" }}>En route en 3 étapes</h2>
            </div>
            <div className="relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-10 left-[16.67%] right-[16.67%] h-px bg-border" />
              <div className="grid md:grid-cols-3 gap-8 relative z-10">
                {[
                  { num: "01", text: "Créez votre compte", sub: "En 2 minutes, sans carte bancaire.", icon: Zap, color: "text-accent bg-accent/10" },
                  { num: "02", text: "Ajoutez vos données", sub: "Clients, projets, catalogue — importez ou saisissez.", icon: Users, color: "text-primary bg-primary/10" },
                  { num: "03", text: "Pilotez votre activité", sub: "Planifiez, chiffrez et facturez depuis un seul endroit.", icon: BarChart3, color: "text-warning bg-warning/10" },
                ].map((s, i) => (
                  <Reveal key={i} delay={i * 100}>
                    <div className="text-center">
                      <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl mb-5 shadow-sm", s.color)}>
                        <s.icon className="h-5 w-5" />
                      </div>
                      <p className="text-[11px] font-bold font-mono text-muted-foreground/40 mb-2">{s.num}</p>
                      <h3 className="text-base font-bold mb-2">{s.text}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{s.sub}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ═══ TESTIMONIAL — integrated, not isolated ═══ */}
      <Reveal>
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-4xl px-6 sm:px-10">
            <div className="relative rounded-2xl bg-muted/40 p-8 md:p-12">
              {/* Accent dot */}
              <div className="absolute top-6 left-8 md:left-12 w-1 h-12 rounded-full bg-accent" />
              <div className="pl-6">
                <blockquote className="text-xl md:text-2xl font-semibold text-foreground mb-6 leading-snug" style={{ textWrap: "balance" } as React.CSSProperties}>
                  Avant LIGNIA, mes devis traînaient une semaine. Maintenant je les envoie le soir même depuis le chantier.
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">PL</div>
                  <div>
                    <p className="text-sm font-semibold">Patrick Lefèvre</p>
                    <p className="text-xs text-muted-foreground">Artisan chauffagiste · Annecy (74)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ═══ FINAL CTA ═══ */}
      <Reveal>
        <section className="bg-primary text-primary-foreground py-24 md:py-32 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-accent/[0.06] rounded-full blur-[100px] pointer-events-none" />
          <div className="mx-auto max-w-3xl px-6 sm:px-10 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ lineHeight: "1.1" }}>
              Prêt à structurer votre activité ?
            </h2>
            <p className="text-primary-foreground/45 mb-8 max-w-md mx-auto">
              Essayez LIGNIA gratuitement pendant 14 jours. Aucune carte bancaire requise.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_6px_24px_-4px_rgba(0,0,0,0.15)] active:scale-[0.97] transition-all text-sm font-semibold px-7 h-11 rounded-lg" asChild>
                <Link to="/dashboard">Essai gratuit 14 jours<ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 active:scale-[0.97] transition-all text-sm font-medium h-11 rounded-lg">
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
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground font-bold text-[11px]">L</div>
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
