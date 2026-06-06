# CATALOG_ITEMS REBUILD PLAN V1

> Statut : **PRÊT À EXÉCUTER**
> Auteur : Claude Analytics + Thomas — juin 2026
> Sources : CATALOG_ITEMS_V1_CANONICAL.md · Gap Analysis · Reconstruction Impact Report
> Pas de SQL dans ce document. Ce document est le plan d'instruction pour Claude Exec.

---

## Contexte

- Pas de clients réels. Les données actuelles sont des données de test.
- 22 796 lignes actuelles, 99,86 % orphelines (jamais référencées par un devis).
- 33 lignes réellement utilisées par `billing.quote_lines`, toutes centrales.
- La base peut être reconstruite proprement.
- Les arbitrages métier sont définitifs. Ne pas les remettre en question.

---

## 1. Colonnes à conserver

### CORE — obligatoires, non nullables dans la structure cible

| Colonne | Type actuel | Cible nullabilité | Remarque |
|---|---|---|---|
| `id` | uuid NOT NULL | NOT NULL | Inchangé |
| `name` | text NOT NULL | NOT NULL | Inchangé |
| `supplier_ref` | text **nullable** | **NOT NULL** | Rendre non nullable |
| `supplier_name` | text **nullable** | **NOT NULL** | Rendre non nullable |
| `item_family` | text nullable (CHECK 13 valeurs + NULL) | **NOT NULL** | Retirer IS NULL du CHECK |
| `valid_from` | date nullable | **NOT NULL** | Rendre non nullable |
| `unit_price_ht` | numeric nullable (CHECK >= 0) | **NOT NULL** | Rendre non nullable |
| `vat_rate` | numeric nullable (CHECK >= 0) | **NOT NULL** | Rendre non nullable |
| `unit` | USER-DEFINED nullable | **NOT NULL** | Rendre non nullable |
| `prix_sur_devis` | boolean NOT NULL default false | NOT NULL | Inchangé |
| `is_active` | boolean NOT NULL default true | NOT NULL | Inchangé |
| `is_central` | boolean NOT NULL default false | NOT NULL | Inchangé |
| `needs_human_review` | boolean NOT NULL default false | NOT NULL | Inchangé |
| `is_sellable` | boolean nullable default true | **NOT NULL** | Rendre non nullable |
| `is_purchasable` | boolean nullable default true | **NOT NULL** | Rendre non nullable |
| `is_labor` | boolean nullable default false | **NOT NULL** | Rendre non nullable |
| `is_kit` | boolean nullable default false | **NOT NULL** | Rendre non nullable |
| `discount_allowed` | boolean nullable default true | **NOT NULL** | Rendre non nullable |
| `tenant_id` | uuid nullable | NULLABLE | Inchangé (NULL = central) |
| `search_vector` | tsvector nullable | NULLABLE | Calculé par trigger |
| `created_at` | timestamptz NOT NULL | NOT NULL | Inchangé |
| `modified_at` | timestamptz NOT NULL | NOT NULL | Inchangé |

### NULLABLE V1 — présents en base, conformes, à conserver tels quels

| Colonne | Remarque |
|---|---|
| `manufacturer_name` | |
| `model_ref` | |
| `supplier_range` | |
| `bareme_code` | |
| `replaced_by_item_id` | Auto-référence FK |
| `diameter_inner_mm` | |
| `diameter_outer_mm` | |
| `length_mm` | |
| `angle_deg` | |
| `is_insulated` | |
| `is_etanche` | |
| `has_dta` | Actuellement NOT NULL, cible NULLABLE — voir section 4 |
| `technology_type` | |
| `warning_message` | Contrainte longueur ≤ 200 char à ajouter |
| `eligible_fonds_air_bois` | |
| `ce_marking` | |
| `eco_design` | |
| `appliance_type` | CHECK 8 valeurs existant à conserver |
| `fuel_type` | CHECK 6 valeurs existant à conserver |
| `environment_category` | CHECK 10 valeurs existant à conserver |
| `description` | |
| `quote_description` | |
| `search_keywords` | |
| `normalized_name` | |
| `import_batch_id` | |
| `source_system` | |
| `source_file` | |
| `normalization_status` | |
| `data_quality_status` | CHECK 4 valeurs existant à conserver |
| `deee_tax_ht` | |
| `catalog_id` | Actuellement NOT NULL, cible NULLABLE — voir section 4 |

