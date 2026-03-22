import { useState } from "react";
import {
  Icon,
  IconPoele,
  IconCheminee,
  IconTubage,
  IconRamonage,
  IconChaudiere,
  IconInsert,
  IconConduit,
  IconFumisterie,
  IconPoeleGranules,
  IconPoeleBuches,
  IconFoyerFerme,
  IconFoyerOuvert,
  IconPlaqueSol,
  IconProtectionMurale,
  IconArriveeAir,
  IconDistributionAir,
  IconChapeauParePluie,
  IconToitureSouche,
} from "@/components/icons";
import { Wrench, Flame, ThermometerSun, ShieldCheck, Copy, Check, Sparkles } from "lucide-react";
import type { IconProps } from "@/components/icons/Icon";
import { cn } from "@/lib/utils";

/* ── Data ── */

const tradeIcons = [
  { icon: IconPoele, name: "IconPoele", label: "Poêle" },
  { icon: IconPoeleGranules, name: "IconPoeleGranules", label: "Poêle granulés" },
  { icon: IconPoeleBuches, name: "IconPoeleBuches", label: "Poêle bûches" },
  { icon: IconCheminee, name: "IconCheminee", label: "Cheminée" },
  { icon: IconFoyerFerme, name: "IconFoyerFerme", label: "Foyer fermé" },
  { icon: IconFoyerOuvert, name: "IconFoyerOuvert", label: "Foyer ouvert" },
  { icon: IconInsert, name: "IconInsert", label: "Insert" },
  { icon: IconChaudiere, name: "IconChaudiere", label: "Chaudière" },
  { icon: IconTubage, name: "IconTubage", label: "Tubage" },
  { icon: IconConduit, name: "IconConduit", label: "Conduit" },
  { icon: IconRamonage, name: "IconRamonage", label: "Ramonage" },
  { icon: IconFumisterie, name: "IconFumisterie", label: "Fumisterie" },
  { icon: IconPlaqueSol, name: "IconPlaqueSol", label: "Plaque de sol" },
  { icon: IconProtectionMurale, name: "IconProtectionMurale", label: "Protection murale" },
  { icon: IconArriveeAir, name: "IconArriveeAir", label: "Arrivée d'air" },
  { icon: IconDistributionAir, name: "IconDistributionAir", label: "Distribution air chaud" },
  { icon: IconChapeauParePluie, name: "IconChapeauParePluie", label: "Chapeau pare-pluie" },
  { icon: IconToitureSouche, name: "IconToitureSouche", label: "Toiture / Souche" },
];

const lucideIcons = [
  { icon: Wrench, name: "Wrench", label: "Outil" },
  { icon: Flame, name: "Flame", label: "Flamme" },
  { icon: ThermometerSun, name: "ThermometerSun", label: "Température" },
  { icon: ShieldCheck, name: "ShieldCheck", label: "Garantie" },
];

const sizes: IconProps["size"][] = ["xs", "sm", "md", "lg", "xl"];
const colors: IconProps["color"][] = ["default", "muted", "primary", "accent", "success", "warning", "info", "destructive"];
const bgs: IconProps["bg"][] = ["default", "primary", "accent", "success", "warning", "info", "destructive"];
const animations: IconProps["animation"][] = ["none", "spin", "pulse", "bounce", "hover-rotate", "hover-scale", "hover-shake"];

/* ── Small helpers ── */

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1400); }}
      className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-background/80 backdrop-blur border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-all duration-200 active:scale-95"
      title="Copier le snippet"
    >
      {ok ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-all duration-200 active:scale-95",
        active
          ? "bg-primary text-primary-foreground shadow-[0_2px_8px_hsl(var(--primary)/0.25)]"
          : "bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

/* ── Icon card ── */

function IconCard({
  icon, label, importName,
  size, color, animation, contained, bg,
}: {
  icon: React.ComponentType<any>; label: string; importName: string;
  size: IconProps["size"]; color: IconProps["color"]; animation: IconProps["animation"];
  contained: boolean; bg: IconProps["bg"];
}) {
  const [hovered, setHovered] = useState(false);
  const snippet = contained
    ? `<Icon icon={${importName}} size="${size}" color="${color}" contained bg="${bg}" />`
    : `<Icon icon={${importName}} size="${size}" color="${color}" />`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex flex-col items-center gap-3 rounded-2xl border border-transparent bg-card p-5 transition-all duration-300 hover:border-border hover:shadow-[0_4px_24px_hsl(var(--foreground)/0.06)] cursor-default"
    >
      <Icon icon={icon} size={size} color={color} animation={animation} contained={contained} bg={bg} />
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-200">
        {label}
      </span>

      {/* Copy button on hover */}
      <div className={cn(
        "absolute top-2 right-2 transition-all duration-200",
        hovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
      )}>
        <CopyBtn text={snippet} />
      </div>
    </div>
  );
}

/* ── Main page ── */

