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
import { Wrench, Flame, ThermometerSun, ShieldCheck } from "lucide-react";
import type { IconProps } from "@/components/icons/Icon";
import { cn } from "@/lib/utils";

const tradeIcons = [
  { icon: IconPoele, name: "IconPoele", label: "Poêle" },
  { icon: IconCheminee, name: "IconCheminee", label: "Cheminée" },
  { icon: IconTubage, name: "IconTubage", label: "Tubage" },
  { icon: IconRamonage, name: "IconRamonage", label: "Ramonage" },
  { icon: IconChaudiere, name: "IconChaudiere", label: "Chaudière" },
  { icon: IconInsert, name: "IconInsert", label: "Insert" },
  { icon: IconConduit, name: "IconConduit", label: "Conduit" },
  { icon: IconFumisterie, name: "IconFumisterie", label: "Fumisterie" },
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.97]",
        active
          ? "bg-foreground text-background shadow-sm"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      {label}
    </button>
  );
}

export default function IconShowcase() {
  const [activeSize, setActiveSize] = useState<IconProps["size"]>("md");
  const [activeColor, setActiveColor] = useState<IconProps["color"]>("default");
  const [activeAnim, setActiveAnim] = useState<IconProps["animation"]>("none");
  const [contained, setContained] = useState(false);
  const [activeBg, setActiveBg] = useState<IconProps["bg"]>("default");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Bibliothèque d'icônes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Icônes métier custom + wrapper unifié avec variantes
          </p>
        </div>

        {/* Controls */}
        <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Taille</p>
            <div className="flex flex-wrap gap-1.5">
              {sizes.map((s) => (
                <Chip key={s} label={s!} active={activeSize === s} onClick={() => setActiveSize(s)} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Couleur</p>
            <div className="flex flex-wrap gap-1.5">
              {colors.map((c) => (
                <Chip key={c} label={c!} active={activeColor === c} onClick={() => setActiveColor(c)} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Animation</p>
            <div className="flex flex-wrap gap-1.5">
              {animations.map((a) => (
                <Chip key={a} label={a!} active={activeAnim === a} onClick={() => setActiveAnim(a)} />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setContained(!contained)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.97]",
                contained
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Contained: {contained ? "ON" : "OFF"}
            </button>
            {contained && (
              <div className="flex flex-wrap gap-1.5">
                {bgs.map((b) => (
                  <Chip key={b} label={b!} active={activeBg === b} onClick={() => setActiveBg(b)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Trade icons */}
        <Section title="Icônes métier">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
            {tradeIcons.map((item) => (
              <div key={item.name} className="flex flex-col items-center gap-2 group">
                <Icon
                  icon={item.icon}
                  size={activeSize}
                  color={activeColor}
                  animation={activeAnim}
                  contained={contained}
                  bg={activeBg}
                />
                <span className="text-[11px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Lucide icons through wrapper */}
        <Section title="Icônes Lucide via le wrapper">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
            {lucideIcons.map((item) => (
              <div key={item.name} className="flex flex-col items-center gap-2 group">
                <Icon
                  icon={item.icon}
                  size={activeSize}
                  color={activeColor}
                  animation={activeAnim}
                  contained={contained}
                  bg={activeBg}
                />
                <span className="text-[11px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* All sizes comparison */}
        <Section title="Comparaison des tailles">
          <div className="flex items-end gap-6">
            {sizes.map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <Icon icon={IconPoele} size={s} color="accent" contained bg="accent" />
                <span className="text-[11px] text-muted-foreground font-mono">{s}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* All colors */}
        <Section title="Palette de couleurs">
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => (
              <div key={c} className="flex flex-col items-center gap-2">
                <Icon
                  icon={IconCheminee}
                  size="md"
                  color={c}
                  contained
                  bg={c === "default" || c === "muted" ? "default" : (c as IconProps["bg"])}
                />
                <span className="text-[11px] text-muted-foreground">{c}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Code example */}
        <Section title="Utilisation">
          <div className="rounded-xl border bg-muted/30 p-5 font-mono text-xs leading-relaxed text-muted-foreground overflow-x-auto">
            <pre>{`import { Icon, IconPoele } from "@/components/icons";
import { Wrench } from "lucide-react";

// Simple
<Icon icon={IconPoele} size="md" color="accent" />

// Avec fond
<Icon icon={IconPoele} size="lg" color="accent" contained bg="accent" />

// Avec animation au hover
<Icon icon={Wrench} size="sm" color="warning" animation="hover-rotate" />

// Icône Lucide standard
<Icon icon={Wrench} size="md" color="primary" contained />`}</pre>
          </div>
        </Section>
      </div>
    </div>
  );
}