### V2 READY — présents en base, à conserver sans forcer

| Colonne | Remarque |
|---|---|
| `distributor_name` | Utilisé par `resolve_item_price` |
| `primary_vendor` | JSONB, jamais alimenté en V1 |
| `min_order_qty` | Jamais alimenté en V1 |
| `lead_time_days` | Jamais alimenté en V1 |

### EXTRA actifs — absents du modèle V1 mais utilisés par des RPC ou le frontend

Ces colonnes ne font pas partie du modèle canonique V1 mais **sont lues ou écrites par des RPC ou composants actifs**. Elles ne peuvent pas être supprimées sans mise à jour préalable de leurs dépendances. Elles sont conservées provisoirement jusqu'à refonte des RPC concernées.

| Colonne | Dépendance bloquante |
|---|---|
| `product_type` | `import_supplier_items`, `save_lines_as_bundle`, `search_quote_items_v2`, `useCatalog.ts`, `QuoteEditor.tsx` |
| `product_kind` | `import_supplier_items`, `search_quote_items_v2`, `QuoteEditor.tsx` (categorize) |
| `brand` | `import_supplier_items`, `replace_quote_lines`, `useCatalog.ts`, `QuoteEditor.tsx` |
| `dta_status` | `search_quote_items_v2`, `QuoteEditor.tsx` (prescription snapshot) |
| `sku` | `import_supplier_items`, `refresh_item_search_vector`, `save_lines_as_bundle`, `search_quote_items_v2` — clé de déduplication dans la RPC |
| `sku_code` | `import_supplier_items`, `search_quote_items_v2` — clé de déduplication primaire dans la RPC |
| `energy_type` | `import_supplier_items`, `search_quote_items_v2` |
| `component_role` | `import_supplier_items` |
| `pricing_status` | `search_quote_items_v2` |
| `normalization_confidence` | `import_supplier_items`, `search_quote_items_v2`, `useCatalog.ts` |
| `normalization_source` | `import_supplier_items` |
| `parser_version` | `import_supplier_items` |
| `customer_label` | `replace_quote_lines` |
| `finish_color` | `import_supplier_items`, `search_quote_items_v2` |
| `cost_price` | `import_supplier_items`, `search_quote_items_v2`, `useCatalog.ts` — INVARIANT 2 violé mais CHECK NULL actif |
| `weight_kg` | Aucun usage actif. À supprimer sans dépendance bloquante. |

---

## 2. Colonnes à supprimer

### Aucune dépendance RPC ni frontend — suppression directe

