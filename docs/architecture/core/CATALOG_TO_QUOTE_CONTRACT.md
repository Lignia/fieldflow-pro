# CATALOG_TO_QUOTE_CONTRACT.md

> Flux complet : sélection article → snapshot immuable dans `quote_lines`.  
> Référence obligatoire avant toute modification du CatalogPopover ou de `addItem()`.

---

## État actuel — Mai 2026

| Composant | Statut |
|---|---|
| `useCatalogSearch.ts` | ⚠️ Appelle encore `search_quote_items` (LEGACY) |
| `search_quote_items_v2` | ✅ Déployée — migration Lovable L1 à faire |
| `resolve_item_price` dans `addItem()` | ⚠️ Non encore branché |
| `unit_cost_price` dans `quote_lines` | ⚠️ 0/83 lignes renseignées |
| Catalogue central | **0 article** — import Lorflex non exécuté |
| `energy_type_simple` | NULL sur 100% du catalogue — enrichissement post-import |

---

## 1. Flux complet

```
[1] Artisan tape dans le CatalogPopover
      ↓ debounce 300ms
[2] catalogDb.rpc("search_quote_items_v2", { p_tenant_id, p_query, ... })
      ↓ résultats (max 12)
[3] Affichage avec badges (⚠️ 🔴 ℹ️)
      ↓ sélection artisan
[4] addItem(catalogItem)
      ↓
[5] catalogDb.rpc("resolve_item_price", { p_item_id, p_tenant_id })
      ↓ pricing résolu
[6] INSERT billing.quote_lines
      → metadata.pricing figé
      → metadata.prescription figé
      → colonnes *_snapshot figées
```

---

## 2. RPC officielle — `search_quote_items_v2`

### Appel

```typescript
// ✅ STANDARD — à utiliser dans useCatalogSearch.ts (migration L1)
const { data } = await catalogDb.rpc("search_quote_items_v2", {
  p_tenant_id:             tenantId,
  p_query:                 term.trim(),
  p_active_supplier_names: null,
  p_quote_context:         "fumisterie",
  p_include_low_priority:  false,
  p_limit:                 12,
})
```

### Colonnes v2 uniquement (9 nouvelles)

| Colonne | Type | Affichage CatalogPopover |
|---|---|---|
| `needs_human_review` | boolean | Badge ⚠️ si `true` |
| `pricing_status` | text \| null | `'priced'` / `'price_on_request'` / `'missing_price'` |
| `prix_sur_devis` | boolean | Afficher "Sur demande" si `true` |
| `is_etanche` | boolean \| **null** | `null` ≠ `false` — traiter séparément |
| `has_dta` | boolean | `false` = DTA non confirmé |
| `dta_status` | text \| null | `'confirmed'` / `'missing'` / `'not_applicable'` / `'unknown'` |
| `energy_type_simple` | text \| null | `'bois'` / `'granules'` / `'gaz'` / `'multi'` |
| `is_central` | boolean | `true` = article catalogue central LIGNIA |
| `source_system` | text \| null | `'LORFLEX_ERP'` / `'OPENFIRE'` / `'MANUAL'` |

---

## 3. Affichage CatalogPopover

### Libellé et référence

```typescript
const displayLabel = item.customer_label ?? item.normalized_name ?? item.name
const displayRef   = item.sku_code ?? item.supplier_ref ?? item.sku ?? ''
```

### Prix

```typescript
if (item.prix_sur_devis || item.pricing_status === 'price_on_request') {
  return 'Sur demande'
}
return item.unit_price_ht != null
  ? `${item.unit_price_ht.toFixed(2)} € HT`
  : 'Prix non disponible'
```

### Badges

| Condition | Badge | Tooltip |
|---|---|---|
| `needs_human_review === true` | ⚠️ jaune | "Vérification DTU/DTA requise" |
| `prix_sur_devis === true` | 🔴 rouge | "Prix sur demande" |
| `is_etanche === true` ET `dta_status !== 'confirmed'` | ℹ️ gris | "DTA non confirmé" |

> ⚠️ `is_etanche === null` ≠ `is_etanche === false`  
> Toujours tester `=== false` explicitement. `null` = non déterminé.

