# FRONT-RUNTIME-AUDIT-1

> Date    : 2026-05-17  
> Source  : Lecture directe des fichiers GitHub (`src/hooks/`, `src/pages/`, `src/components/`)  
> Session : FRONT-RUNTIME-AUDIT-1  
> Objectif : Cartographie du runtime frontend réel — pas de la doc, pas de l'intention.

---

## Résumé Exécutif

Le frontend est fonctionnel pour le cycle CRM (projets, clients, interventions, dashboard). Il est **partiellement branché** pour le cycle devis. Deux flux devis coexistent : un flux legacy `CreateQuote.tsx` (entièrement manuel, 0 RPC catalogue) et un flux moderne `QuoteDetail.tsx` / `useQuoteDetail.ts` (lecture correcte, mais insertion via `useCreateQuote.ts` qui n'appelle pas `resolve_item_price`). Le CatalogPopover appelle `search_quote_items` (v1 legacy), pas v2. `metadata` est inséré à `{}` hardcodé.

---

## 1. Cartographie des Hooks — Vue d'Ensemble

| Fichier | RPC / Table | Statut | Commentaire |
|---|---|---|---|
| `useCatalogSearch.ts` | `catalogDb.rpc('search_quote_items')` | ⚠️ LEGACY | Appelle la v1, pas la v2. Fallback accès direct `catalog_items`. |
| `useCatalog.ts` | `catalogDb.from('catalog_items')` direct | ⚠️ LEGACY | Accès direct table sans RPC. Page admin catalogue uniquement. |
| `useQuoteDetail.ts` | `billingDb.from('v_quotes_with_customer')` + `quote_lines` | ✅ STANDARD | Lecture correcte, tous les champs snapshot lus. |
| `useCreateQuote.ts` | `billingDb.from('quote_lines').insert(...)` | 🚧 PARTIELLEMENT BRANCHÉ | `addLine()` insère `metadata: {}` hardcodé. 0 appel RPC. |
| `CreateQuote.tsx` (page) | `billingDb.from('quotes').insert(...)` | ❌ DANGEREUX | Flux legacy manuel complet. 0 RPC catalogue. 0 metadata. |
| `NewQuoteModal.tsx` | `coreDb.from('v_projects_with_customer')` | ✅ STANDARD | Modal de sélection projet, correct. |
| `useSignQuote.ts` | RPC sign_quote | ✅ STANDARD | Transition de statut correcte. |

---

## 2. Recherche Catalogue

### `useCatalogSearch.ts` — ⚠️ LEGACY

```typescript
// Ligne 52 — ce qui est réellement appelé :
const { data, error } = await catalogDb.rpc("search_quote_items", {  // ← v1 LEGACY
  p_tenant_id: tenantId,
  p_query: term.trim(),
  ...
});
```

**Problème** : appelle `catalog.search_quote_items` (wrapper legacy 25 colonnes), pas `catalog.search_quote_items_v2` (34 colonnes avec `needs_human_review`, `has_dta`, `dta_status`, `is_etanche`, `energy_type_simple`, `is_central`).

Conséquence : les 9 nouvelles colonnes sécurité/prescription ne sont jamais reçues côté Lovable. Le badge ⚠️ ne peut pas être affiché même si `needs_human_review=true` était rempli en base.

**Fallback actif** : si la RPC échoue, le hook fait un accès direct `catalogDb.from('catalog_items').select(...).ilike(...)`. Ce fallback est silencieux — aucun toast ni log visible pour l'artisan.

```typescript
// Le type CatalogSearchResult ne déclare PAS les champs v2 :
export interface CatalogSearchResult {
  // ... 25 champs legacy
  // ❌ pas de needs_human_review
  // ❌ pas de has_dta / dta_status
  // ❌ pas de is_etanche
  // ❌ pas de is_central
  // ❌ pas de energy_type_simple
  // ❌ pas de source_system
}
```

**Résumé** :
- Wrapper `catalogDb` : ✅ utilisé
- RPC version : ❌ v1, pas v2
- Fallback accès direct : ⚠️ actif et silencieux
- Champs v2 reçus : ❌ aucun

---

## 3. `addItem()` — Flux d'Insertion Quote Lines

### `useCreateQuote.ts` — 🚧 PARTIELLEMENT BRANCHÉ

```typescript
// Ligne 109-124 — addLine() réelle :
const { error: err } = await billingDb
  .from("quote_lines")
  .insert({
    tenant_id: resolvedTid,
    quote_id: quoteId,
    product_id: line.product_id || null,    // ← transmis si fourni
    label: line.label,
    qty: line.qty,
    unit: line.unit,
    unit_price_ht: line.unit_price_ht,
    vat_rate: line.vat_rate,
    sort_order: line.sort_order,
    metadata: {},                           // ← hardcodé {} — TOUJOURS VIDE
    // ❌ unit_cost_price : absent — jamais inséré
    // ❌ supplier_ref_snapshot : absent
    // ❌ supplier_name_snapshot : absent
    // ❌ raw_label_snapshot : absent
  });
```

**`resolve_item_price` est-il appelé ?** Non. Aucune trace dans `addLine()`, ni dans `useCreateQuote.ts`, ni dans `CreateQuote.tsx`.

**`unit_cost_price` est-il rempli ?** Non via ce flux. Les 25 lignes avec `unit_cost_price` rempli en base ont été saisies manuellement via d'autres chemins.

**`metadata` est-il rempli ?** `{}` hardcodé — jamais la structure `{pricing: {...}, prescription: {...}}`.

**`product_id` est-il transmis ?** Oui si `line.product_id` est fourni — mais `CreateQuote.tsx` ne fournit jamais de `product_id` (formulaire texte libre, pas de sélection catalogue).

**Résumé** :
- `resolve_item_price` appelé : ❌
- `unit_cost_price` rempli : ❌
- `metadata` rempli : ❌ (`{}` hardcodé)
- `product_id` transmis : 🚧 seulement si fourni par l'appelant
- Snapshots fournisseur : ❌

---

## 4. `CreateQuote.tsx` — Flux Legacy Complet ❌ DANGEREUX

```typescript
// handleSubmit() — ce qui est réellement inséré :
const lineInserts = lines.map((l, i) => ({
  tenant_id: tenantId,
  quote_id: quote.id,
  label: l.label,           // ← libellé saisi manuellement
  qty: l.qty,
  unit: l.unit,
  unit_price_ht: l.unit_price_ht,  // ← prix saisi manuellement
  vat_rate: l.vat_rate,
  total_line_ht: lineTotal(l),
  sort_order: i,
  // ❌ product_id : absent
  // ❌ metadata : absent (null → {} par DB)
  // ❌ unit_cost_price : absent
  // ❌ tous snapshots : absents
}));
```

**Ce fichier est une page de création de devis entièrement manuelle**, sans aucune interaction avec le catalogue. Il est distinct de `QuoteDetail.tsx` qui est le flow principal post-création.

**Dangers spécifiques** :
1. `notes` stockées dans `payload: { notes }` — `payload` utilisé comme champ métier réel (contenu affiché ?)
2. Clients chargés uniquement depuis `MOCK_CUSTOMERS` si `DEV_BYPASS=true`, sinon `useState([])` sans fetch — **la liste des clients est vide en production** sans bypass.
3. TVA `default 10` hardcodée dans `emptyLine()` — jamais contextualisée.

---

## 5. TVA — Analyse Runtime

### Dans `useCatalogSearch.ts`

```typescript
// Ligne 96-98 — suggestedVat() :
export function suggestedVat(productType: string): number {
  return productType === "appliance" ? 5.5 : 10;
}
```

**Utilisé ?** Oui, exporté. Mais appelé uniquement si le composant consommateur le fait. Non vérifié si l'appelant respecte vraiment cette suggestion.

**Problème** : la logique de suggestion TVA est binaire (`appliance` = 5.5%, tout autre = 10%). La TVA 20% n'est jamais suggérée par cette fonction. Les critères réels (ancienneté logement, attestation signée) ne sont pas consultés.

### Dans `CreateQuote.tsx`

```typescript
const VAT_RATES = [5.5, 10, 20];  // ✅ format correct

function emptyLine(): QuoteLine {
  return { ..., vat_rate: 10 };  // ⚠️ hardcode 10% par défaut
}
```

**Calcul TTC** :
```typescript
acc[l.vat_rate].vat += ht * (l.vat_rate / 100);  // ✅ correct
```

Le calcul `total_ht × (1 + vat_rate / 100)` est correct. Les valeurs stockées (5.5, 10, 20) sont au bon format. Pas de bug de format décimal.

### Dans `useQuoteDetail.ts`

```typescript
const displayTotalTtc = itemLines.reduce(
  (s, l) => s + l.qty * l.unit_price_ht * (1 + l.vat_rate / 100),
  0,
);
```

✅ Calcul correct. Recalcul côté client indépendant du total stocké en base.

**Résumé TVA** :
- Format en base : ✅ 5.5 / 10.0 / 20.0
- Calcul frontend : ✅ correct
- `suggestedVat()` : ⚠️ trop simplifié (pas de contexte fiscal)
- Default hardcodé : ⚠️ 10% sans validation contextuelle
- Fallback silencieux : pas détecté

---

## 6. Snapshots

### Ce qui devrait être capturé à l'insertion

| Champ | `useCreateQuote.addLine()` | `CreateQuote.tsx` | Status |
|---|---|---|---|
| `supplier_ref_snapshot` | ❌ absent | ❌ absent | Non capturé |
| `supplier_name_snapshot` | ❌ absent | ❌ absent | Non capturé |
| `supplier_sku_snapshot` | ❌ absent | ❌ absent | Non capturé |
| `raw_label_snapshot` | ❌ absent | ❌ absent | Non capturé |
| `normalized_label_snapshot` | ❌ absent | ❌ absent | Non capturé |
| `metadata.pricing` | ❌ `{}` hardcodé | ❌ absent | Non capturé |
| `metadata.prescription` | ❌ `{}` hardcodé | ❌ absent | Non capturé |
| `unit_cost_price` | ❌ absent | ❌ absent | Non capturé |
| `product_id` | 🚧 si fourni | ❌ absent | Partiel |

### Ce qui est lu correctement (useQuoteDetail.ts)

`useQuoteDetail.ts` déclare et lit tous les champs snapshot dans son SELECT — la **lecture** est prête. Les colonnes sont dans le `QuoteLine` interface. C'est l'écriture qui est manquante.

---

## 7. `payload` — Usages Réels

### `CreateQuote.tsx` — ❌ DANGEREUX

```typescript
payload: notes ? { notes } : {},
```

`payload` est utilisé comme **champ de contenu affiché** pour les notes internes. Si ces notes sont affichées quelque part dans l'UI (à vérifier dans `QuoteDetail.tsx`), `payload` est devenu une source de données métier — exactement ce qui est interdit dans ARCH-DOC-1.

### `useQuoteDetail.ts`

```typescript
payload: (q.payload as Record<string, unknown>) ?? null,
```

Lu et exposé dans `QuoteDetailData.payload`. La page `QuoteDetail.tsx` a potentiellement accès à `payload.notes` si le composant le consomme.

### Verdict

`payload` est utilisé dans `CreateQuote.tsx` comme espace de stockage de notes artisan. C'est une dérive par rapport à la convention documentée (payload = dette contrôlée TVA/aides uniquement). Risque faible pour l'instant (notes textuelles), mais à ne pas laisser croître.

---

## 8. `useCatalog.ts` — Accès Direct Table ⚠️ LEGACY

```typescript
// fetchItemsPage() — accès direct sans RPC :
const { data, error: err } = await catalogDb
  .from("catalog_items")
  .select(ITEM_COLUMNS)
  .eq("catalog_id", catalogId)
  // ...
```

Ce hook est utilisé par la **page admin Catalogue** (gestion/admin des catalogues). Ce n'est **pas** le flux devis. L'accès direct est acceptable pour l'administration catalogue.

Mais le hook expose `cost_price` au lieu de `unit_cost_price` — cohérent avec le fait que `resolve_item_price` n'est pas utilisé ici non plus.

La protection articles fournisseurs est correcte :
```typescript
const FORBIDDEN = ["name", "sku", "supplier_ref", "cost_price"];
for (const f of FORBIDDEN) delete safeChanges[f];
```
✅ Les champs immutables sont protégés en écriture.

---

## 9. `schema-clients.ts` — Clients Schéma

```typescript
export const catalogDb = (supabase as any).schema("catalog");
```

✅ `catalogDb` est correctement pointé sur le schéma `catalog` — les appels `catalogDb.rpc()` vont bien vers `catalog.*` et non `public.*`. Le wrapper est en place.

La solution `as any` est centralisée ici — propre, pas répété dans les hooks.

---

## 10. Top Risques Frontend

| # | Risque | Fichier | Sévérité |
|---|---|---|---|
| R1 | `useCatalogSearch` appelle `search_quote_items` v1, pas v2 | `useCatalogSearch.ts:52` | 🔴 CRITIQUE |
| R2 | `addLine()` insère `metadata: {}` hardcodé — jamais la structure réelle | `useCreateQuote.ts:121` | 🔴 CRITIQUE |
| R3 | `CreateQuote.tsx` : flux legacy complet, 0 RPC, 0 product_id, 0 snapshot | `CreateQuote.tsx` | 🔴 CRITIQUE |
| R4 | `resolve_item_price` jamais appelé nulle part dans le code frontend | tous | 🔴 CRITIQUE |
| R5 | `unit_cost_price` jamais inséré par aucun flux frontend | tous | 🟠 FORT |
| R6 | `CreateQuote.tsx` : liste clients vide en production (pas de fetch) | `CreateQuote.tsx:64` | 🟠 FORT |
| R7 | `payload` utilisé pour stocker des notes dans `CreateQuote.tsx` | `CreateQuote.tsx:191` | 🟡 MOYEN |
| R8 | `suggestedVat()` : logique binaire sans contexte fiscal | `useCatalogSearch.ts:96` | 🟡 MOYEN |
| R9 | Fallback `catalog_items` direct silencieux si RPC échoue | `useCatalogSearch.ts:63-85` | 🟡 MOYEN |
| R10 | Type `CatalogSearchResult` ne déclare pas les champs v2 | `useCatalogSearch.ts:6-26` | 🟡 MOYEN |

---

## 11. Flows Legacy Identifiés

```
[LEGACY-1] CreateQuote.tsx
  Page de création devis entièrement manuelle.
  Formulaire texte libre, aucun catalogue, aucune RPC.
  Client list vide hors DEV_BYPASS.
  Peut coexister avec le flux QuoteDetail si les deux URL sont accessibles.

[LEGACY-2] useCatalogSearch → search_quote_items (v1)
  Wrapper correct, RPC incorrecte.
  Retourne 25 colonnes sans les 9 champs sécurité/prescription.
  CatalogPopover utilise ce hook → jamais de badge ⚠️ possible.

[LEGACY-3] useCatalog → accès direct catalog_items
  Utilisé pour la page admin catalogue.
  Non dangereux dans ce contexte, mais expose cost_price au lieu de net_price.

[LEGACY-4] metadata: {} hardcodé dans addLine()
  Toutes les insertions via useCreateQuote passent par ce point.
  Aucune snapshot jamais capturée.
```

---

## 12. Corrections Minimales Prioritaires

### CRITIQUE — À faire avant tout test artisan

**C1. Migrer `useCatalogSearch` vers `search_quote_items_v2`**

```typescript
// Remplacer ligne 52 :
await catalogDb.rpc("search_quote_items", {...})
// Par :
await catalogDb.rpc("search_quote_items_v2", {...})
```

Mise à jour requise en parallèle :
- Interface `CatalogSearchResult` : ajouter les 9 champs v2
- Type `CatalogItem` : étendre avec les champs v2

**C2. Brancher `resolve_item_price` dans `addLine()` avant l'insert**

```typescript
// Dans useCreateQuote.addLine(), avant l'INSERT :
const { data: priceData } = await catalogDb.rpc('resolve_item_price', {
  p_item_id: line.product_id,
  p_tenant_id: resolvedTid,
  p_purchase_supplier_name: null,
});
// Puis peupler unit_cost_price et metadata.pricing depuis priceData
```

**C3. Peupler `metadata` à l'insertion**

Après appel `resolve_item_price` et depuis les données `search_quote_items_v2`, construire :
```typescript
metadata: {
  pricing: {
    status: priceData.status,
    public_price_ht: priceData.public_price_ht,
    net_price_ht: priceData.net_price_ht,
    pricing_source: priceData.pricing_source,
    resolved_at: new Date().toISOString(),
  },
  prescription: {
    catalog_item_id: line.product_id,
    needs_human_review: item.needs_human_review,
    has_dta: item.has_dta,
    dta_status: item.dta_status,
    is_etanche: item.is_etanche,
    supplier_name: item.supplier_name,
  }
}
```

**C4. Fixer `CreateQuote.tsx` ou le désactiver**

Options :
- Désactiver la route (si `QuoteDetail` est le seul flux actif)
- Ou fixer le fetch clients (remplacer `useState([])` par un vrai appel `coreDb.from('customers')`)
- Ne pas laisser cette page accessible en production dans son état actuel

### IMPORTANT — Avant premier artisan en production

**I1. Ajouter les snapshots fournisseur dans `addLine()`**

```typescript
supplier_ref_snapshot: item.supplier_ref ?? null,
supplier_name_snapshot: item.supplier_name ?? null,
raw_label_snapshot: item.name ?? null,
normalized_label_snapshot: item.normalized_name ?? null,
```

**I2. Déplacer les notes hors de `payload`**

`CreateQuote.tsx` stocke `{ notes }` dans `payload`. Si conservé, utiliser une colonne dédiée ou accepter explicitement cette dette.

**I3. Améliorer `suggestedVat()`**

Consulter `properties.payload.tva.logement_eligible_tva_reduite` et l'ancienneté avant de suggérer 5.5% ou 10%.

---

## Annexe — Inventaire Complet des Appels Backend

```typescript
// ✅ STANDARD — utilisés correctement
billingDb.from('v_quotes_with_customer')         // useQuoteDetail
billingDb.from('quote_lines').select(...)        // useQuoteDetail
billingDb.from('quote_sections').select(...)     // useQuoteDetail
billingDb.from('invoices').select(...)           // useQuoteDetail, useInvoices
billingDb.from('quotes').select(...)             // useQuotes, useCreateQuote
coreDb.from('activities').select(...)            // useQuoteDetail
coreDb.from('projects').select(...)              // useQuoteDetail
coreDb.from('v_projects_with_customer').select(...)  // NewQuoteModal
catalogDb.rpc('delete_catalog_with_items')       // useCatalog

// ⚠️ LEGACY — fonctionnel mais version ancienne
catalogDb.rpc('search_quote_items')              // useCatalogSearch ← devrait être _v2
catalogDb.from('catalog_items').select(...)      // useCatalog (admin) + fallback useCatalogSearch
catalogDb.from('catalogs').select(...)           // useCatalog (admin)

// ❌ MANQUANT — jamais appelé
catalogDb.rpc('resolve_item_price')              // aucun fichier
catalogDb.rpc('search_quote_items_v2')           // aucun fichier
```

---

*FRONT-RUNTIME-AUDIT-1 — 2026-05-17*  
*Basé sur lecture directe du code source GitHub — aucune inférence*