| Colonne | Motif |
|---|---|
| `device_category` | REJETÉ V1. Index orphelin à supprimer aussi. |
| `member_price` | REJETÉ V1. |
| `add_on_price_ht` | REJETÉ V1. |
| `recommendations` | REJETÉ V1. |
| `upgrades` | REJETÉ V1. |
| `hours_estimate` | REJETÉ V1. |
| `is_taxable` | REJETÉ V1. |
| `flue_diameter_mm` | REJETÉ V1 (appartient à `heating_appliances`). |
| `dimensions_cm` | REJETÉ V1. |
| `lifespan_years` | REJETÉ V1. |
| `flamme_verte_url` | REJETÉ V1. |
| `maprimrenov_description` | REJETÉ V1. |
| `other_vendors` | REJETÉ V1. |
| `installation_context` | REJETÉ V1. |
| `external_id` | REJETÉ V1. |
| `external_system` | REJETÉ V1. |
| `supplier_series` | REJETÉ V1. |
| `raw_label` | REJETÉ V1. |
| `long_description` | REJETÉ V1. |
| `technical_description` | REJETÉ V1. |
| `fuel_detail` | REJETÉ V1. CHECK `catalog_items_fuel_detail_check` à supprimer aussi. |
| `flue_connection` | REJETÉ V1. CHECK `catalog_items_flue_connection_check` à supprimer aussi. |
| `material_inner` | REJETÉ V1. |
| `material_outer` | REJETÉ V1. |
| `inox_grade_inner` | REJETÉ V1. |
| `inox_grade_outer` | REJETÉ V1. |
| `finish_type` | REJETÉ V1. |
| `temperature_class` | REJETÉ V1. |
| `pressure_class` | REJETÉ V1. |
| `condensate_class` | REJETÉ V1. |
| `corrosion_class` | REJETÉ V1. |
| `sootfire_class` | REJETÉ V1. |
| `joint_type` | REJETÉ V1. |
| `seal_required` | REJETÉ V1. |
| `insulation_mm` | REJETÉ V1. |
| `emission_co_mg` | REJETÉ V1 (appartient à `heating_appliances`). |
| `emission_cov_mg` | REJETÉ V1. |
| `emission_dust_mg` | REJETÉ V1. |
| `emission_nox_mg` | REJETÉ V1. |
| `emission_pm_cov_mg` | REJETÉ V1. |
| `test_report_number` | REJETÉ V1. |
| `test_norm` | REJETÉ V1. |
| `test_laboratory` | REJETÉ V1. |
| `warranty_years_manufacturer` | REJETÉ V1 (appartient à `heating_appliances`). |
| `warranty_years_installer` | REJETÉ V1. |
| `power_kw` | REJETÉ V1 (appartient à `heating_appliances`). |
| `power_min_kw` | REJETÉ V1. |
| `efficiency_pct` | REJETÉ V1 (appartient à `heating_appliances`). |
| `efficiency_etas_pct` | REJETÉ V1. |
| `label_flamme_verte` | REJETÉ V1 (appartient à `heating_appliances`). |
| `valid_until` | REJETÉ V1. |
| `supplier_family` | REJETÉ V1. |
| `supplier_family_label` | REJETÉ V1. |
| `weight_kg` | EXTRA sans usage. |

### Dépendance RPC ou frontend — suppression conditionnelle à la refonte des RPC

Ces colonnes sont REJETÉES dans le modèle V1 mais ne peuvent être supprimées qu'après mise à jour des RPC qui les consomment.

