# NOTES D'ARCHITECTURE — LIGNIA

**Date** : 2026-05-23 | Pour réinjection dans d'autres conversations

---

## Supabase — Structure réelle

**Schémas actifs** : `core` (CRM), `billing` (devis/factures), `catalog` (articles), `operations` (interventions), `ai` (interactions vocales futures), `expertise` (DTU), `public` (wrappers RPCs)

**Isolation tenant** : `tenant_id UUID` sur toutes les tables métier. `core.current_tenant_id()` = `auth.jwt() ->> 'tenant_id'`. Inaccessible en `service_role` — bloquer toute RPC qui en dépend depuis MCP.

**RPCs critiques** :
- `billing.replace_quote_lines` — DELETE + INSERT transactionnel avec `FOR UPDATE`. Seule entrée valide pour sauvegarder les lignes.
- `billing.transition_quote_status` — FSM devis. Dépend de `current_tenant_id()` — inaccessible en service_role.
- `billing.sign_quote_and_initialize` — Crée facture acompte + installation + change statut client. Idem.
- `catalog.search_quote_items_v2` — Recherche fulltext catalogue. Wrapper dans `catalog.` pour `catalogDb = supabase.schema("catalog")`.
- `catalog.resolve_item_price` — Pricing avec remise cascade. Source de vérité du prix net.

**Catalogue** : 6 267 articles centraux (is_central=true, tenant_id=NULL) dont 6 093 Joncoux. Les 6 086 articles legacy (is_central=false, AMBIANCE CHALEUR) restent intacts. `catalog_items.vat_rate` = suggestion. `quote_lines.vat_rate` = vérité contractuelle.

**Table archive sans RLS** : `catalog._archive_joncoux_legacy_20260520` — exposée publiquement. Danger.

---

## Frontend — État réel

**Pages à surveiller** (risk de régression Lovable) :
- `QuoteDetail.tsx` — 70 KB, logique FSM + calculs marge + sticky bar mobile + 8 sub-components
- `QuoteEditor.tsx` — ~60 KB, logique pricing + catalogue + sections + sauvegarde
- `ProjectDetail.tsx` — 54 KB, tabs + sticky bar + FSM projet
- `InterventionDetail.tsx` — 52 KB

**Extractions faites dans cette session** :
- `src/lib/format.ts` — `formatCurrency()` centralisé
- `src/lib/nav.ts` — `isActiveRoute()` centralisé

**Patterns non extractibles maintenant** : `ActionsBloc`, `LineRow`, `useQuoteMargin` (logique mouvante).

**PDF** : `src/lib/quote-pdf.ts` — groupe les lignes par `line_category` hardcodé, ignore `section_id`. C'est la dette la plus critique : le PDF ne correspond pas au devis que l'artisan a construit.

---

## Invariants absolus (à ne jamais modifier sans décision architecture)

```
is_central=true → tenant_id IS NULL
UNIQUE (supplier_name, supplier_ref) WHERE is_central=true
billing.quote_lines = snapshot immuable
resolve_item_price = seule source pricing runtime
billing.replace_quote_lines = FOR UPDATE + EXCEPTION WHEN OTHERS
catalog.* = interface Lovable / public.* = implémentation
JAMAIS UPDATE tenant_id en masse sur legacy
catalog_items.vat_rate = suggestion ergonomique seulement
quote_lines.vat_rate = vérité fiscale contractuelle
transition_quote_status et sign_quote_and_initialize lisent auth.jwt() → inaccessibles en service_role MCP
```

---

## Sécurité — Surface d'attaque anon

Le point le plus dangereux de l'architecture actuelle. 35+ fonctions `SECURITY DEFINER` sont appelables par l'utilisateur `anon` (non authentifié) via `/rest/v1/rpc/`. Cela inclut :
- `sign_quote_and_initialize` — crée une facture et une installation
- `replace_quote_lines` — vide et remplace les lignes d'un devis
- `duplicate_quote` — crée des devis
- `import_supplier_items` — peut modifier le catalogue central
- `transition_quote_status` — change le statut FSM d'un devis

**Correction** : Une seule migration SQL avec `REVOKE EXECUTE ON FUNCTION ... FROM anon;` pour chaque fonction. Aucun impact sur les utilisateurs authentifiés. 30 minutes de travail.

---

## Performance — Ce qui compte à court terme

1. **`search_keywords` NULL** — 6 093 articles Joncoux sans mots-clés = recherche catalogue par fulltext impossible. C'est fonctionnellement bloquant.
2. **FK sans index sur `billing.quotes(project_id)` et `billing.quote_lines(quote_id)`** — sera ressenti à partir de ~500 devis.
3. **RLS `auth.uid()` non wrappé** — `(select auth.uid())` est évalué une fois par requête au lieu d'une fois par ligne. 2 tables concernées.

---

## PWA — Stratégie réaliste

**V1** : Ne rien faire. Les artisans utilisent le navigateur mobile (Chrome). Pas de service worker, pas de manifest.

**V2** : Cache uniquement des données en lecture (catalogue, clients, propriétés). Jamais cacher les devis ou les transitions FSM — risque de conflit de version offline/online.

**Jamais** : Offline-first sur le workflow devis. Incompatible avec `replace_quote_lines` (DELETE + INSERT) et `transition_quote_status` (FSM séquentiel).
