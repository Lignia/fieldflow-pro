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
  Camera,
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
            { label: "CA mois", val: "18 247 €", color: "text-accent", trend: "+14.3%", sub: "" },
            { label: "Devis en attente", val: "5", color: "text-foreground", trend: "", sub: "dont 2 > 7j" },
            { label: "Interventions S.12", val: "11", color: "text-foreground", trend: "", sub: "3 SAV · 8 pose" },
            { label: "Impayées > 30j", val: "2", color: "text-destructive", trend: "", sub: "4 620 €" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border bg-background p-3">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{k.label}</p>
              <div className="flex items-end gap-1.5">
                <p className={`text-base font-bold font-mono leading-none ${k.color}`}>{k.val}</p>
                {k.trend && <span className="text-[9px] font-semibold text-accent leading-none mb-0.5">{k.trend}</span>}
              </div>
              {k.sub && <p className="text-[8px] text-muted-foreground/60 mt-1">{k.sub}</p>}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 rounded-xl border bg-background p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-semibold">Pipeline projets</p>
              <span className="text-[8px] text-muted-foreground/50 font-mono">PRJ-2026</span>
            </div>
            <div className="space-y-1.5">
              {[
                { name: "Morel — Poêle Invicta Onsen", num: "PRJ-0047", badge: "VT planifiée", color: "bg-amber-100 text-amber-800" },
                { name: "Durand — Insert Jøtul F520", num: "PRJ-0045", badge: "Devis envoyé", color: "bg-orange-100 text-orange-800" },
                { name: "Fabre — Chaudière Fröling", num: "PRJ-0043", badge: "Pose en cours", color: "bg-accent/15 text-accent" },
                { name: "Mercier — Tubage Ø180 inox", num: "PRJ-0041", badge: "MES planifiée", color: "bg-info/15 text-info" },
              ].map((p) => (
                <div key={p.num} className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[8px] font-mono text-muted-foreground/50 shrink-0">{p.num}</span>
                    <span className="text-[10px] font-medium truncate">{p.name}</span>
                  </div>
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
            <div className="flex justify-between mt-2 text-[7px] text-muted-foreground/40 font-mono">
              <span>Avr</span><span>Oct</span><span>Mar</span>
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
          <span className="text-[8px] rounded-full px-2 py-0.5 bg-info/10 text-info font-semibold">Entretien</span>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x">
        {[
          { day: "Lun 17", slots: [
            { time: "08:00–10:00", label: "Morel — Ramonage", type: "sav", tech: "P. Lefèvre" },
            { time: "14:00–16:30", label: "Fabre — Pose insert", type: "install", tech: "M. Roux" },
          ] },
          { day: "Mar 18", slots: [
            { time: "09:00–12:00", label: "Durand — VT chaudière", type: "install", tech: "P. Lefèvre" },
            { time: "14:30–16:00", label: "Garnier — Entretien annuel", type: "entretien", tech: "M. Roux" },
          ] },
          { day: "Mer 19", slots: [
            { time: "08:30–11:30", label: "Mercier — MES poêle", type: "install", tech: "P. Lefèvre" },
            { time: "15:00–16:30", label: "Bonnet — Diagnostic panne", type: "sav", tech: "M. Roux" },
          ] },
        ].map((d) => (
          <div key={d.day} className="p-3">
            <p className="text-[9px] font-semibold text-muted-foreground mb-2 text-center">{d.day}</p>
            <div className="space-y-1.5">
              {d.slots.map((s) => (
                <div key={s.time + s.label} className={`rounded-lg px-2 py-1.5 border-l-[3px] ${
                  s.type === "install" ? "border-l-primary bg-primary/[0.04]" :
                  s.type === "entretien" ? "border-l-info bg-info/[0.04]" :
                  "border-l-warning bg-warning/[0.04]"
                }`}>
                  <p className="text-[8px] font-mono text-muted-foreground">{s.time}</p>
                  <p className="text-[9px] font-medium mt-0.5 leading-snug">{s.label}</p>
                  <p className="text-[7px] text-muted-foreground/50 mt-0.5">{s.tech}</p>
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
        <div>
          <span className="text-[11px] font-semibold">Devis DEV-2026-0047</span>
          <span className="text-[9px] text-muted-foreground ml-2">v2 · Estimatif</span>
        </div>
        <span className="text-[8px] rounded-full px-2 py-0.5 bg-accent/15 text-accent font-semibold">Signé ✓</span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-dashed">
          <div>
            <p className="text-[9px] text-muted-foreground">Client</p>
            <p className="text-[11px] font-semibold">M. & Mme Morel</p>
            <p className="text-[8px] text-muted-foreground/60">12 chemin des Érables · 74000 Annecy</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground">Validité</p>
            <p className="text-[11px] font-medium">15/03 → 14/04/2026</p>
            <p className="text-[8px] text-muted-foreground/60">Signé le 22/03</p>
          </div>
        </div>
        <table className="w-full text-[9px] mb-3">
          <thead><tr className="text-muted-foreground text-left border-b"><th className="pb-1.5 font-medium">Désignation</th><th className="pb-1.5 font-medium text-center w-10">Qté</th><th className="pb-1.5 font-medium text-right w-16">P.U. HT</th><th className="pb-1.5 font-medium text-right w-8">TVA</th><th className="pb-1.5 font-medium text-right w-16">Total HT</th></tr></thead>
          <tbody>
            {[
              { desc: "Poêle à bois Invicta Onsen 8kW", ref: "INV-ONS-8", qty: "1", pu: "2 890 €", tva: "5.5%", total: "2 890,00 €" },
              { desc: "Kit raccordement inox Ø150mm", ref: "KIT-RCC-150", qty: "1", pu: "485 €", tva: "10%", total: "485,00 €" },
              { desc: "Plaque de sol verre trempé", ref: "ACC-PLS-80", qty: "1", pu: "189 €", tva: "10%", total: "189,00 €" },
              { desc: "Main d'œuvre pose + MES", ref: "—", qty: "8h", pu: "78 €/h", tva: "10%", total: "624,00 €" },
            ].map((l) => (
              <tr key={l.desc} className="border-b border-dashed">
                <td className="py-2">
                  <span className="font-medium">{l.desc}</span>
                  {l.ref !== "—" && <span className="text-[7px] text-muted-foreground/40 ml-1.5 font-mono">{l.ref}</span>}
                </td>
                <td className="py-2 text-center text-muted-foreground">{l.qty}</td>
                <td className="py-2 text-right font-mono text-muted-foreground">{l.pu}</td>
                <td className="py-2 text-right font-mono text-muted-foreground/50">{l.tva}</td>
                <td className="py-2 text-right font-mono font-semibold">{l.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end">
          <div className="w-48 space-y-1">
            <div className="flex justify-between text-[9px]"><span className="text-muted-foreground">Total HT</span><span className="font-mono font-medium">4 188,00 €</span></div>
            <div className="flex justify-between text-[8px]"><span className="text-muted-foreground/60">TVA 5.5% (fourniture)</span><span className="font-mono text-muted-foreground/60">158,95 €</span></div>
            <div className="flex justify-between text-[8px]"><span className="text-muted-foreground/60">TVA 10% (pose)</span><span className="font-mono text-muted-foreground/60">129,80 €</span></div>
            <div className="flex justify-between text-[11px] font-bold pt-1 border-t"><span>Total TTC</span><span className="font-mono text-accent">4 476,75 €</span></div>
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
      <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
        <span className="text-[11px] font-semibold">Relevé technique — Morel</span>
        <span className="text-[8px] rounded-full px-2 py-0.5 bg-accent/15 text-accent font-semibold">v1 · Brouillon</span>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <div className="flex gap-0.5 mb-1.5">
            {["Projet", "Habitation", "Pièce", "Conduit", "Fumisterie", "Ventilation", "Photos", "Validation"].map((s, i) => (
              <div key={s} className="flex-1 group relative">
                <div className={`h-1.5 rounded-full ${i <= 4 ? "bg-accent" : "bg-border"}`} />
                <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[6px] text-muted-foreground/40 whitespace-nowrap hidden group-hover:block">{s}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-[9px] text-muted-foreground font-medium">Section 5/8 — Fumisterie</p>
            <p className="text-[9px] text-accent font-semibold">62%</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { label: "Type de conduit", value: "Maçonné existant", filled: true },
            { label: "Section intérieure", value: "200 × 200 mm", filled: true },
            { label: "Hauteur tirage", value: "7.20 m", filled: true },
            { label: "Tubage requis", value: "Oui — Ø150 inox", filled: true },
            { label: "Distance sécurité", value: "", filled: false },
            { label: "Dévoiement", value: "", filled: false },
          ].map((f) => (
            <div key={f.label} className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 ${f.filled ? "bg-background" : "bg-muted/30 border-dashed"}`}>
              <span className="text-[10px] text-muted-foreground">{f.label}</span>
              {f.filled ? <span className="text-[10px] font-semibold flex items-center gap-1">{f.value}<CheckCircle2 className="h-3 w-3 text-accent" /></span> : <span className="text-[9px] text-muted-foreground/50 italic">À remplir</span>}
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <div className="flex-1 h-8 rounded-lg bg-muted/50 border border-dashed flex items-center justify-center text-[9px] text-muted-foreground gap-1">
            <Camera className="h-3 w-3" />
            Ajouter photo conduit
          </div>
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

      {/* ═══ PROBLEM — full-bleed immersive, staggered layout ═══ */}
      <section className="bg-primary text-primary-foreground pt-28 md:pt-36 pb-20 md:pb-28 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/[0.04] rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-warning/[0.03] rounded-full blur-[100px] pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-6 sm:px-10 relative z-10">
          <Reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary-foreground/25 mb-5">Le constat</p>
            <h2 className="text-4xl md:text-[3.5rem] lg:text-[4rem] font-bold leading-[1.04] max-w-3xl mb-6" style={{ letterSpacing: "-0.02em" }}>
              Vous jonglez entre carnets, tableurs et relances oubliées&nbsp;?
            </h2>
            <p className="text-primary-foreground/40 text-lg leading-relaxed max-w-lg mb-14">
              Chaque jour, des artisans perdent du temps et de l'argent à cause d'outils inadaptés.
            </p>
          </Reveal>
          
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              { stat: "2h", unit: "/jour", label: "perdues en admin", desc: "Devis dans les mails, relances oubliées, papiers égarés", offset: "md:mt-0" },
              { stat: "30", unit: "%", label: "de trajets évitables", desc: "Planning techniciens sur carnet, jamais synchronisé", offset: "md:mt-12" },
              { stat: "45", unit: "j", label: "délai moyen de paiement", desc: "Facturation en retard, trésorerie sous tension permanente", offset: "md:mt-4" },
            ].map((p, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className={`${p.offset}`}>
                  <div className="rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.02] p-6 md:p-8 backdrop-blur-sm hover:bg-primary-foreground/[0.04] transition-colors duration-300">
                    <div className="mb-4">
                      <span className="text-5xl md:text-6xl font-bold font-mono text-warning/80 leading-none">{p.stat}</span>
                      <span className="text-2xl font-bold text-warning/50 ml-0.5">{p.unit}</span>
                    </div>
                    <p className="text-[10px] text-primary-foreground/30 uppercase tracking-[0.15em] font-semibold mb-2">{p.label}</p>
                    <p className="text-sm text-primary-foreground/45 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURE 1 — DASHBOARD — Full-stage hero ═══ */}
      <section id="features" className="pt-20 md:pt-28 pb-0 relative">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <Reveal>
            <div className="mb-10 md:mb-14">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent mb-3">Tableau de bord</p>
              <h2 className="text-3xl md:text-[2.75rem] font-bold leading-[1.06] max-w-xl">
                Votre activité, en un coup d'œil
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-lg mt-4">
                CA temps réel, pipeline projets en 17 étapes, interventions planifiées, factures impayées — tout est là.
              </p>
            </div>
          </Reveal>
        </div>
        
        <Reveal delay={100}>
          <div className="relative mx-auto max-w-[90rem] px-4 sm:px-8 md:px-12">
            <div className="absolute inset-x-[5%] top-8 bottom-[-40px] bg-muted/60 rounded-3xl -z-20" />
            <div className="absolute inset-x-[3%] top-4 bottom-[-20px] bg-muted/30 rounded-3xl -z-30" />
            <div className="relative z-10 mb-[-60px] md:mb-[-100px]">
              <HeroMockup />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══ FEATURE 2 — PLANNING — Full-width mockup, text below ═══ */}
      <section className="pt-28 md:pt-40 pb-16 md:pb-24 bg-muted/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-border/40" />
        
        <div className="mx-auto max-w-7xl px-6 sm:px-10 relative z-10">
          <Reveal>
            <div className="mb-8 md:mb-12">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-warning mb-3">Planning</p>
              <h3 className="text-2xl md:text-[2.5rem] font-bold mb-4 leading-[1.08]">
                Votre planning, enfin lisible
              </h3>
            </div>
          </Reveal>
          
          {/* Full-width mockup with depth */}
          <Reveal delay={80}>
            <div className="relative">
              <div className="absolute inset-x-2 top-3 bottom-[-10px] bg-warning/[0.06] rounded-2xl -z-10" />
              <PlanningMockup />
            </div>
          </Reveal>
          
          {/* Features below mockup — 3 cols */}
          <Reveal delay={160}>
            <div className="grid md:grid-cols-3 gap-6 mt-10 md:mt-14">
              {[
                { title: "Vue semaine / jour", desc: "Basculez entre les vues pour organiser le travail de chaque technicien." },
                { title: "3 workstreams colorés", desc: "Installation, SAV et entretien — chaque type d'intervention se distingue visuellement." },
                { title: "Drag & drop intuitif", desc: "Déplacez les interventions pour réorganiser le planning en un geste." },
              ].map((f) => (
                <div key={f.title}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-warning" />
                    <h4 className="text-sm font-bold">{f.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ FEATURE 3 — DEVIS — Full-width mockup, text below ═══ */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute top-[10%] right-0 w-[50%] h-[70%] bg-accent/[0.03] rounded-l-[3rem] -z-10" />
        
        <div className="mx-auto max-w-7xl px-6 sm:px-10 relative z-10">
          <Reveal>
            <div className="mb-8 md:mb-12">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent mb-3">Facturation</p>
              <h3 className="text-2xl md:text-[2.5rem] font-bold mb-4 leading-[1.08]">
                Du devis à la facture, sans friction
              </h3>
            </div>
          </Reveal>
          
          {/* Full-width mockup with floating badge */}
          <Reveal delay={80}>
            <div className="relative">
              {/* Floating conversion badge */}
              <div className="absolute -right-2 md:right-4 top-[15%] z-20 hidden lg:block">
                <div className="rounded-xl border bg-card p-3.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.15)] backdrop-blur-sm">
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wider mb-0.5">Conversion auto</p>
                  <p className="text-[11px] font-semibold text-accent">DEV → FAC en 1 clic</p>
                </div>
              </div>
              
              <div className="absolute inset-x-2 top-3 bottom-[-10px] bg-accent/[0.05] rounded-2xl -z-10" />
              <QuoteMockup />
            </div>
          </Reveal>
          
          {/* Features below mockup — 4 cols */}
          <Reveal delay={160}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-10 md:mt-14">
              {["Catalogue produits intégré", "Double TVA 5.5% / 10%", "Numérotation DEV-YYYY-NNNN", "Signature électronique"].map((h) => (
                <div key={h} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                  <span className="font-medium">{h}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ SURVEY — immersive dark, full-width mockup centered ═══ */}
      <section className="bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/[0.04] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[20%] right-[-100px] w-[300px] h-[300px] bg-warning/[0.03] rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 pt-20 md:pt-28 pb-20 md:pb-28">
          <div className="mx-auto max-w-7xl px-6 sm:px-10 mb-10 md:mb-14">
            <Reveal>
              <div className="max-w-2xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent mb-4">Terrain</p>
                <h2 className="text-3xl md:text-[3rem] font-bold leading-[1.06] mb-5">
                  Le relevé technique<br />qui ne perd rien
                </h2>
                <p className="text-primary-foreground/50 text-base leading-relaxed max-w-lg">
                  55 points de contrôle en 8 sections guidées. Remplissez sur chantier, même hors ligne. Zéro papier perdu.
                </p>
              </div>
            </Reveal>
          </div>
          
          {/* Full-width survey mockup */}
          <div className="mx-auto max-w-5xl px-4 sm:px-8">
            <Reveal delay={100}>
              <div className="relative">
                <div className="absolute -inset-4 bg-accent/[0.04] rounded-3xl -z-10" />
                <SurveyMockup />
              </div>
            </Reveal>
            
            {/* Feature pills — horizontal row below mockup */}
            <Reveal delay={200}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 md:mt-12">
                {[
                  { icon: ClipboardCheck, label: "8 sections guidées" },
                  { icon: Zap, label: "Sauvegarde auto" },
                  { icon: Camera, label: "Photos intégrées" },
                  { icon: Clock, label: "Optimisé terrain" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 rounded-xl border border-primary-foreground/[0.08] bg-primary-foreground/[0.03] px-4 py-3 hover:bg-primary-foreground/[0.06] transition-colors duration-300">
                    <item.icon className="h-4 w-4 text-accent shrink-0" />
                    <span className="text-[12px] font-semibold text-primary-foreground/70">{item.label}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ HOW — asymmetric timeline, not 3 equal columns ═══ */}
      <section id="how" className="py-28 md:py-36 relative">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <Reveal>
            <div className="mb-16 md:mb-20">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent mb-3">Démarrage</p>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ lineHeight: "1.08" }}>En route en 3 étapes</h2>
            </div>
          </Reveal>
          
          {/* Vertical timeline — left-aligned, not centered */}
          <div className="relative">
            {/* Vertical line */}
            <div className="hidden md:block absolute left-[28px] top-0 bottom-0 w-px bg-border" />
            
            <div className="space-y-12 md:space-y-16">
              {[
                { num: "01", title: "Créez votre compte", desc: "En 2 minutes, sans carte bancaire. Votre espace est prêt immédiatement.", color: "bg-accent text-accent-foreground", borderColor: "border-accent/20" },
                { num: "02", title: "Importez vos données", desc: "Clients, projets, catalogue produits — importez un CSV ou saisissez manuellement. LIGNIA s'adapte à votre existant.", color: "bg-primary text-primary-foreground", borderColor: "border-primary/20" },
                { num: "03", title: "Pilotez votre activité", desc: "Planifiez, chiffrez et facturez depuis un seul endroit. Vos techniciens accèdent au planning depuis leur mobile.", color: "bg-warning text-warning-foreground", borderColor: "border-warning/20" },
              ].map((s, i) => (
                <Reveal key={i} delay={i * 120}>
                  <div className="flex gap-6 md:gap-10 items-start">
                    {/* Step number — on the timeline */}
                    <div className={`shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl ${s.color} text-lg font-bold font-mono shadow-sm relative z-10`}>
                      {s.num}
                    </div>
                    {/* Content */}
                    <div className={`flex-1 rounded-2xl border ${s.borderColor} bg-card p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)]`}>
                      <h3 className="text-lg md:text-xl font-bold mb-2">{s.title}</h3>
                      <p className="text-muted-foreground leading-relaxed max-w-lg">{s.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIAL — integrated into the rhythm, not isolated ═══ */}
      <section className="pb-8 pt-0">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <Reveal>
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              {/* Quote — takes 7 cols */}
              <div className="lg:col-span-7">
                <div className="relative rounded-2xl bg-muted/40 p-8 md:p-12 lg:p-14">
                  {/* Accent line */}
                  <div className="absolute top-8 left-8 md:left-12 lg:left-14 w-1 h-14 rounded-full bg-accent" />
                  <div className="pl-7">
                    <blockquote className="text-xl md:text-2xl lg:text-[1.75rem] font-semibold text-foreground mb-8 leading-snug" style={{ textWrap: "balance" } as React.CSSProperties}>
                      Avant LIGNIA, mes devis traînaient une semaine. Maintenant je les envoie le soir même depuis le chantier.
                    </blockquote>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">PL</div>
                      <div>
                        <p className="text-sm font-semibold">Patrick Lefèvre</p>
                        <p className="text-xs text-muted-foreground">Artisan chauffagiste · Annecy (74)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Stats summary — 5 cols */}
              <div className="lg:col-span-5 space-y-4">
                {[
                  { value: "200+", label: "artisans équipés" },
                  { value: "4.8/5", label: "satisfaction client" },
                  { value: "15 min", label: "prise en main" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-4 rounded-xl border bg-card p-4">
                    <span className="text-2xl font-bold font-mono text-accent">{s.value}</span>
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ FINAL CTA — immersive, product behind ═══ */}
      <Reveal>
        <section className="bg-primary text-primary-foreground py-28 md:py-36 relative overflow-hidden mt-16">
          {/* Large decorative elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-accent/[0.05] rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-warning/[0.03] rounded-full blur-[80px] pointer-events-none" />
          
          <div className="mx-auto max-w-4xl px-6 sm:px-10 text-center relative z-10">
            <Reveal>
              <h2 className="text-3xl md:text-[3rem] font-bold mb-5 leading-[1.06]">
                Prêt à structurer<br />votre activité&nbsp;?
              </h2>
            </Reveal>
            <Reveal delay={80}>
              <p className="text-primary-foreground/40 mb-10 max-w-md mx-auto text-base leading-relaxed">
                Essayez LIGNIA gratuitement pendant 14 jours. Aucune carte bancaire requise.
              </p>
            </Reveal>
            <Reveal delay={160}>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_32px_-4px_rgba(0,0,0,0.15)] active:scale-[0.97] transition-all text-sm font-semibold px-8 h-12 rounded-xl" asChild>
                  <Link to="/dashboard">Essai gratuit 14 jours<ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="border-primary-foreground/20 bg-primary-foreground/[0.06] text-primary-foreground hover:bg-primary-foreground/15 active:scale-[0.97] transition-all text-sm font-medium h-12 rounded-xl">
                  Demander une démo
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </Reveal>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t py-12">
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
