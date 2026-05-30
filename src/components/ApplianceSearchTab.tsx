import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────
export interface HeatingAppliance {
  id: string;
  normalized_brand: string;
  normalized_model: string;
  commercial_name: string | null;
  appliance_type: string | null;
  fuel_type: string | null;
  nominal_power_kw: number | null;
  flamme_verte_stars: number | null;
  flamme_verte_status: string | null;
  flue_diameter_mm: number | null;
  // Prix public non présent dans heating_appliances — à 0 par défaut
  // Le vendeur renseignera manuellement le prix sur la ligne
}

interface ApplianceSearchTabProps {
  /** Terme de recherche, contrôlé par le parent (CatalogPopover) */
  term: string;
  /** tenant_id récupéré depuis le contexte — obligatoire pour la RPC */
  tenantId: string | null;
  /** Callback au clic sur un appareil */
  onSelect: (appliance: HeatingAppliance) => void;
}

// ─── Helper : étoiles Flamme Verte ───────────────────────────────
function FlammeVerteStars({ stars }: { stars: number | null }) {
  if (!stars || stars <= 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="text-warning" title={`Flamme Verte ${stars} étoile${stars > 1 ? "s" : ""}`}>
      {"★".repeat(stars)}{"☆".repeat(Math.max(0, 7 - stars))}
    </span>
  );
}

// ─── Composant principal ──────────────────────────────────────────
export function ApplianceSearchTab({ term, tenantId, onSelect }: ApplianceSearchTabProps) {
  const [results, setResults] = useState<HeatingAppliance[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Debounce 250ms pour éviter trop d'appels RPC
    if (abortRef.current) clearTimeout(abortRef.current);

    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    abortRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("search_heating_appliances", {
          p_tenant_id: tenantId ?? "00000000-0000-0000-0000-000000000000",
          p_query: term,
          p_brand_filter: null,
          p_appliance_type: null,
          p_fuel_type: null,
          p_eligible_only: false,
          p_limit: 15,
        });
        if (error) throw error;
        setResults((data as HeatingAppliance[]) ?? []);
      } catch (err) {
        console.error("[ApplianceSearchTab] search_heating_appliances error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (abortRef.current) clearTimeout(abortRef.current);
    };
  }, [term, tenantId]);

  // ── État : recherche vide ────────────────────────────────────────
  if (term.length < 2) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground">
        Tapez une marque ou un modèle…
      </div>
    );
  }

  // ── État : chargement ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-3 space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-1/3" />
            {i < 2 && <Separator className="!my-2" />}
          </div>
        ))}
      </div>
    );
  }

  // ── État : aucun résultat ────────────────────────────────────────
  if (results.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground">
        Aucun appareil trouvé
      </div>
    );
  }

  // ── Résultats ───────────────────────────────────────────────────
  return (
    <CommandGroup className="px-1 py-1">
      {results.map((appliance) => {
        const title = [
          appliance.normalized_brand,
          appliance.commercial_name || appliance.normalized_model,
        ]
          .filter(Boolean)
          .join(" ");

        const powerLabel = appliance.nominal_power_kw
          ? `${appliance.nominal_power_kw} kW`
          : null;

        const specs = [powerLabel].filter((x): x is string => x !== null);

        return (
          <CommandItem
            key={appliance.id}
            value={`appliance__${appliance.id}__${title}`}
            onSelect={() => onSelect(appliance)}
            className="flex flex-col items-stretch gap-1 px-2.5 py-2 cursor-pointer aria-selected:bg-accent/40 data-[selected=true]:bg-accent/40 rounded-md"
          >
            {/* Ligne 1 — Marque + Modèle (bold) */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
                {title}
              </span>
            </div>

            {/* Ligne 2 — Puissance · Flamme Verte */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {specs.length > 0 && (
                <span className="font-mono">{specs.join(" · ")}</span>
              )}
              {specs.length > 0 && appliance.flamme_verte_stars != null && (
                <span className="text-muted-foreground">·</span>
              )}
              {appliance.flamme_verte_stars != null && (
                <span className="flex items-center gap-1">
                  <FlammeVerteStars stars={appliance.flamme_verte_stars} />
                </span>
              )}
            </div>

            {/* Ligne 3 — Prix (à saisir manuellement) + type combustible */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground truncate">
                {appliance.fuel_type && (
                  <span className="capitalize">{appliance.fuel_type.replace("_", " ")}</span>
                )}
                {appliance.fuel_type && appliance.appliance_type && " · "}
                {appliance.appliance_type && (
                  <span>{appliance.appliance_type.replace("_", " ")}</span>
                )}
              </span>
              <span className="font-mono tabular-nums text-success shrink-0 font-medium">
                Prix à renseigner
              </span>
            </div>
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
}
