# CRITICAL_FILES

> Lecture obligatoire avant tout prompt Lovable ou Claude Exec touchant ces fichiers.
> Source : ENGINEERING_PRINCIPLES.md + LIGNIA_CANONICAL_TRUTH_AUDIT v2

---

## Règle

Ces fichiers ne peuvent pas être modifiés sans passer par le rituel Chat-only :

1. Session Lovable en mode **Chat** (sans écriture) — décrire l'intention, demander le plan
2. Valider le plan
3. Session Lovable en mode **Default** — exécuter uniquement ce qui a été validé

---

## Liste des fichiers protégés

| Fichier | Raison | Règle |
|---|---|---|
| `src/pages/quotes/QuoteEditor.tsx` | 73 Ko, composant critique, snapshots immuables, pricing runtime | Ne jamais refactorer. Patches chirurgicaux uniquement. |
| `src/hooks/useCatalogSearch.ts` | SHA 9e54452 stable — contrat RPC `search_quote_items_v2` | Ne jamais modifier. |
| `src/integrations/supabase/schema-clients.ts` | Source des clients `billingDb`, `catalogDb`, `coreDb` | Ne jamais modifier sans audit des imports. |
| `src/lib/quote-pdf.ts` (ou équivalent PDF) | Génération PDF contractuelle — WYSIWYG Editor ↔ PDF | Ne jamais modifier sans test PDF complet. |
| `src/components/ApplianceSearchTab.tsx` | Onglet Appareils isolé — contrat RPC `search_heating_appliances` via `supabase.rpc` | Ne jamais migrer vers `catalogDb.rpc`. |

---

## RPCs protégées côté Supabase

Ces RPCs ne peuvent pas être modifiées sans décision actée dans DECISION_LOG :

| RPC | Schéma d'appel | Règle |
|---|---|---|
| `resolve_item_price` | `catalogDb.rpc` | Source unique de pricing. Ne jamais modifier. Si besoin, créer `resolve_item_price_v2`. |
| `replace_quote_lines` | `billingDb.rpc` | Point d'écriture unique des lignes devis. Toute modification nécessite un patch SQL + test complet. |
| `search_quote_items_v2` | `catalogDb.rpc` | Contrat stable D-04. Ne jamais modifier. Si besoin, créer `_v3`. |
| `search_heating_appliances` | `supabase.rpc` (jamais `catalogDb.rpc`) | Registre ADEME. Ne jamais changer le schéma d'appel. |

---

## Invariants à rappeler dans tout prompt touchant ces fichiers

Copier-coller dans le prompt :

```
Non négociables :
1. INVARIANT 4 : quote_lines = snapshot immuable — jamais modifier après création
2. INVARIANT 5 : pricing runtime via resolve_item_price uniquement
3. INVARIANT 7 : ne pas modifier resolve_item_price, search_quote_items_v2, replace_quote_lines
4. catalog_items.cost_price : contrainte SQL CHECK (cost_price IS NULL) active —
   le prix d'achat fournisseur ne vit PAS dans le catalogue (décision D-25)
5. quote_lines.unit_cost_price : coût saisi manuellement par l'artisan pour sa marge —
   champ légitime, ne jamais l'alimenter automatiquement depuis un catalogue ou une RPC

Si une de ces règles est en conflit avec ma demande,
ARRÊTE et explique le conflit avant d'écrire du code.
```

---

*Mis à jour : juin 2026. Source : ENGINEERING_PRINCIPLES.md, DECISION_LOG D-25, vérification Supabase (62 lignes unit_cost_price actives en base).*
