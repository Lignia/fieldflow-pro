# OPENFIRE PIPELINE LOSS AUDIT — perte d'information CSV → catalog_items

> Statut : OFFICIEL — audit de PREUVE, figé juin 2026. Non doctrine.
> Rôle : documenter factuellement où le pipeline d'import perd de l'information métier
> présente dans la source, afin de justifier les corrections du CATALOG_EXECUTION_PLAN_V1_FINAL.
> Sources analysées directement : `poujoulat.csv` (16 529 lignes, 34 colonnes),
> `poujoulat_import__5_.json` (16 529 items), `poujoulat_csv_skipped__2_.json` (vide = 0 rejet),
> `poujoulat_product_template` (CSV + XLS, 16 529 lignes, 127 catégories — confirmation croisée).
> Code croisé : `map_supplier.py` SHA `b2f4d03b`, `import_supplier_direct.py` SHA `ae4d7e5e`,
> corps RPC `catalog.import_supplier_items`.

---

## 0. Objet et portée

Cet audit établit, preuve à l'appui, que le pipeline
`CSV → map_supplier.py → JSON → import_supplier_direct.py → import_supplier_items → catalog_items`
**jette de l'information métier présente dans la source**. Ce n'est pas un audit de la qualité
des données actuelles (jetables), mais un audit du **comportement du pipeline**, qui doit être
corrigé avant tout réimport propre.