| Colonne | Bloquer jusqu'à |
|---|---|
| `sku` | Refonte `search_quote_items_v2` (clé de déduplication) + `import_supplier_items` + `save_lines_as_bundle` |
| `sku_code` | Idem |
| `energy_type` | Refonte `search_quote_items_v2` + `import_supplier_items` |
| `component_role` | Refonte `import_supplier_items` |
| `pricing_status` | Refonte `search_quote_items_v2` |
| `normalization_confidence` | Refonte `search_quote_items_v2` + `import_supplier_items` |
| `normalization_source` | Refonte `import_supplier_items` |
| `parser_version` | Refonte `import_supplier_items` |
| `customer_label` | Refonte `replace_quote_lines` (retirer de l'INSERT) |
| `finish_color` | Refonte `search_quote_items_v2` + `import_supplier_items` |
| `cost_price` | Refonte `search_quote_items_v2` (retirer du RETURNS TABLE) + `import_supplier_items` |

---

## 3. Colonnes à créer

Ces 5 colonnes sont définies dans le modèle V1 et absentes de la base actuelle.

| Colonne | Type | Contrainte | Valeur par défaut |
|---|---|---|---|
| `is_obsolete` | BOOLEAN | NULLABLE | `false` |
| `review_reason` | TEXT | NULLABLE, CHECK `length(review_reason) <= 200` | — |
| `image_url` | TEXT | NULLABLE | — |
| `technical_doc_url` | TEXT | NULLABLE | — |
| `raw_metadata` | JSONB | NULLABLE | — |

---

## 4. Contraintes à conserver

| Contrainte | Type | Définition | Remarque |
|---|---|---|---|
| `catalog_items_pk` | PK | PRIMARY KEY (id) | |
| `catalog_items_id_tenant_unique` | UNIQUE | UNIQUE (id, tenant_id) | FK croisée multi-tenant |
| `uq_catalog_items_central_supplier_ref` | UNIQUE partiel | (supplier_name, supplier_ref) WHERE is_central=true AND supplier_ref IS NOT NULL AND supplier_ref <> '' | Idempotence import central |
| `uq_catalog_items_tenant_supplier_ref` | UNIQUE partiel | (tenant_id, supplier_name, supplier_ref) WHERE tenant_id IS NOT NULL AND supplier_ref IS NOT NULL AND supplier_ref <> '' | Idempotence import privé |
| `catalog_items_catalog_fk` | FK | (catalog_id, tenant_id) → catalogs(id, tenant_id) ON DELETE CASCADE | |
| `catalog_items_replaced_by_item_id_fkey` | FK | replaced_by_item_id → catalog_items(id) | Auto-référence |
| `chk_catalog_items_cost_price_null` | CHECK | cost_price IS NULL | INVARIANT 2 — à conserver tant que cost_price existe |
| `check_central_consistency` | CHECK | (is_central=true AND tenant_id IS NULL) OR (is_central=false AND tenant_id IS NOT NULL) | |
| `catalog_items_unit_price_ht_check` | CHECK | unit_price_ht >= 0 | |
| `catalog_items_vat_rate_check` | CHECK | vat_rate >= 0 | |
| `catalog_items_item_family_check` | CHECK | item_family IN (13 valeurs) **sans IS NULL** | Retirer la clause IS NULL pour enforcer NOT NULL sémantique |
| `catalog_items_environment_category_check` | CHECK | environment_category IN (10 valeurs) | |
| `catalog_items_appliance_type_check` | CHECK | appliance_type IN (8 valeurs) | |
| `catalog_items_fuel_type_check` | CHECK | fuel_type IN (6 valeurs) | |
| `catalog_items_data_quality_status_check` | CHECK | data_quality_status IN (4 valeurs) | |
| `catalog_items_dta_status_check` | CHECK | dta_status IN (4 valeurs) | Liée à colonne EXTRA active `dta_status` |

### Modifications de nullabilité à appliquer sur les contraintes existantes

| Champ | Changement |
|---|---|
| `catalog_id` | NOT NULL → **NULLABLE** (V1 dit nullable jusqu'à audit) |
| `has_dta` | NOT NULL → **NULLABLE** défaut false (V1 dit nullable) |
| `item_family` | CHECK retirer la clause `IS NULL` pour interdire les nulls |

---

## 5. Contraintes à supprimer

| Contrainte | Motif |
|---|---|
| `catalog_items_device_category_check` | Colonne `device_category` supprimée |
| `catalog_items_fuel_detail_check` | Colonne `fuel_detail` supprimée |
| `catalog_items_flue_connection_check` | Colonne `flue_connection` supprimée |
| `catalog_items_pricing_status_check` | Colonne EXTRA `pricing_status` — à supprimer après refonte RPC |
| `ux_catalog_items_catalog_sku` | Index UNIQUE (catalog_id, sku) — dépend de `sku` (REJETÉ V1) |

---

## 6. Index à conserver

| Index | Définition | Remarque |
|---|---|---|
| `catalog_items_pk` | UNIQUE (id) | |
| `catalog_items_id_tenant_unique` | UNIQUE (id, tenant_id) | FK croisées |
| `uq_catalog_items_central_supplier_ref` | UNIQUE partiel supplier_ref central | Idempotence import |
| `uq_catalog_items_tenant_supplier_ref` | UNIQUE partiel supplier_ref privé | Idempotence import |
| `idx_catalog_items_search_vector` | GIN (search_vector) | Recherche FTS |
| `idx_catalog_items_name_trgm` | GIN (name gin_trgm_ops) | Recherche trigramme |
| `idx_catalog_items_diameter_inner` | btree partiel (tenant_id, diameter_inner_mm) WHERE diameter_inner_mm IS NOT NULL | Filtrage diamètre |
| `idx_catalog_items_supplier_range` | btree partiel (tenant_id, supplier_range) WHERE supplier_range IS NOT NULL | Navigation gamme |
| `idx_catalog_items_technology_type` | btree partiel (tenant_id, technology_type) WHERE technology_type IS NOT NULL | Filtrage technologie |
| `idx_catalog_items_normalization_status` | btree partiel (tenant_id, normalization_status) WHERE normalization_status IS NOT NULL | Pilotage qualité import |
| `idx_catalog_items_pricing` | btree partiel (distributor_name, bareme_code) WHERE is_central=true | Résolution remise |
| `idx_catalog_items_product_kind` | btree partiel (tenant_id, product_kind) WHERE product_kind IS NOT NULL | EXTRA actif — à conserver provisoirement |

---

## 7. Index à supprimer

| Index | Motif |
|---|---|
| `idx_catalog_items_brand` | Colonne EXTRA `brand` sans index justifié dans V1 — à supprimer après refonte RPC |
| `idx_catalog_items_device_category` | Colonne `device_category` supprimée |
| `idx_catalog_items_sku` | Colonne `sku_code` REJETÉ V1 — à supprimer après refonte RPC |
| `idx_catalog_items_type` | Porte sur `product_type` (EXTRA) — à supprimer après refonte RPC |
| `ux_catalog_items_catalog_sku` | UNIQUE (catalog_id, sku) — sku REJETÉ V1 |

---

## 8. RPC impactées

### RPC à mettre à jour (RETURNS TABLE modifiés ou colonnes supprimées)

| RPC | Type d'impact | Colonnes à retirer du RETURNS TABLE ou du corps |
|---|---|---|
| `catalog.search_quote_items_v2` (+ wrapper `public.`) | **Critique** | Retirer du RETURNS TABLE : `sku`, `sku_code`, `cost_price`, `normalization_confidence`, `pricing_status`, `energy_type_simple`. Remplacer la clé de déduplication `sku_code` par `supplier_ref`. Retirer `finish_color` du scoring si la colonne est supprimée. |
| `catalog.import_supplier_items` (+ wrapper `public.`) | Important | Retirer les références à : `sku`, `sku_code`, `cost_price`, `energy_type`, `component_role`, `normalization_confidence`, `normalization_source`, `parser_version`, `finish_color`, `customer_label`. |
| `catalog.save_lines_as_bundle` | Mineur | Retirer `sku` si utilisé dans le SELECT interne. |
| `catalog.refresh_item_search_vector` | Mineur | Retirer `sku` du corps si présent. |
| `billing.replace_quote_lines` | Mineur | Retirer `customer_label` de l'INSERT. |

### RPC conformes — aucune modification requise

| RPC | Statut |
|---|---|
| `catalog.resolve_item_price` | Conforme V1. Ne toucher à aucun paramètre. |
| `catalog.delete_catalog_with_items` | Conforme V1. |
| `billing.sign_quote_and_initialize` | Pas d'accès direct à `catalog_items`. |
| `billing.transition_quote_status` | Idem. |
| `core.finalize_installation_from_survey` | Idem. |
| `operations.complete_commissioning` | Idem. |
| `operations.complete_field_intervention` | Idem. |

---

## 9. Composants frontend impactés

### Composants nécessitant une mise à jour

| Fichier | SHA actuel | Champ impacté | Nature de la mise à jour |
|---|---|---|---|
| `src/hooks/useCatalog.ts` | f8606ffe | `cost_price`, `sku`, `normalization_confidence` dans `ITEM_COLUMNS` | Retirer ces colonnes de la constante ITEM_COLUMNS et du type `CatalogItem` |
| `src/hooks/useCatalogSearch.ts` | 9e544522 | Type `CatalogItem` retourné par `search_quote_items_v2` | Mettre à jour le type TypeScript une fois le RETURNS TABLE de la RPC modifié |
| `src/pages/quotes/QuoteEditor.tsx` | 17e85e8c | `catalogItem.cost_price` utilisé dans `addItem()` en mode DEV_BYPASS | Retirer la référence à `cost_price` dans la branche DEV_BYPASS. Le chemin normal (`resolve_item_price`) ne l'utilise pas. |

### Composants conformes — aucune modification requise

| Fichier | Statut |
|---|---|
| `src/hooks/useSignQuote.ts` | Pas d'accès direct à `catalog_items` |
| `src/pages/catalog/CatalogImport.tsx` | Lit `supplier_brands`, pas `catalog_items` |
| `src/pages/InstallationDetail.tsx` | Accès via FK `installations.catalog_item_id` — SET NULL |
| `src/pages/InterventionDetail.tsx` | Idem |
| `src/pages/ServiceRequestCreate.tsx` | Idem |

---

## 10. Ordre d'exécution idéal

L'ordre respecte les dépendances : on ne supprime pas une colonne avant d'avoir mis à jour les RPC qui la lisent. On ne rend pas une colonne NOT NULL avant d'avoir vérifié que tous les imports l'alimentent correctement.

### Étape 1 — Créer les colonnes manquantes (aucun risque, colonnes nullable)

Ajouter sur `catalog_items` :
- `is_obsolete BOOLEAN DEFAULT false`
- `review_reason TEXT` avec CHECK `length(review_reason) <= 200`
- `image_url TEXT`
- `technical_doc_url TEXT`
- `raw_metadata JSONB`

Ajouter la contrainte longueur sur `warning_message` :
- CHECK `warning_message IS NULL OR length(warning_message) <= 200`

### Étape 2 — Corriger les nullabilités simples (colonnes sans usage RPC critique)

Pour chaque colonne CORE actuellement nullable, rendre NOT NULL avec sa valeur par défaut :
- `is_sellable` NOT NULL DEFAULT true
- `is_purchasable` NOT NULL DEFAULT true
- `is_labor` NOT NULL DEFAULT false
- `is_kit` NOT NULL DEFAULT false
- `discount_allowed` NOT NULL DEFAULT true

Corriger les colonnes actuellement trop contraintes :
- `catalog_id` : retirer NOT NULL (rendre NULLABLE)
- `has_dta` : retirer NOT NULL (rendre NULLABLE, garder DEFAULT false)

### Étape 3 — Supprimer les colonnes REJETÉES sans dépendance RPC/frontend

Supprimer en une seule migration :
`device_category`, `member_price`, `add_on_price_ht`, `recommendations`, `upgrades`, `hours_estimate`, `is_taxable`, `flue_diameter_mm`, `dimensions_cm`, `lifespan_years`, `flamme_verte_url`, `maprimrenov_description`, `other_vendors`, `installation_context`, `external_id`, `external_system`, `supplier_series`, `raw_label`, `long_description`, `technical_description`, `fuel_detail`, `flue_connection`, `material_inner`, `material_outer`, `inox_grade_inner`, `inox_grade_outer`, `finish_type`, `temperature_class`, `pressure_class`, `condensate_class`, `corrosion_class`, `sootfire_class`, `joint_type`, `seal_required`, `insulation_mm`, `emission_co_mg`, `emission_cov_mg`, `emission_dust_mg`, `emission_nox_mg`, `emission_pm_cov_mg`, `test_report_number`, `test_norm`, `test_laboratory`, `warranty_years_manufacturer`, `warranty_years_installer`, `power_kw`, `power_min_kw`, `efficiency_pct`, `efficiency_etas_pct`, `label_flamme_verte`, `valid_until`, `supplier_family`, `supplier_family_label`, `weight_kg`

Supprimer les CHECK associés : `catalog_items_device_category_check`, `catalog_items_fuel_detail_check`, `catalog_items_flue_connection_check`

Supprimer les index associés : `idx_catalog_items_device_category`

### Étape 4 — Mettre à jour `search_quote_items_v2` (RPC la plus critique)

Créer `search_quote_items_v3` (jamais modifier en place — D-04) :
- Retirer du RETURNS TABLE : `sku`, `sku_code`, `cost_price`, `normalization_confidence`, `pricing_status`, `energy_type_simple`, `finish_color`
- Remplacer la clé de déduplication `sku_code` par `supplier_ref`
- Mettre à jour le wrapper `catalog.search_quote_items_v3`
- Mettre à jour le wrapper `public.search_quote_items_v3`
- Mettre à jour `src/hooks/useCatalogSearch.ts` pour appeler `search_quote_items_v3`
- Vérifier que la recherche fonctionne en test
- Archiver `search_quote_items_v2` (ne pas supprimer immédiatement)

### Étape 5 — Mettre à jour `import_supplier_items`

Créer une nouvelle version `import_supplier_items_v2` :
- Retirer les colonnes REJETÉES des INSERT
- Mettre à jour le wrapper `public.`
- Vérifier l'idempotence sur un import test

### Étape 6 — Supprimer les colonnes EXTRA avec dépendances, une fois les RPC mises à jour

Après validation de `search_quote_items_v3` et `import_supplier_items_v2` :

Supprimer : `sku`, `sku_code`, `cost_price`, `energy_type`, `component_role`, `pricing_status`, `normalization_confidence`, `normalization_source`, `parser_version`, `customer_label`, `finish_color`

Supprimer les CHECK : `catalog_items_pricing_status_check`

Supprimer les index : `idx_catalog_items_sku`, `ux_catalog_items_catalog_sku`, `idx_catalog_items_brand`, `idx_catalog_items_type`

### Étape 7 — Rendre NOT NULL les colonnes CORE critiques

Après que le pipeline d'import alimente correctement ces colonnes sur toutes les nouvelles données :
- `supplier_ref` NOT NULL
- `supplier_name` NOT NULL
- `unit_price_ht` NOT NULL
- `vat_rate` NOT NULL
- `unit` NOT NULL

**Attention :** Ne rendre ces colonnes NOT NULL qu'après vérification que 0 ligne a une valeur NULL dans la base reconstruite.

### Étape 8 — Rendre `item_family` obligatoire en base

Modifier le CHECK `catalog_items_item_family_check` pour retirer la clause `IS NULL`. Cela enforcea NOT NULL au niveau SQL en complément de la règle pipeline.

**Attention :** Ne faire cette étape qu'après que tous les articles importés ont un `item_family` renseigné (notamment Poujoulat).

### Étape 9 — Rendre `valid_from` NOT NULL

Après que tous les imports alimentent cette colonne. Vérifier que 0 ligne a `valid_from IS NULL` avant d'appliquer.

### Étape 10 — Nettoyage final et archivage des RPC v2

- Archiver ou supprimer `search_quote_items_v2` (legacy)
- Archiver ou supprimer `search_quote_items` (v1 legacy)
- Mettre à jour `src/hooks/useCatalog.ts` : retirer `cost_price`, `sku`, `normalization_confidence` de `ITEM_COLUMNS`
- Mettre à jour le type `CatalogItem` TypeScript
- Retirer la référence à `cost_price` dans la branche `DEV_BYPASS` de `QuoteEditor.tsx`

---

## Résumé des comptages

| Catégorie | Colonnes |
|---|---|
| À conserver (CORE + NULLABLE V1 + V2 READY) | 55 |
| À conserver provisoirement (EXTRA actifs, dépendances RPC) | 15 |
| À créer (manquants V1) | 5 |
| À supprimer sans dépendance (étape 3) | 53 |
| À supprimer après refonte RPC (étapes 4-6) | 11 |
| **Total actuel** | **116** |
| **Total cible V1** | **60** |

---

## Garde-fous transverses

1. **Ne jamais DROP TABLE ni DELETE les lignes de données** — seulement DROP COLUMN.
2. **Les FK entrantes (quote_lines, invoice_lines, installations) sont toutes SET NULL** — la suppression de colonnes n'impacte pas les snapshots.
3. **Tester `resolve_item_price` après chaque étape** — c'est la RPC la plus critique. Elle ne doit pas être modifiée.
4. **Créer `_v3` avant de toucher `_v2`** — règle D-04 : jamais modifier une RETURNS TABLE en place.
5. **Vérifier les index UNIQUE sur supplier_ref** avant de rendre la colonne NOT NULL — les 8 articles sans supplier_ref identifiés en audit doivent être traités avant l'étape 7.

---

*REBUILD-PLAN-V1 — juin 2026 — fondateur Thomas + Claude Analytics*
