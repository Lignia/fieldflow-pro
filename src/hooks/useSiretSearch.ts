import { useState, useCallback, useRef } from "react";

export interface CompanyResult {
  nom_complet: string;
  siret: string;
  adresse: string;
  nature_juridique: string;
  activite_principale: string;
  ville: string;
}

const API_BASE = "https://recherche-entreprises.api.gouv.fr/search";

export function useSiretSearch() {
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [apeWarning, setApeWarning] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}?q=${encodeURIComponent(query)}&per_page=5`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        const mapped: CompanyResult[] = (data.results || []).map((r: any) => ({
          nom_complet: r.nom_complet || "",
          siret: r.siege?.siret || "",
          adresse: r.siege?.adresse || "",
          nature_juridique: r.nature_juridique || "",
          activite_principale: r.activite_principale || "",
          ville: r.siege?.libelle_commune || "",
        }));
        setResults(mapped);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
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
        adresse: r.siege?.adresse || "",
        nature_juridique: r.nature_juridique || "",
        activite_principale: r.activite_principale || "",
        ville: r.siege?.libelle_commune || "",
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
    if (ape && !ape.startsWith("43")) {
      setApeWarning(
        `LIGNIA est conçu pour les artisans du bâtiment. Votre code APE (${ape}) correspond à un autre secteur. Vous pouvez continuer si vous êtes bien artisan.`
      );
    } else {
      setApeWarning(null);
    }
  }, []);

  return { results, loading, apeWarning, search, lookupSiret, checkApe, setResults };
}
