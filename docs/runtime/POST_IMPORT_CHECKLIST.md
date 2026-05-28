# Checklist post-import catalogue

> À valider après chaque import de fournisseur.

---

## A — Données en base

```sql
SELECT * FROM catalog.v_supplier_summary
WHERE supplier_name = '<fournisseur>';
```

- [ ] `avec_cost = 0` (CRITIQUE)
- [ ] `avec_ref = total` (100% des articles ont une ref)
- [ ] `prix_min` et `prix_max` cohérents avec le tarif source
- [ ] `avec_batch = total` (100% traçabilité)
- [ ] `avec_brand = total` (brand rempli)

---

## B — Remise configurée

```sql
SELECT * FROM catalog.tenant_supplier_discounts
WHERE supplier_name = '<fournisseur>'
  AND tenant_id = 'TENANT_UUID';
```

- [ ] Au moins 1 ligne de remise globale
- [ ] `discount_pct > 0`

---

## C — Recherche fonctionnelle

```sql
SELECT name, supplier_ref, search_score
FROM catalog.search_quote_items_v2(
  'TENANT_UUID'::uuid,
  'CODE_ARTICLE',
  NULL, 'fumisterie', false, 5
);
```

- [ ] Au moins 1 résultat retourné
- [ ] `search_score > 10`
- [ ] Pas de mojibake dans les libellés (score serait -50)

---

## D — Devis test

- [ ] Créer un devis avec 1 article du fournisseur
- [ ] `resolve_item_price` retourne `status = 'ok'`
- [ ] `net_price_ht < unit_price_ht` (remise appliquée)
- [ ] `supplier_ref_snapshot IS NOT NULL` dans `quote_lines`
- [ ] `metadata.pricing.net_price_ht` rempli

---

## E — Fournisseur visible dans l'UI

- [ ] Vérifier que le fournisseur est dans `p_active_supplier_names`
  du `CatalogPopover` ou que le filtre est NULL (tous visibles)
- [ ] Rechercher un article dans l'interface LIGNIA
- [ ] L'article s'affiche avec le bon prix

---

## Seuils d'alerte

| Métrique | Seuil normal | Alerte |
|---|---|---|
| `avec_cost` | 0 | > 0 → rollback immédiat |
| Taux skip dry-run | < 10% | > 10% → analyser avant import |
| `search_score` | > 10 | < 0 → mojibake |
| `net_price_ht` | < `unit_price_ht` | = `unit_price_ht` → remise manquante |
