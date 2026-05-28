# Import Catalogue Fournisseur — Runbook V1

> Référence opérationnelle pour tout import ou mise à jour de catalogue.

---

## Pré-requis

- `map_supplier.py` commité dans `scripts/`
- LOT 0 appliqué en base (index unique + RPC v2)
- Fichier CSV fournisseur propre (UTF-8-sig, pas de mojibake)

---

## Étapes standard

### 1. Dry-run

```bash
python map_supplier.py <fichier.csv> <fournisseur> --dry-run
```

Critères GO :
- `taux ignoré < 10%`
- `prix min` et `prix max` cohérents avec les tarifs connus
- `raisons skips` : pas de `missing_tarif_price` massif
- Ouvrir `.dry-run.skipped.json` et inspecter les 10 premiers skips

### 2. Générer le JSON

```bash
python map_supplier.py <fichier.csv> <fournisseur> > output.json
```

### 3. Découper en chunks (100 articles)

```bash
python3 -c "
import json, os
with open('output.json') as f:
    items = json.load(f)
for i in range(0, len(items), 100):
    chunk = items[i:i+100]
    with open(f'chunk_{i//100+1:03d}.json', 'w', encoding='utf-8') as f:
        json.dump(chunk, f, ensure_ascii=False)
print(f'{len(items)} articles → {len(items)//100+1} chunks')
"
```

### 4. Import via Claude Exec Supabase

- Uploader les chunks 10 par 10 (limite Claude)
- Pour chaque chunk : appeler `catalog.import_supplier_items`
- Vérifier `inserted/updated/skipped` après chaque chunk
- Si `skipped > 0` → inspecter avant de continuer

### 5. Vérification post-import

```sql
SELECT * FROM catalog.v_supplier_summary
WHERE supplier_name = '<fournisseur>';
```

Critères PASS :
- `avec_cost = 0` (CRITIQUE)
- `avec_ref = nb_articles`
- `prix_min` et `prix_max` cohérents
- `avec_batch = nb_articles`

### 6. Configurer la remise

```sql
INSERT INTO catalog.tenant_supplier_discounts
  (tenant_id, supplier_name, discount_pct)
VALUES
  ('TENANT_UUID', 'NomFournisseur', XX);
```

### 7. Tester dans le devis

1. Créer un devis dans LIGNIA
2. Rechercher un article du fournisseur
3. Ajouter une ligne
4. Vérifier `resolve_item_price` : `status = 'ok'`, `net_price_ht < unit_price_ht`
5. Vérifier `quote_lines.supplier_ref_snapshot IS NOT NULL`

---

## Mise à jour annuelle des tarifs

Le fournisseur sort un nouveau CSV chaque année.
La RPC est idempotente : `supplier_ref` existant → UPDATE, nouveau → INSERT.

```bash
# Exemple mise à jour Poujoulat 2027
python map_supplier.py poujoulat_2027.csv poujoulat > poujoulat_2027.json
# → Reprendre à l'étape 3 ci-dessus
```

**Important :** générer un nouveau `import_batch_id` à chaque campagne d'import.
Le `import_batch_id` permet de tracer quelle campagne a modifié chaque article.

---

## Rollback par batch

```sql
-- Supprimer tous les articles d'un batch spécifique
DELETE FROM catalog.catalog_items
WHERE supplier_name = 'NomFournisseur'
  AND tenant_id = 'TENANT_UUID'
  AND import_batch_id = 'BATCH_UUID'::uuid;
```

---

## Convention `import_batch_id`

| Campagne | batch_id |
|---|---|
| Poujoulat 2026 init | f90d6354-e64f-442b-8eab-625471a45449 |

Ajouter chaque campagne dans ce tableau.

---

## Invariants à ne jamais violer

- `cost_price` : TOUJOURS NULL dans `catalog_items`
- `supplier_ref` : TOUJOURS le code brut fournisseur (jamais préfixé)
- `unit_price_ht` : TOUJOURS le prix public (jamais le prix d'achat)
- Ne jamais modifier `resolve_item_price`, `search_quote_items_v2`, `replace_quote_lines`
