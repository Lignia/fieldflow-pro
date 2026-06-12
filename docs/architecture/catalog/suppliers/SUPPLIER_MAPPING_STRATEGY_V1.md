# SUPPLIER MAPPING STRATEGY V1 — méthode générique fournisseur

> Statut : OFFICIEL — figé juin 2026. Méthode réutilisable pour tout fournisseur.
> Référence cible : CATALOG_ITEMS_V1_FINAL.md (modèle). Séquence : CATALOG_EXECUTION_PLAN_V1_FINAL.md.
> Cas concret de référence : suppliers/POUJOULAT_ITEM_FAMILY_MATRIX_V1.md.
> Décisions sources : D-09, D-21 (supplier/manufacturer/distributor), D-13 superseded (manufacturer_name NULL si inconnu), D-24 (TVA), D-31 (product_type axe universel), D-32 (item_family conditionnel fumisterie).

---

## Principe directeur

L'audit pipeline a établi un fait structurant : l'information métier la plus fiable n'est pas
dans le libellé `name`, mais dans une **colonne de catégorie fournisseur structurée** (chez
Poujoulat : `of_seller_product_category_name`, 127 valeurs, 100 % remplie).

Règle d'or : **chercher la taxonomie fournisseur AVANT de parser le texte.** Le libellé est
une source de dernier recours, bruitée, réservée à l'enrichissement optionnel.

---

## 1. Champs source à rechercher, par priorité

### Priorité 1 — Catégorie / classification structurée
Clé de `item_family` (fumisterie) ET de `product_type` (universel). Chercher, dans cet ordre :
- catégorie vendeur (`of_seller_product_category_name`, `product_category_name`, `categ_id/name`)
- famille (`family`, `famille`, `product_family`)
- gamme (`range`, `gamme`, `series`)
- classification ERP propriétaire (codes type `THRM/ACTH`, `ST../TCP`, `APP/POÊLE`)

Une colonne à cardinalité utile (dizaines à centaines de valeurs) est exploitable ; une colonne
mono-valeur (ex. `categ_id/id = product.product_category_all`) est inutile et ignorée.

### Priorité 2 — Référence et prix (obligatoires garantis)
- référence : `default_code` (Odoo), `code_interne_<fournisseur>`, `supplier_ref`, `reference`, `ref`, `code`
- prix public : `list_price`, `lst_price`, `prix_tarif_<année>`, `prix_public`, `tarif_price`, `unit_price_ht`

### Priorité 3 — Libellé et descriptions (enrichissement)
- nom : `name`, `designation_article`, `designation`, `libelle`
- description fabricant : `description_fabricant`, `description_sale`, `description` — source
  secondaire de dimensions/technologie (chez Poujoulat : « diam.150 », « double paroi »,
  « Laine de roche » dans ~59 % des descriptions).

### Priorité 4 — Marque / fabricant
- `brand_id/id`, `manufacturer`, `marque`, ou colonne fabricant par ligne (ex. `frs` chez Lorflex).

### Champs source à filtrer impérativement (jamais importés)
Tout champ de coût/achat/marge : `cost_price`, `net_price`, `prix_achat`, `purchase_price`,
`of_seller_price`, `of_seller_pp_ht`, `seller_ids/pp_ht`, `seller_ids/price`, `of_sale_coeff`,
`standard_price`, `of_import_remise`, `discount_pct`, `remise`. Filtrés et listés comme ignorés
(INVARIANT cost_price — R-02 / I-06 / D-25).

---

## 2. Construction du mapping fournisseur → modèle canonique

Méthode en 4 niveaux, appliquée à chaque fournisseur.

### Niveau A — Champs directs (copie / renommage)
- référence source → `supplier_ref` (brut, jamais transformé : ni `.upper()`, ni `strip` destructif — R-01)
- libellé source → `name`
- prix public source → `unit_price_ht`

### Niveau B — Champs par configuration statique
Valeur fixée par fournisseur, indépendante des lignes :
- `supplier_name` (canal d'achat qui facture l'artisan — D-09 / D-21)
- `manufacturer_name` (fabricant réel ; statique, ou lu par ligne pour un distributeur multi-marques)
- `distributor_name` (enseigne commerciale, ex. Lorflex — D-21)
- `vat_rate` par défaut (suggestion — D-24)

