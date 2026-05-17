# DATABASE_INVARIANTS.md

> Règles SQL non-négociables. Lire avant toute migration ou accès direct aux tables.

---

## État actuel — Mai 2026

| Indicateur | Valeur |
|---|---|
| `catalog_items` | 18 260 articles — tous `is_central = false` (import central non exécuté) |
| `quote_lines` | 83 lignes — `vat_rate = 10.0` à 100 %, `unit_cost_price = NULL` à 100 % |
| Catalogue central | **0 article publié** — staging prêt, non déclenché |
| `needs_human_review = true` | 0 article — règles DTA non encore appliquées |

---

## 1. Modèle fondamental

```
catalog.catalog_items  = source mutable
  → Prix, libellés et dimensions peuvent être mis à jour à tout moment
  → Les changements n’affectent PAS les devis déjà créés

billing.quote_lines    = historique immuable
  → Snapshot figé au moment de l’ajout
  → metadata.pricing + metadata.prescription = jamais modifiés après insertion
```

| Champ | `catalog_items` | `quote_lines` |
|---|---|---|
| `unit_price_ht` | Prix tarif courant (modifiable) | Prix de vente figé à l’insertion |
| `name` / libellé | Enrichissable | `raw_label_snapshot` figé |
| Dimensions | Enrichissables | `diameter_inner_mm` figé dans `metadata.prescription` |
| `needs_human_review` | Calculé sur règles DTA | Figé dans `metadata.prescription` |

---

## 2. Pricing

```
✅ unit_price_ht   = catalog_items.unit_price_ht         → prix de vente client
✅ unit_cost_price = resolve_item_price.net_price_ht      → prix achat artisan

❌ NE JAMAIS écraser unit_price_ht avec net_price_ht
❌ NE JAMAIS afficher unit_cost_price dans le PDF client
❌ NE JAMAIS laisser unit_cost_price NULL après branchement de resolve_item_price
```

> **État actuel** : `unit_cost_price` NULL sur 100 % des lignes.
> Cause : `resolve_item_price` non encore appelé dans `addItem()`. Correction en Lovable L1.

---

## 3. TVA — Format

```typescript
type VatRate = 5.5 | 10 | 20  // TypeScript (le SQL stocke 5.5 / 10.0 / 20.0)
```

```
✅ Valeurs autorisées : 5.5 / 10.0 / 20.0
❌ Format interdit   : 0.055 / 0.10 / 0.20
❌ vat_rate = 0 interdit sauf justification explicite
❌ Aucun fallback silencieux — toujours confirmation artisan
```

---

## 4. `supplier_ref` — Clé d’achat fournisseur externe

`supplier_ref` = EAN-13 ou code fournisseur transmis tel quel à la commande.
Ce n’est **pas** un identifiant métier LIGNIA.

```
✅ Utilisé pour : commandes fournisseur + snapshot quote_lines
❌ NE JAMAIS utiliser comme clé métier LIGNIA
❌ NE JAMAIS modifier après publication centrale
```

Priorité snapshot : `sku_code ?? supplier_ref ?? sku ?? id`

---

## 5. Catalogue central — `is_central`

```sql
-- CHECK actif : check_central_consistency
is_central = true  →  tenant_id IS NULL
is_central = false →  tenant_id IS NOT NULL

-- Index partiel d’unicité
UNIQUE (supplier_name, supplier_ref) WHERE is_central = true
```

```
❌ NE JAMAIS is_central=true avec tenant_id renseigné
❌ NE JAMAIS bypasser le staging pour publier en central
```

---

## 6. FK `quote_lines → catalog_items`

```
✅ product_id       (nom réel)
❌ catalog_item_id  (n’existe pas)
```

---

## 7. Staging — Accès restreint

| Table | `authenticated` | `service_role` |
|---|---|---|
| `catalog.import_joncoux_staging` | ❌ RLS deny-all | ✅ Edge Functions uniquement |

```
❌ NE JAMAIS accéder à import_joncoux_staging depuis Lovable
```

---

## 8. `needs_human_review` — Sécurité/DTU/DTA uniquement

| Déclenche `true` ✅ | Ne déclenche PAS `true` ❌ |
|---|---|
| `is_etanche=true` ET `dta_status IN ('missing','unknown')` | `normalized_name IS NULL` |
| Pellets concentrique sans DTA confirmé | `data_quality_status = 'partial'` |
| Adaptateur/kit central sans `diameter_inner_mm` | `bareme_code IS NULL` |
| | `energy_type_simple NULL` |

```
❌ JAMAIS pour qualité d’import, encodage, données non critiques
```

---

## 9. `payload` JSONB — Dette contrôlée

| Champ | Emplacement | Migration |
|---|---|---|
| `tva_context` | `quotes.payload.tva` | V1.5 |
| `aides` (MaPrimeRénov, CEE) | `quotes.payload.aides` | V1.5 |
| `ban` (citycode, score) | `properties.external_data.ban` | V2 |
| Contexte fiscal | `invoices.payload` | V1.5 |

```
⚠️ payload = usage exceptionnel, documenté ici
❌ NE JAMAIS stocker données contractuelles/légales dans payload
❌ NE JAMAIS stocker ce qui devrait être une colonne indexable
❌ NE JAMAIS utiliser payload pour contourner une migration nécessaire
```

```typescript
// Accès défensif obligatoire
const vatContext = quote.payload?.tva ?? {}
const eligible = vatContext.logement_eligible_tva_reduite ?? null
```

---

## 10. Remises

```
✅ catalog.tenant_supplier_discounts  →  source unique des remises
❌ NE JAMAIS discount_pct dans catalog_items ou quote_lines
```

---

## 11. `has_dta` et `dta_status` — Cohérence obligatoire

```
has_dta BOOLEAN et dta_status TEXT doivent rester cohérents.

Convention :
  has_dta = (dta_status = 'confirmed')

✅ dta_status = 'confirmed'            →  has_dta = true
✅ dta_status IN ('missing',
                  'unknown',
                  'not_applicable')   →  has_dta = false

❌ NE JAMAIS has_dta = true avec dta_status ≠ 'confirmed'
❌ NE JAMAIS has_dta = false avec dta_status = 'confirmed'
```

> Règle documentaire uniquement — pas de CHECK SQL appliqué en base pour le MVP.
> Vérification à la charge du pipeline d’import (Edge Function) et des opérations de maintenance.

---

*ARCH-DOC-1 v1.3 — 2026-05-17 — DOC-ALIGN-1*