Distinction de portée, valable pour tout cet audit :
- **Comportements du pipeline** (ce qu'il lit / ne lit pas / ne persiste pas) : **généralisables
  à tout fournisseur**, car ils tiennent à la structure du code, pas aux données. Un fournisseur
  dont la catégorie vit dans une colonne non lue subira la même perte.
- **Statistiques de remplissage** (pourcentages, nombres de catégories, taux de description) :
  **propres au corpus Poujoulat audité**. Elles illustrent l'ampleur de la perte sur ce corpus,
  sans préjuger des autres fournisseurs.

---

## 1. Données présentes dans la source (corpus Poujoulat audité)

Le CSV OpenFire/Odoo Poujoulat contient **34 colonnes**. Taux de remplissage mesuré sur les
16 529 lignes du corpus (statistiques propres à ce corpus) :

### Colonnes utiles au modèle V1 — PRÉSENTES

| Colonne CSV | Remplissage | Utilité V1 |
|---|---|---|
| `default_code` | 100 % | → `supplier_ref` |
| `name` | 100 % | → `name` |
| `list_price` / `lst_price` | 100 % | → `unit_price_ht` |
| `of_seller_product_category_name` | **100 % (127 catégories distinctes)** | **→ `item_family` (fumisterie) + dérivation `product_type`** |
| `description_fabricant` | **100 %** | description + dimensions/techno potentielles (diam. dans ~59 %) |
| `brand_id/id` | 100 % | source **possible** de `manufacturer_name` (voir note ci-dessous) |
| `modele` | 3,5 % | → `model_ref` potentiel |

> Note sur `brand_id/id → manufacturer_name`. `brand_id/id` est une source **possible**, non une
> vérité universelle : `brand_id ≠ manufacturer_name` dans le cas général. Pour un fournisseur
> mono-marque comme Poujoulat, la valeur statique « Poujoulat » convient. Pour un distributeur
> multi-marques, le fabricant réel se lit par ligne, pas depuis un `brand_id` global. La règle
> reste : `manufacturer_name` = fabricant réel, NULL si inconnu, jamais forcé = `supplier_name`
> (D-09, D-21, D-13 superseded ; SUPPLIER_MAPPING_STRATEGY_V1).

### Colonnes présentes mais inexploitables ou sensibles

| Colonne CSV | Remplissage | Nature |
|---|---|---|
| `categ_id/id` | 100 % mais **1 seule valeur** (`product.product_category_all`) | Générique, inutile |
| `of_import_categ_id/id` | 0 % | Vide |
| `seller_ids/of_product_category_name` | 0 % | Vide |
| `description` / `description_norme` | 0 % | Vides |
| `of_seller_price`, `of_seller_pp_ht`, `seller_ids/pp_ht`, `seller_ids/price`, `of_sale_coeff`, `of_import_price`, `property_cost_method` | présentes | **Prix d'achat / coûts — sensibles (INVARIANT cost_price)** |

### Colonnes ABSENTES de la source

`item_family`, `family`, `famille` (les 3 colonnes que cherche le script) — **absentes**.
`diameter_inner_mm`, `diametre`, `dn`, `length_mm`, `longueur`, `angle_deg`, `supplier_range`,
`technology_type` — **absentes en tant que colonnes dédiées**.
`valid_from` ou toute date de tarif — **absente**.

---

## 2. Données conservées (CSV → JSON)

| Information CSV | Sort dans le JSON | Statut |
|---|---|---|
| `default_code` | → `supplier_ref` + `ean` | **A — conservée** |
| `name` | → `name` + `normalized_name` + `search_keywords` | **A — conservée** |
| `list_price` | → `tarif_price` | **B — transformée** (renommée) |
| `description_fabricant` | → `description_fabricant` (riche, 100 %) | **A — conservée dans le JSON** |
| `brand_id/id` | → `brand` = "Poujoulat" (statique config, **pas** lu de la colonne) | **D — ignorée** (valeur statique config) |
| Prix d'achat (7 colonnes) | → listés dans `ignored_field_names`, valeurs filtrées | **D — ignorées volontairement** (INVARIANT cost_price) |

---

## 3. Données perdues

Réponse explicite, champ par champ, avec preuve mesurée sur les fichiers du corpus.

| Champ V1 potentiel | Existe dans le CSV ? | Disparaît ensuite ? | Preuve |
|---|---|---|---|
| **`item_family` potentiel** | **OUI** — `of_seller_product_category_name`, 127 catégories, 100 % | **OUI, perdu** | La colonne n'apparaît jamais dans le JSON (0/16 529). `map_supplier.py` ne lit pas cette colonne. |
| **`product_type` (dérivation)** | **OUI** — dérivable de la même catégorie | **OUI, non dérivé** | Le script n'utilise pas la catégorie pour dériver `product_type` ; valeur statique en base (constant `part`). |
| **`supplier_range` potentiel** | OUI — déductible des préfixes catégorie | OUI, perdu | `supplier_range` à 0 % dans le JSON. Source non lue. (Note : V1 n'autorise pas la déduction depuis le préfixe — explicite ou NULL.) |
| **`technology_type` potentiel** | PARTIEL — présent dans `description_fabricant` | OUI, perdu | `technology_type` à 0 % dans le JSON ; `description_fabricant` conservé dans le JSON mais perdu plus loin (RPC). |
| **`diameter_inner_mm` potentiel** | OUI, partiel — « diam.NNN » dans **59,4 %** (9 810/16 529) | OUI, perdu | `diameter_inner_mm` à 0 % dans le JSON. Le script cherche des colonnes dédiées absentes, et ne parse pas `description_fabricant`. |
| **`diameter_outer_mm` / `length_mm` / `angle_deg`** | PARTIEL — description / name | OUI, perdus | 0 % dans le JSON. |
| **`manufacturer_name` potentiel** | OUI — `brand_id/id` à 100 % (source possible) | NON perdu, mais ignoré | Le JSON contient `manufacturer_name="Poujoulat"` en valeur **statique** (config), pas lue de `brand_id/id`. Résultat correct ici (mono-marque). |
| **`valid_from` potentiel** | **NON** — aucune date tarif dans le CSV | NON applicable | 0 occurrence dans la source. Seule vraie absence-source. |

---

## 4. Où elles sont perdues

### Maillon 1 — `map_supplier.py` (responsable principal) — comportement généralisable

| Information | Ligne logique concernée | Impact métier |
|---|---|---|
| `of_seller_product_category_name` (127 catégories) | `map_row()` — la fonction ne référence **jamais** cette colonne. Elle ne lit que `item_family`/`family`/`famille` (absentes du CSV). | **La seule source fiable d'`item_family` ET de dérivation `product_type` est jetée dès le premier maillon.** |
| `item_family` | `map_row()` lit `item_family` (absent) et, même si trouvé, ne le sérialise pas dans le dict `item`. | `item_family` = NULL garanti. |
| `product_type` | Non dérivé de la catégorie ; valeur statique. | `product_type` constant en base, sans sémantique. |
| Diamètre / longueur / angle | `parse_mm()`/`parse_int()` cherchent des colonnes dédiées absentes ; aucune extraction depuis `description_fabricant`. | Dimensions = NULL alors que la donnée existe en clair dans la description (corpus Poujoulat : 59,4 %). |

### Maillon 2 — `import_supplier_direct.py` — comportement généralisable

| Information | Ligne logique | Impact |
|---|---|---|
| `of_seller_product_category_name` | **Absente de `SAFE_FIELDS`** (et absente du JSON de toute façon). | Confirme la perte ; même si le JSON la contenait, elle serait filtrée. |
| `description_fabricant` | **Présente dans `SAFE_FIELDS`** → transmise à la RPC. | Conservée jusqu'à la RPC. |
| `valid_from` | **Absente de `SAFE_FIELDS`** | Non transmise (et non produite en amont). |
| Prix d'achat | `FORBIDDEN_FIELDS` + `check_forbidden_fields()` | Filtrage correct (INVARIANT cost_price). |

### Maillon 3 — `catalog.import_supplier_items` (RPC) — comportement généralisable

| Information | Ligne logique | Impact métier |
|---|---|---|
| `description_fabricant` | Le corps de la RPC **ne lit jamais** `description_fabricant` (0 occurrence). Transmis dans `p_items` mais jamais inséré. | **La description riche (diamètre, technologie, gamme) est non persistée dans `catalog_items`**, après avoir survécu jusqu'au JSON. |
| `item_family` | 0 occurrence dans le corps. | Même si fourni, non persisté. |
| `valid_from` | 0 occurrence. | Non persisté. |
| `product_type` | Non dérivé en amont ; la RPC ne le corrige pas. | Reste statique. |

---

## 5. Impact sur catalog_items V1

- **`item_family`** : la source contient une taxonomie à 127 valeurs jamais lue. Le mapping
  `127 → 13` est réalisable (voir POUJOULAT_ITEM_FAMILY_MATRIX_V1). La perte est **imputable au
  pipeline, pas à la source**.
- **`product_type`** : dérivable de la même catégorie, non dérivé → valeur statique sans
  sémantique. Corrigeable par la règle de dérivation (SUPPLIER_MAPPING_STRATEGY_V1, C-1). Sur le
  corpus Poujoulat audité, les 127 catégories **permettent effectivement la dérivation**
  `product_type` (préfixe de gamme → `part` fumisterie ; consommables explicites → `consumable`).
  **Cas nécessitant une règle complémentaire** : les catégories fourre-tout `PRO/NC`, `SANS`,
  `SANS/AUC`, `AXAF/NC`, `PPMI/NC` mélangent pièces et consommables ; la distinction
  `part`/`consumable` y exige un raffinement sur le libellé (`name`) ou la description, pas la
  seule catégorie. Pour ces cas, la catégorie tranche `item_family` (fumisterie) mais pas
  finement `product_type` — règle complémentaire libellé/description requise.
- **Dimensions** : présentes dans `description_fabricant` (diamètre dans 59,4 % du corpus).
  Extractibles par parsing. Non bloquant (nullable) mais récupérable.
- **`description_fabricant`** : richesse réelle (ex. « Conduit de prise de mesure de fumées,
  double paroi, Laine de roche, THERM+ GEP diam.150 »). Survit jusqu'au JSON, perdue par la RPC.
- **`valid_from`** : seule vraie absence-source. À produire par convention (P-00b, Option A).
- **0 ligne rejetée** : `poujoulat_csv_skipped__2_.json` est vide. Les 16 529 lignes du corpus
  sont toutes mappées.

---

## 6. Conclusion finale

### Le constat « les données sont absentes dès la source » est INFIRMÉ par les fichiers réels.

La catégorie produit EXISTE dans la source (`of_seller_product_category_name`, 100 % rempli,
127 valeurs sur le corpus audité). La description fabricant EXISTE et est riche (diamètre
explicite dans 59,4 % des cas du corpus). Le diamètre est présent en clair dans la description.

### Constat corrigé

**Les données métier ne sont pas absentes de la source. Elles sont perdues par le pipeline.**
Pertes distinctes (comportements généralisables à tout fournisseur) :
1. `of_seller_product_category_name` → perdue par `map_supplier.py` (colonne jamais lue) →
   prive le pipeline de la source d'`item_family` ET de la dérivation `product_type`.
2. Dimensions dans `description_fabricant` → jamais parsées par `map_supplier.py`.
3. `description_fabricant` → non persistée dans `catalog_items` par la RPC `import_supplier_items`.

### Conséquence directe

Le prérequis P-00 (mapping Poujoulat → `item_family`) et P-00d (dérivation `product_type`)
**ne créent pas une information inexistante** : ils **cessent de jeter une information
existante**. La correction porte sur trois maillons coordonnés (voir
CATALOG_EXECUTION_PLAN_V1_FINAL, préambule). Corriger un seul maillon ne produit aucun effet en
base.

La seule donnée réellement absente de la source reste `valid_from`, qui relève d'une convention
d'import (P-00b, Option A : date du tarif source si disponible, sinon date d'import +
`data_quality_status='partial'`), pas d'une extraction.

---

Figé juin 2026. Audit de preuve — référence justifiant les corrections du plan d'exécution V1.1.
