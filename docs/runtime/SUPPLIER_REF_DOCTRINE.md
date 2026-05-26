# Doctrine supplier_ref — LIGNIA V1

> Décision prise le 26 mai 2026. Ne pas modifier sans consensus.

---

## Règle fondamentale

**`supplier_ref` = code brut fournisseur. Jamais modifié. Jamais préfixé.**

```
supplier_ref  = "600005"          ← code Lorflex exact pour passer commande
supplier_name = "Lorflex"         ← identité du canal commercial
brand         = "Joncoux"         ← identité fabricant
```

## Pourquoi jamais préfixé

Le bon de commande futur enverra `supplier_ref` au fournisseur.
Si `supplier_ref = "LOR_600005"`, Lorflex ne reconnaît pas le code.
Lorflex connaît `"600005"`, pas `"LOR_600005"`.

Préfixer `supplier_ref` = casser les commandes fournisseurs.

## Le préfixe vit dans l'affichage UX uniquement

Le frontend peut construire un code affiché :
```
display_ref = supplier_name[0:3].toUpperCase() + '_' + supplier_ref
           = "LOR_600005"
```

Ce calcul est fait à la volée dans le frontend.
Il n'est pas stocké en base.
Il peut changer sans migration.

## Convention multi-fournisseurs

| supplier_name | Préfixe UX | supplier_ref (brut) |
|---|---|---|
| Lorflex | LOR | 600005 |
| Joncoux | JON | A APA060035 |
| Poujoulat | POU | default_code Odoo |
| Dixneuf | DIX | DIX_039.xxx |
| Bofill | BOF | default_code Odoo |
| Tubest | TUB | default_code Odoo |
| Dinak | DIN | supplier_ref natif |
| KEMP | KEM | default_code |

## Dans quote_lines (snapshot)

```
supplier_ref_snapshot  = catalog_items.supplier_ref  (code brut)
supplier_name_snapshot = catalog_items.supplier_name (nom canal)
```

Le snapshot capture la vérité commerciale au moment du devis.
Il ne capture pas le préfixe UX — celui-ci est recalculé à l'affichage.

## Ce qui ne change pas

- `supplier_ref` dans `catalog_items` : toujours brut
- `supplier_ref_snapshot` dans `quote_lines` : toujours brut
- La RPC `import_supplier_items` : ne préfixe jamais
- Le script `map_supplier.py` : ne préfixe jamais

## Piège à éviter

Ne jamais stocker le préfixe dans :
- `sku_code`
- `sku`
- `name`
- `display_ref` (colonne inexistante en V1)

Si un jour tu veux stocker le préfixe : créer une colonne `display_ref`
dédiée, nullable, jamais utilisée comme clé de commande.
