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
} from "@/components/icons";
import { Wrench, Flame, ThermometerSun, ShieldCheck, Copy, Check } from "lucide-react";
import type { IconProps } from "@/components/icons/Icon";
import { cn } from "@/lib/utils";

const tradeIcons = [
  { icon: IconPoele, name: "IconPoele", label: "Poêle", importName: "IconPoele" },
  { icon: IconCheminee, name: "IconCheminee", label: "Cheminée", importName: "IconCheminee" },
  { icon: IconTubage, name: "IconTubage", label: "Tubage", importName: "IconTubage" },
  { icon: IconRamonage, name: "IconRamonage", label: "Ramonage", importName: "IconRamonage" },
  { icon: IconChaudiere, name: "IconChaudiere", label: "Chaudière", importName: "IconChaudiere" },
  { icon: IconInsert, name: "IconInsert", label: "Insert", importName: "IconInsert" },
  { icon: IconConduit, name: "IconConduit", label: "Conduit", importName: "IconConduit" },
  { icon: IconFumisterie, name: "IconFumisterie", label: "Fumisterie", importName: "IconFumisterie" },
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

/* ── Helpers ── */

function CopySnippet({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      title="Copier"
    >
      {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 active:scale-[0.96]",
        active
          ? "bg-primary text-primary-foreground shadow-[0_1px_3px_hsl(var(--primary)/0.3)]"
          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function IconTile({
  icon,
  label,
  importName,
  size,
  color,
  animation,
  contained,
  bg,
}: {
  icon: React.ComponentType<any>;
  label: string;
  importName: string;
  size: IconProps["size"];
  color: IconProps["color"];
  animation: IconProps["animation"];
  contained: boolean;
  bg: IconProps["bg"];
}) {
  const snippet = `<Icon icon={${importName}} size="${size}" color="${color}" />`;
  return (
    <div className="group flex flex-col items-center gap-2.5 rounded-xl p-4 transition-all duration-200 hover:bg-muted/40">
      <div className="relative">
        <Icon icon={icon} size={size} color={color} animation={animation} contained={contained} bg={bg} />
        <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopySnippet text={snippet} />
        </div>
      </div>
      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
    </div>
  );
}

export default function IconShowcase() {
  const [activeSize, setActiveSize] = useState<IconProps["size"]>("md");
  const [activeColor, setActiveColor] = useState<IconProps["color"]>("default");
  const [activeAnim, setActiveAnim] = useState<IconProps["animation"]>("none");
  const [contained, setContained] = useState(false);
  const [activeBg, setActiveBg] = useState<IconProps["bg"]>("default");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-accent uppercase tracking-widest mb-1">Design System</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Icônes métier
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
            {tradeIcons.length} icônes spécialisées chauffage / bois + wrapper unifié compatible Lucide
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent px-3 py-1 text-xs font-medium">
            {tradeIcons.length} custom
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            + Lucide
          </span>
        </div>
      </div>

      {/* Playground Controls */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-2 w-2 rounded-full bg-accent" />
          <h2 className="text-sm font-semibold">Playground</h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <ControlGroup label="Taille">
            {sizes.map((s) => (
              <Chip key={s} label={s!} active={activeSize === s} onClick={() => setActiveSize(s)} />
            ))}
          </ControlGroup>

          <ControlGroup label="Couleur">
            {colors.map((c) => (
              <Chip key={c} label={c!} active={activeColor === c} onClick={() => setActiveColor(c)} />
            ))}
          </ControlGroup>

          <ControlGroup label="Animation">
            {animations.map((a) => (
              <Chip key={a} label={a!} active={activeAnim === a} onClick={() => setActiveAnim(a)} />
            ))}
          </ControlGroup>

          <ControlGroup label="Fond">
            <Chip label={contained ? "Contained ✓" : "Contained"} active={contained} onClick={() => setContained(!contained)} />
            {contained && bgs.map((b) => (
              <Chip key={b} label={b!} active={activeBg === b} onClick={() => setActiveBg(b)} />
            ))}
          </ControlGroup>
        </div>
      </div>

      {/* Trade Icons Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Icônes spécialisées</h2>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
          {tradeIcons.map((item) => (
            <IconTile
              key={item.name}
              icon={item.icon}
              label={item.label}
              importName={item.importName}
              size={activeSize}
              color={activeColor}
              animation={activeAnim}
              contained={contained}
              bg={activeBg}
            />
          ))}
        </div>
      </div>

      {/* Lucide via wrapper */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Lucide via wrapper</h2>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
          {lucideIcons.map((item) => (
            <IconTile
              key={item.name}
              icon={item.icon}
              label={item.label}
              importName={item.name}
              size={activeSize}
              color={activeColor}
              animation={activeAnim}
              contained={contained}
              bg={activeBg}
            />
          ))}
        </div>
      </div>

      {/* Size comparison */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Échelle des tailles</h2>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-end justify-center gap-8">
            {sizes.map((s) => (
              <div key={s} className="flex flex-col items-center gap-3">
                <Icon icon={IconPoele} size={s} color="accent" contained bg="accent" />
                <span className="text-[11px] font-mono text-muted-foreground">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Color palette */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Palette sémantique</h2>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap justify-center gap-5">
            {colors.map((c) => (
              <div key={c} className="flex flex-col items-center gap-3">
                <Icon
                  icon={IconCheminee}
                  size="lg"
                  color={c}
                  contained
                  bg={c === "default" || c === "muted" ? "default" : (c as IconProps["bg"])}
                />
                <span className="text-[11px] font-medium text-muted-foreground">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Usage snippet */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Utilisation</h2>
        <div className="rounded-2xl border bg-muted/20 p-6 relative group">
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopySnippet text={`import { Icon, IconPoele } from "@/components/icons";\n\n<Icon icon={IconPoele} size="md" color="accent" contained bg="accent" />`} />
          </div>
          <pre className="font-mono text-xs leading-relaxed text-muted-foreground overflow-x-auto">
{`import { Icon, IconPoele } from "@/components/icons";
import { Wrench } from "lucide-react";

// Icône métier simple
<Icon icon={IconPoele} size="md" color="accent" />

// Avec fond coloré
<Icon icon={IconPoele} size="lg" color="accent" contained bg="accent" />

// Animation au hover
<Icon icon={Wrench} size="sm" color="warning" animation="hover-rotate" />

// Icône Lucide via le wrapper unifié
<Icon icon={Wrench} size="md" color="primary" contained />`}
          </pre>
        </div>
      </div>
    </div>
  );
}