> **Règle `manufacturer_name` inconnu (D-13 superseded → I-08).** Si le fabricant est inconnu,
> le champ reste **`NULL`**. Jamais la chaîne sentinelle `'unknown'`, jamais forcé à
> `supplier_name`. Cohérent avec CATALOG_ITEMS_V1_FINAL.md (I-08) et D-09 / D-21.

### Niveau C — Dérivation des axes de nature (cœur de la méthode)

Deux axes complémentaires sont dérivés de la catégorie source (Priorité 1) :

**C-1 — `product_type` (axe universel, obligatoire — D-31).**
Règle de dérivation `catégorie source → product_type` :
- catégorie d'appareil (préfixe `APP/`, « POÊLE », « INSERT », « CHAUDIÈRE », « FOYER », « PAC ») → `appliance`
- catégorie de prestation / ouvrage / service → `service`
- catégorie de consommable explicitement identifiée (granulés, produits d'entretien, consommables) → `consumable`
- catégorie de fumisterie ou de pièce physique → `part` par défaut ; `consumable` uniquement
  si la catégorie est explicitement un consommable
- catégorie indéterminable → `data_quality_status='needs_review'`, import bloqué jusqu'à
  arbitrage. `product_type` ne prend jamais la valeur `'needs_review'`.

`product_type` n'est jamais NULL et n'est jamais affecté par valeur constante d'import.

**C-2 — `item_family` (sous-classification fumisterie, conditionnelle — D-32).**
- Uniquement pour les articles fumisterie : matrice figée `catégorie source → item_family`
  (13 valeurs fermées), établie une fois à partir des valeurs distinctes de la colonne catégorie.
  Méthode validée sur Poujoulat (127 → 13, couverture 100 %).
- Pour les appareils (`product_type='appliance'`), les pièces (`product_type='part'`) hors
  fumisterie et les consommables (`product_type='consumable'`) hors fumisterie : `item_family`
  reste `NULL`. Ne jamais inventer de famille, ne jamais créer de valeur nouvelle.
- Les prestations liées au chauffage bois peuvent porter `item_family='service'` ou `'labor'`
  (conformément à D-18 ; voir R-12 du modèle) ; `product_type='service'` reste la source de
  vérité du filtrage.

**Catégorie fumisterie inconnue (hors matrice) : règle P-00.** Stop de l'item fumisterie +
`data_quality_status='needs_review'` + rapport obligatoire. Ne s'applique pas aux appareils
(qui n'ont pas d'`item_family`).

**C-3 — `appliance_type` (navigation appareils).**
Pour `product_type='appliance'` : dériver `appliance_type` depuis la catégorie source vers
l'une des 8 valeurs **contraintes par le CHECK `catalog_items_appliance_type_check`**
(`poele_bois`, `poele_granules`, `insert_bois`, `insert_granules`, `chaudiere_bois`,
`chaudiere_granules`, `foyer_ferme`, `cheminee_foyer_ouvert`). Valeur inconnue →
`data_quality_status='needs_review'`, jamais de valeur libre (le CHECK la rejetterait).

### Niveau D — Champs par extraction secondaire (optionnel, hors chemin critique)
Extraction de dimensions/couleur depuis `description_fabricant` ou `name` par motifs
(`diam.NNN`, `Ø NNN`, `NNN mm`, `NN°`). Tout champ ainsi déduit porte
`data_quality_status='uncertain'` et n'est JAMAIS utilisé pour un champ obligatoire.

### Règle d'ordre
A et B sont déterministes (confiance haute). C dépend de la qualité de la colonne catégorie.
D est best-effort. Un champ obligatoire ne repose jamais sur D seul.

---

## 3. Champs du modèle V1 à alimenter

### Obligatoires (la chaîne garantit une valeur, sinon needs_review)
- `supplier_ref` — Niveau A.
- `supplier_name` — Niveau B.
- `name` — Niveau A.
- `unit_price_ht` — Niveau A.
- `vat_rate` — Niveau B (suggestion D-24, surchargeable au devis).
- `unit` — Niveau B (défaut `u`).
- `product_type` — **Niveau C-1, obligatoire, jamais NULL, jamais statique (D-31).**
- `item_family` — **Niveau C-2, obligatoire fumisterie uniquement (D-32).**
- `valid_from` — Niveau B selon la règle ci-dessous.

> **Règle `valid_from` (Option A actée — P-00b).** Date explicite du tarif présente dans le
> fichier source si disponible ; sinon date d'import (`CURRENT_DATE`) avec
> `data_quality_status='partial'`. Jamais d'import sans `valid_from` (R-04 / I-03).

### Optionnels (alimentés si la source le permet, NULL acceptable sinon)
- `manufacturer_name` — Niveau B (NULL si inconnu — D-13 superseded).
- `appliance_type` — Niveau C-3 (appareils).
- `fuel_type` — Niveau B/D, uniquement si fourni explicitement (jamais inféré — R-10).
- `supplier_range` — source explicite ou NULL ; jamais inféré d'un préfixe de catégorie.
- `technology_type`, dimensions — Niveau D.
- `description` — Niveau A si colonne présente ET si la RPC la persiste.
- `normalized_name`, `search_keywords` — calculés par le pipeline.

### Ignorés (présents en source, jamais importés)
- Tout champ de coût/achat/marge (INVARIANT cost_price — R-02 / D-25).
- Codes internes redondants (`sku`, `sku_code`, `article_ref`, `article_code`).
- Champs ERP techniques sans valeur métier (`property_cost_method`, `of_import_categ_id`, `uom_po_id`…).
- Catégorie générique mono-valeur (`categ_id/id` quand mono-valeur).

---

## 4. Intégration des formats de source

### OpenFire / Odoo (CSV export mono-fournisseur)
Référence pour Poujoulat, Bofill, Modinox, Dix-Neuf, Tubest, KEMP. Colonnes `default_code`,
`name`, `list_price`, et surtout `of_seller_product_category_name` (taxonomie exploitable).
Stratégie : Niveau A pour réf/nom/prix, Niveau C sur la catégorie vendeur. Attention :
`categ_id/id` est souvent mono-valeur (inutile).

### CSV fabricants (format propriétaire)
Joncoux, Lorflex. Colonnes propriétaires (`code_interne_joncoux`, `designation_article`,
`prix_tarif_<année>`, parfois `frs` pour le fabricant réel). Nécessitent souvent une correction
d'encodage (mojibake). Vérifier la présence d'une colonne famille/gamme propriétaire avant de
retomber sur le parsing de libellé.

### XLS fabricants
À convertir en CSV UTF-8 avant traitement (le pipeline ne lit pas le binaire Excel). Étape de
conversion hors pipeline, à tracer.

### Tarif centralisé multi-marques (format à variantes)
Format observé (export « Flamme du Monde / Nova ») : multi-marques, colonnes préfixées
`product_variant_ids/...`, ~74 colonnes. **Profil de parsing distinct à prévoir** : il ne suit
pas la structure mono-fournisseur. Non couvert par les configs `map_supplier.py` actuelles.
**Hors périmètre des premiers imports pilotes** (confirmé) : à traiter comme un profil dédié
quand il deviendra prioritaire.

### Invariant transverse
Quelle que soit la source : (1) localiser la colonne catégorie, (2) mesurer sa cardinalité
utile, (3) dériver `product_type` (C-1) et, pour la fumisterie, `item_family` (C-2),
(4) compléter par A/B, (5) D en option. Si aucune colonne catégorie exploitable n'existe, le
fournisseur bascule en « mapping spécifique » (section 5).

**La nature d'un article ne se déduit jamais de `supplier_name` ou `manufacturer_name`.**
Un même fabricant peut commercialiser :
- des appareils,
- des pièces détachées,
- des consommables,
- des prestations.
`product_type` se dérive uniquement de la catégorie source.

---

## 5. Fournisseurs : statut et mapping spécifique

Statuts « PROUVÉ » (vérifié sur fichier ou code) vs « À VÉRIFIER » (déduit, fichier non audité).

| Fournisseur | Format | Colonne catégorie ? | Mapping spécifique ? | Statut |
|---|---|---|---|---|
| **Poujoulat** | Odoo OpenFire | OUI — `of_seller_product_category_name`, 127 valeurs (PROUVÉ) | OUI — matrice 127→13 établie | Référence. Matrice validée. |
| **Joncoux** | CSV propriétaire (via Lorflex) | À VÉRIFIER sur fichier source ; `item_family` déjà peuplé en base (preuve mapping fonctionnel) | PROBABLE | Config `joncoux` dédiée. supplier=Joncoux, distributor=Lorflex (D-21). |
| **Bofill** | Odoo | PROBABLE (structure Odoo) | MOYEN | Jamais importé proprement. Confirmer présence catégorie. |
| **Lorflex** | CSV propriétaire (= Joncoux) | À VÉRIFIER | OUI — cas `frs` (fabricant par ligne) | Distributeur multi-fabricants. |
| **KEMP** | Odoo | PROBABLE | OUI — actuellement dry-run only | `item_family='environment'` (D-20). Matrice à établir avant import réel. |
| **Modinox / Dix-Neuf / Tubest** | Odoo | PROBABLE | MOYEN | Config présente, fichiers non audités. |
| **Dinak** | propriétaire | À VÉRIFIER | MOYEN | Config présente. |
| **Appareils (Invicta, Dixneuf, Ravelli, etc.)** | catalogue technique (Invicta : sans prix) + tarif OpenFire | catégorie `APP/*` (PROUVÉ sur export multi-marques) | OUI | Commercial → catalog_items ; technique → heating_appliances (lien `heating_appliance_id` = P1 READY, non créé). |
| **Jeremias** | multi-variantes | NON exploitable directement | OUI — cas complexe | Profil spécifique requis (hors périmètre pilote) : 1 ligne source = N diamètres. |

### Synthèse de l'effort
- **Méthode générique applicable telle quelle** : tout fournisseur Odoo exposant une catégorie
  vendeur exploitable (Poujoulat confirmé ; Bofill / KEMP probables).
- **Matrice spécifique à établir** : un dictionnaire `catégorie → item_family` (fumisterie) +
  une règle `catégorie → product_type` par fournisseur. Effort proportionnel au nombre de
  catégories distinctes, pas au nombre d'articles.
- **Cas hors standard** : Lorflex (fabricant par ligne), Jeremias (éclatement multi-variantes,
  hors pilote), tarif centralisé multi-marques (profil de parsing dédié, hors pilote).

---

## 6. Conditions de fiabilité (rappel)

La stratégie ne produit des axes fiables que si les **trois maillons** du pipeline sont corrigés
(voir CATALOG_EXECUTION_PLAN_V1_FINAL, préambule) :
1. `map_supplier.py` LIT la catégorie source, dérive `product_type` (C-1), `item_family`
   fumisterie (C-2), `appliance_type` (C-3).
2. `map_supplier.py` SÉRIALISE `item_family`, `product_type`, `valid_from` dans le JSON.
3. La RPC `import_supplier_items` PERSISTE `item_family`, `product_type`, `valid_from`.

Tant que ces trois maillons ne sont pas corrigés, toute matrice fournisseur reste sans effet en
base. La méthode est nécessaire mais non suffisante.

---

## 7. Règle d'or (rappel)

**Chercher la taxonomie fournisseur avant de parser le texte.** La catégorie structurée est la
clé primaire de `product_type` (universel) et d'`item_family` (fumisterie). Tout fournisseur
dont la source ne contient aucune colonne catégorie exploitable est traité comme un cas
spécifique, avec décision explicite — jamais par devinette sur le libellé pour un champ
obligatoire. Catégorie indéterminable → `data_quality_status='needs_review'`, import bloqué
jusqu'à arbitrage.

**La nature d'un article ne se déduit jamais de `supplier_name` ou `manufacturer_name`.**
Un même fabricant peut commercialiser des appareils, des pièces détachées, des consommables et
des prestations. `product_type` se dérive uniquement de la catégorie source.

---

Figé juin 2026. Méthode de mapping de référence pour tous les fournisseurs V1.
