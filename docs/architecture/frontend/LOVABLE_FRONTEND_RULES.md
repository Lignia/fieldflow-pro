# LOVABLE_FRONTEND_RULES.md

> Règles strictes pour Lovable. À lire avant tout nouveau composant ou hook.

---

## État actuel — Mai 2026

| Composant | Statut | Action |
|---|---|---|
| `useCatalogSearch.ts` | ⚠️ LEGACY — appelle `search_quote_items` | Migrer en L1 |
| `useCatalog.ts` | ⚠️ `.from("catalog_items")` direct | Exception documentée — gestion artisan uniquement |
| `resolve_item_price` dans `addItem()` | ⚠️ Non branché | Brancher en L1 |
| `unit_cost_price` | ⚠️ 0/83 lignes renseignées | Dépend du branchement ci-dessus |

---

## 1. RPCs Catalogue

| RPC | Statut | Règle |
|---|---|---|
| `catalogDb.rpc("search_quote_items_v2")` | ✅ **STANDARD** | CatalogPopover |
| `catalogDb.rpc("search_quote_items")` | ⚠️ **LEGACY** | Ne plus utiliser |
| `catalogDb.rpc("resolve_item_price")` | ✅ **STANDARD** | `addItem()` uniquement |

```
✅ catalogDb.rpc("search_quote_items_v2")   ← CatalogPopover
✅ catalogDb.rpc("resolve_item_price")      ← addItem() seulement
❌ catalogDb.rpc("search_quote_items")      ← LEGACY
❌ resolve_item_price dans la boucle des résultats du popover
```

---

## 2. Accès directs aux tables

```
❌ INTERDIT dans tout nouveau composant :
   catalogDb.from("catalog_items").select(...)

⚠️ EXCEPTION UNIQUE — useCatalog.ts :
   Page de gestion catalogue artisan (/catalog) uniquement
   Ne jamais reproduire dans le CatalogPopover ou le devis

❌ INTERDIT ABSOLU :
   catalogDb.from("import_joncoux_staging")
   → RLS deny-all — erreur silencieuse (0 résultats)
```

---

## 3. Pricing

```
✅ unit_price_ht   = catalog_items.unit_price_ht      → prix de vente client
✅ unit_cost_price = resolve_item_price.net_price_ht  → prix achat artisan

❌ NE JAMAIS écraser unit_price_ht avec net_price_ht
❌ NE JAMAIS afficher unit_cost_price dans le PDF client
```

---

## 4. TVA

```typescript
type VatRate = 5.5 | 10 | 20  // jamais 0.055 / 0.10 / 0.20

// SQL stocke : 5.5 / 10.0 / 20.0
```

```
❌ Format décimal interdit
❌ Aucun fallback silencieux à 10 sans confirmation artisan
✅ validateVatBeforePdf() obligatoire avant génération PDF
```

---

## 5. Snapshots `quote_lines`

```
✅ metadata figé à l’insertion — immuable
✅ product_id  = FK vers catalog_items.id  (pas catalog_item_id)
❌ NE JAMAIS modifier metadata après insertion
❌ NE JAMAIS recalculer les *_snapshot depuis catalog_items
```

---

## 6. CatalogPopover — Affichage

| Élément | Règle |
|---|---|
| Libellé | `customer_label ?? normalized_name ?? name` |
| Référence | `sku_code ?? supplier_ref ?? sku ?? ''` |
| Prix | `unit_price_ht` ou « Sur demande » si `prix_sur_devis` |
| Badge ⚠️ | `needs_human_review === true` |
| Badge 🔴 | `prix_sur_devis === true` |
| Badge ℹ️ | `is_etanche === true` ET `dta_status !== 'confirmed'` |

```
⚠️ is_etanche === null  ≠  false  — toujours tester === false
⚠️ energy_type_simple = null sur 100 % du catalogue actuel
```

```typescript
// ✅ Gestion correcte
const ENERGY_LABELS: Record<string, string> = {
  bois: 'Bois bûche', granules: 'Granulés',
  gaz: 'Gaz', multi: 'Bois / Granulés', fioul: 'Fioul',
}
const energyLabel = (e: string | null) =>
  e === null ? '' : (ENERGY_LABELS[e] ?? e)

// ❌ Éviter (!item.energy_type_simple attrape aussi '' et 0)
// ✅ Préférer
if (item.energy_type_simple === null) { /* non déterminé */ }
```

---

## 7. Schémas Supabase

```typescript
// src/integrations/supabase/schema-clients.ts
export const catalogDb    = (supabase as any).schema("catalog")
export const billingDb    = (supabase as any).schema("billing")
export const coreDb       = (supabase as any).schema("core")
```

```
✅ catalog.*  = interface Lovable (wrappers SQL)
❌ public.*   = implémentations internes — ne jamais appeler depuis Lovable
```

---

## 8. Checklist avant PDF

- [ ] `quote_number` non vide
- [ ] `vat_rate` ∈ `{5.5, 10.0, 20.0}` sur toutes les lignes
- [ ] TVA réduite → logement > 2 ans confirmé
- [ ] TVA réduite → attestation TVA réduite signée (`quotes.payload.tva.tva_attestation_collected`)
- [ ] Aucune ligne `needs_human_review = true` non acquittée
- [ ] `unit_cost_price` absent du PDF client

---

*ARCH-DOC-1 v1.2 — 2026-05-17*