---

## 4. RPC officielle — `resolve_item_price`

```typescript
// ✅ Appel UNIQUEMENT dans addItem() — jamais dans le popover
const result = await catalogDb.rpc("resolve_item_price", {
  p_item_id:   item.id,
  p_tenant_id: tenantId,
})
```

### Résultat (JSONB)

| Champ | Type | Usage |
|---|---|---|
| `status` | string | `'ok'` / `'no_discount_configured'` / `'no_public_price'` / `'item_not_found'` |
| `public_price_ht` | number \| null | Prix tarif public |
| `net_price_ht` | number \| null | → `unit_cost_price` dans `quote_lines` |
| `discount_pct` | number \| null | % de remise appliqué |
| `discount_applied` | boolean | |
| `pricing_source` | string \| null | Voir `PRICING_AND_DISCOUNTS.md` |
| `bareme_code` | string \| null | Barème Lorflex utilisé |
| `is_central` | boolean \| null | Patch PRICING-1 |

---

## 5. Snapshot `quote_lines` — Ce qui est figé à l'insertion

### Colonnes dédiées

| Colonne | Source | Règle |
|---|---|---|
| `label` | `customer_label ?? normalized_name ?? name` | Libellé client final |
| `unit_price_ht` | `catalog_items.unit_price_ht` | **Prix vente — JAMAIS net** |
| `unit_cost_price` | `resolve_item_price.net_price_ht` | Prix achat artisan |
| `vat_rate` | Suggestion + confirmation artisan | `5.5` / `10.0` / `20.0` |
| `product_id` | `catalog_items.id` | FK — **pas** `catalog_item_id` |
| `supplier_ref_snapshot` | `catalog_items.supplier_ref` | Clé d'achat figée |
| `supplier_name_snapshot` | `catalog_items.supplier_name` | Pour bon de commande |
| `raw_label_snapshot` | `catalog_items.raw_label` | Libellé source fournisseur |
| `line_category` | Déduit de `product_kind` | `flue` / `device` / `labor` / `option` / `misc` |

### `metadata` (JSONB immuable)

```jsonc
{
  "pricing": {
    "status": "ok",
    "public_price_ht": 244.00,
    "net_price_ht": 109.80,
    "discount_pct": 55.0,
    "discount_applied": true,
    "pricing_source": "supplier_bareme",
    "bareme_code": "10.25",
    "resolved_at": "2026-05-17T10:00:00Z"   // OBLIGATOIRE
  },
  "prescription": {
    "catalog_item_id": "uuid",
    "diameter_inner_mm": 80,
    "diameter_outer_mm": null,
    "technology_type": "double_paroi_bois",
    "energy_type": "bois",                    // TEXT simple (pas ARRAY)
    "is_etanche": false,                      // null si non déterminé
    "has_dta": false,
    "dta_status": "not_applicable",
    "needs_human_review": false,
    "supplier_name": "Lorflex",
    "manufacturer_name": "Joncoux"
  }
}
```

```
❌ NE JAMAIS modifier metadata après insertion
❌ NE JAMAIS recalculer les champs prescription depuis catalog_items
```

---

## 6. Validation TVA avant PDF

| Condition | Type | Message |
|---|---|---|
| `vat_rate` hors `{5.5, 10.0, 20.0}` | **BLOQUANT** | "Valeur TVA non autorisée" |
| TVA réduite sans logement éligible | **BLOQUANT** | "Ancienneté logement non confirmée" |
| TVA réduite sans attestation signée | **BLOQUANT** | "Attestation TVA réduite non signée" |
| `vat_rate = 0` | **BLOQUANT** | "TVA à 0% — vérifier" |
| `quote_number` vide | **BLOQUANT** | "Numéro de devis manquant" |
| `needs_human_review` sur une ligne | Avertissement | "Vérification DTU/DTA requise" |

> **Note** : le formulaire d'attestation TVA réduite (historiquement référencé comme Cerfa 1301) peut changer de numéro selon les années fiscales. Utiliser le libellé générique "attestation TVA réduite" dans les messages UI — jamais un numéro de formulaire.

---

*Mis à jour : 2026-05-17 — ARCH-DOC-1*
