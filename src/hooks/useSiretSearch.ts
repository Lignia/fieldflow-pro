import { useState, useCallback, useRef } from "react";

export interface CompanyResult {
  nom_complet: string;
  siret: string;
  siren: string;
  adresse: string;
  ville: string;
  code_postal: string;
  nature_juridique: string;
  activite_principale: string;
  staff_range: string;
  company_created_at: string;
}

const API_BASE = "https://recherche-entreprises.api.gouv.fr/search";

// APE codes section F (construction) and 43.xx (installation)
function isBatimentApe(ape: string): boolean {
  if (!ape) return false;
  return ape.startsWith("43") || ape.startsWith("41") || ape.startsWith("42");
}

export function useSiretSearch() {
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [apeWarning, setApeWarning] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 3) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: query,
          per_page: "8",
          etat_administratif: "A",
          minimal: "true",
        });
        const res = await fetch(`${API_BASE}?${params}`, {
          headers: { "User-Agent": "LIGNIA-onboarding/1.0" },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();

        const mapped: CompanyResult[] = (data.results || []).map((r: any) => ({
          nom_complet: r.nom_complet || "",
          siret: r.siege?.siret || "",
          siren: r.siren || "",
          adresse: r.siege?.adresse || "",
          ville: r.siege?.libelle_commune || "",
          code_postal: r.siege?.code_postal || "",
          nature_juridique: r.nature_juridique || "",
          activite_principale: r.activite_principale || "",
          staff_range: r.tranche_effectif_salarie || "",
          company_created_at: r.date_creation || "",
        }));

        // Sort: bâtiment APE codes first
        mapped.sort((a, b) => {
          const aB = isBatimentApe(a.activite_principale) ? 0 : 1;
          const bB = isBatimentApe(b.activite_principale) ? 0 : 1;
          return aB - bB;
        });

        setResults(mapped);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
  }, []);

  const lookupSiret = useCallback(async (siret: string): Promise<CompanyResult | null> => {
    if (!/^\d{14}$/.test(siret)) return null;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}?q=${encodeURIComponent(siret)}&per_page=1`);
      if (!res.ok) return null;
      const data = await res.json();
      const r = data.results?.[0];
      if (!r) return null;

      const result: CompanyResult = {
        nom_complet: r.nom_complet || "",
        siret: r.siege?.siret || "",
        siren: r.siren || "",
        adresse: r.siege?.adresse || "",
        ville: r.siege?.libelle_commune || "",
        code_postal: r.siege?.code_postal || "",
        nature_juridique: r.nature_juridique || "",
        activite_principale: r.activite_principale || "",
        staff_range: r.tranche_effectif_salarie || "",
        company_created_at: r.date_creation || "",
      };

      checkApe(result.activite_principale);
      return result;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkApe = useCallback((ape: string) => {
    if (ape && !isBatimentApe(ape)) {
      setApeWarning(
        `LIGNIA est conçu pour les artisans du bâtiment. Votre code APE (${ape}) correspond à un autre secteur. Vous pouvez continuer si vous êtes bien artisan.`
      );
    } else {
      setApeWarning(null);
    }
  }, []);

  return { results, loading, apeWarning, search, lookupSiret, checkApe, setResults, isBatimentApe };
}

export { isBatimentApe };