export default function IconShowcase() {
  const [activeSize, setActiveSize] = useState<IconProps["size"]>("md");
  const [activeColor, setActiveColor] = useState<IconProps["color"]>("accent");
  const [activeAnim, setActiveAnim] = useState<IconProps["animation"]>("none");
  const [contained, setContained] = useState(true);
  const [activeBg, setActiveBg] = useState<IconProps["bg"]>("accent");

  return (
    <div className="space-y-10 max-w-5xl mx-auto">

      {/* ── Hero header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-primary p-8 md:p-10">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }} />

        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 text-accent-foreground px-3 py-1 text-[11px] font-semibold tracking-wide mb-4">
              <Sparkles className="h-3 w-3" />
              DESIGN SYSTEM
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground tracking-tight" style={{ lineHeight: "1.15" }}>
              Icônes métier
            </h1>
            <p className="text-sm text-primary-foreground/60 mt-2 max-w-md">
              {tradeIcons.length} icônes spécialisées chauffage & bois, plus un wrapper unifié compatible avec toute la librairie Lucide.
            </p>
          </div>

          {/* Mini preview of all icons */}
          <div className="flex items-center gap-3 bg-primary-foreground/[0.08] backdrop-blur-sm rounded-2xl p-4">
            {tradeIcons.slice(0, 5).map((item) => (
              <div key={item.name} className="text-primary-foreground/70">
                <Icon icon={item.icon} size="sm" color="default" />
              </div>
            ))}
            <span className="text-primary-foreground/40 text-xs font-medium">+{tradeIcons.length - 5}</span>
          </div>
        </div>
      </div>

      {/* ── Playground ── */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-accent" />
          <h2 className="text-lg font-bold tracking-tight">Playground</h2>
        </div>

        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          {/* Controls */}
          <div className="p-5 space-y-4 border-b bg-muted/20">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">Taille</p>
                <div className="flex flex-wrap gap-0.5">{sizes.map((s) => <Pill key={s} label={s!} active={activeSize === s} onClick={() => setActiveSize(s)} />)}</div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">Couleur</p>
                <div className="flex flex-wrap gap-0.5">{colors.map((c) => <Pill key={c} label={c!} active={activeColor === c} onClick={() => setActiveColor(c)} />)}</div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">Animation</p>
                <div className="flex flex-wrap gap-0.5">{animations.map((a) => <Pill key={a} label={a!} active={activeAnim === a} onClick={() => setActiveAnim(a)} />)}</div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">Fond</p>
                <div className="flex flex-wrap gap-0.5">
                  <Pill label={contained ? "Contained ✓" : "Contained"} active={contained} onClick={() => setContained(!contained)} />
                  {contained && bgs.map((b) => <Pill key={b} label={b!} active={activeBg === b} onClick={() => setActiveBg(b)} />)}
                </div>
              </div>
            </div>
          </div>

          {/* Icons preview */}
          <div className="p-6 space-y-8">
            {/* Trade icons */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Métier · {tradeIcons.length} icônes</p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {tradeIcons.map((item) => (
                  <IconCard key={item.name} icon={item.icon} label={item.label} importName={item.name}
                    size={activeSize} color={activeColor} animation={activeAnim} contained={contained} bg={activeBg} />
                ))}
              </div>
            </div>

            {/* Lucide */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lucide · via wrapper</p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {lucideIcons.map((item) => (
                  <IconCard key={item.name} icon={item.icon} label={item.label} importName={item.name}
                    size={activeSize} color={activeColor} animation={activeAnim} contained={contained} bg={activeBg} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Scale & Palette ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sizes */}
        <section className="rounded-2xl border bg-card shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-info" />
            <h2 className="text-lg font-bold tracking-tight">Échelle</h2>
          </div>
          <div className="flex items-end justify-around py-4">
            {sizes.map((s) => (
              <div key={s} className="flex flex-col items-center gap-3">
                <Icon icon={IconPoele} size={s} color="accent" contained bg="accent" />
                <span className="text-[10px] font-mono font-bold text-muted-foreground/70 uppercase">{s}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Colors */}
        <section className="rounded-2xl border bg-card shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-warning" />
            <h2 className="text-lg font-bold tracking-tight">Palette</h2>
          </div>
          <div className="flex flex-wrap justify-around gap-4 py-4">
            {colors.filter((c) => c !== "default" && c !== "muted").map((c) => (
              <div key={c} className="flex flex-col items-center gap-3">
                <Icon icon={IconCheminee} size="lg" color={c} contained bg={c as IconProps["bg"]} />
                <span className="text-[10px] font-mono font-bold text-muted-foreground/70">{c}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Code snippet ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-muted-foreground/30" />
          <h2 className="text-lg font-bold tracking-tight">Utilisation</h2>
        </div>

        <div className="relative rounded-2xl border bg-primary overflow-hidden group">
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <CopyBtn text={`import { Icon, IconPoele } from "@/components/icons";\n<Icon icon={IconPoele} size="md" color="accent" contained bg="accent" />`} />
          </div>
          <pre className="p-6 font-mono text-[13px] leading-[1.7] text-primary-foreground/80 overflow-x-auto">
            <code>{`import { Icon, IconPoele } from "@/components/icons"
import { Wrench } from "lucide-react"

// Icône métier
<Icon icon={IconPoele} size="md" color="accent" />

// Avec fond
<Icon icon={IconPoele} size="lg" color="accent" contained bg="accent" />

// Animation hover
<Icon icon={Wrench} size="sm" color="warning" animation="hover-rotate" />

// Lucide via wrapper unifié
<Icon icon={Wrench} size="md" color="primary" contained />`}</code>
          </pre>
        </div>
      </section>
    </div>
  );
}
