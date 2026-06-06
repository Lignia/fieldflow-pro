# CATALOG_ITEMS V1 — RÉFÉRENCE OFFICIELLE

> Statut : **FIGÉ** — Aucune modification sans décision fondateur explicite.
> Auteur : Thomas + Claude Analytics — juin 2026
> Ce document est la source de vérité unique pour `catalog.catalog_items`.
> Il annule et remplace tout document partiel antérieur sur le même sujet.

---

## 1. CHAMPS CORE

Obligatoires. Non nullables. Tout article qui ne respecte pas ces contraintes est rejeté par le pipeline d'import.

| Champ | Type | Défaut | Définition métier |
|---|---|---|---|
| `id` | UUID | gen_random_uuid() | Clé primaire |
| `supplier_ref` | TEXT | — | Référence immuable chez le fournisseur. Jamais modifiée après création. Clé d'idempotence des imports. |
| `supplier_name` | TEXT | — | Fournisseur d'achat — celui qui facture l'artisan. Clé de résolution de remise. |
| `name` | TEXT | — | Désignation commerciale. Affiché sur le devis, le bon de commande, la facture. |
| `item_family` | TEXT | — | Catégorie LIGNIA. 13 valeurs fermées. Pilote la TVA suggérée et la navigation catalogue. |
| `valid_from` | DATE | — | Date de mise à jour du tarif fournisseur. Obligatoire dans tout import. |
| `unit_price_ht` | NUMERIC | — | Prix public HT. Base du calcul de remise. Seul prix stocké sur l'article. |
| `prix_sur_devis` | BOOLEAN | false | True si le prix n'est pas public et doit être saisi manuellement. |
| `vat_rate` | NUMERIC | — | Suggestion de TVA calculée selon `item_family` (règle D-24). Modifiable dans le devis. |
| `unit` | ENUM | — | Unité de vente (u, m, ml, forfait, h). |
| `is_active` | BOOLEAN | true | False = article archivé. Jamais supprimer, toujours archiver. |
| `is_sellable` | BOOLEAN | true | Peut être proposé dans un devis. |
| `is_purchasable` | BOOLEAN | true | Peut être commandé fournisseur. |
| `is_labor` | BOOLEAN | false | True = prestation de main d'œuvre. Distinction physique/prestation pour TVA et comptabilité. |
| `is_kit` | BOOLEAN | false | True = assemblage de composants. |
| `is_central` | BOOLEAN | false | True = article partagé tous tenants. False = article privé artisan. |
| `tenant_id` | UUID | NULL | NULL = article central. UUID = article privé d'un artisan. |
| `discount_allowed` | BOOLEAN | true | False = prix net imposé, aucune remise applicable. |
| `needs_human_review` | BOOLEAN | false | True = article bloqué pour vérification sécurité DTU/DTA uniquement. |
| `search_vector` | TSVECTOR | calculé | Vecteur full-text calculé par trigger. Pilote la recherche catalogue. |

**Valeurs fermées de `item_family` (13) :**
`conduit_principal` · `systeme_etanche` · `tubage_flexible` · `tubage_rigide` · `raccordement_visible` · `raccordement_pellets_visible` · `sortie_toiture` · `gaine_technique` · `accessoire_fumisterie` · `adaptateur_transition` · `environment` · `service` · `labor`

---

## 2. CHAMPS NULLABLE

Utiles. Alimentés progressivement selon les fournisseurs et les cas d'usage. Un article peut exister sans ces champs.

### Identification commerciale

| Champ | Type | Définition | Règle |
|---|---|---|---|
| `manufacturer_name` | TEXT | Fabricant réel quand il diffère du fournisseur d'achat | NULL si inconnu. Jamais forcé = `supplier_name`. |
| `model_ref` | TEXT | Nom du modèle commercial ("Alpha 3000") | Obligatoire pour les appareils dans le pipeline. |
| `supplier_range` | TEXT | Gamme commerciale fournisseur ("DP Orion Bois") | Quand le CSV fournisseur le fournit. |
| `bareme_code` | TEXT | Code bordereau remise différenciée | Quand le CSV fournisseur le fournit. |
| `replaced_by_item_id` | UUID | FK vers l'article successeur | Quand un article est remplacé par une nouvelle référence. |
| `is_obsolete` | BOOLEAN | Discontinué, non commandable. Distinct de `is_active`. | Défaut false. Article encore utilisable en stock mais non réassortissable. |

### Dimensions fumisterie

| Champ | Type | Définition | Règle |
|---|---|---|---|
| `diameter_inner_mm` | SMALLINT | Diamètre intérieur de l'élément conduit | Obligatoire pour les familles fumisterie dans le pipeline. |
| `diameter_outer_mm` | SMALLINT | Diamètre extérieur | Double paroi uniquement. |
| `length_mm` | SMALLINT | Longueur de l'élément | Éléments dimensionnés. |
| `angle_deg` | SMALLINT | Angle des coudes (45°, 90°) | Coudes uniquement. |
| `is_insulated` | BOOLEAN | Conduit isolé double paroi | Conduits double paroi. |
| `is_etanche` | BOOLEAN | Système étanche (NHR) | Impacte la TVA suggérée à 20% par prudence. |

### Prescription et sécurité

| Champ | Type | Définition | Règle |
|---|---|---|---|
| `has_dta` | BOOLEAN | Dispose d'un DTA conforme | Défaut false. Nullable — tous les fournisseurs ne transmettent pas l'information. |
| `technology_type` | TEXT | Type technologique fumisterie | Obligatoire pour les familles fumisterie dans le pipeline. |
| `warning_message` | TEXT | Message court affiché à l'artisan dans le devis | **Maximum 200 caractères.** Jamais de règle normative. |
| `review_reason` | TEXT | Explication courte du blocage `needs_human_review` | **Maximum 200 caractères.** Renseigné quand `needs_human_review = true`. |

### Éligibilités et conformité

| Champ | Type | Définition | Règle |
|---|---|---|---|
| `eligible_fonds_air_bois` | BOOLEAN | Éligible Fonds Air Bois | Défaut false. |
| `ce_marking` | BOOLEAN | Marquage CE | Défaut false. |
| `eco_design` | BOOLEAN | Conforme Écoconception 2022 | Défaut false. |

### Appareils

| Champ | Type | Définition | Règle |
|---|---|---|---|
| `appliance_type` | TEXT | Type d'appareil | **Interdit si `heating_appliance_id` est renseigné.** 8 valeurs fermées. |
| `fuel_type` | TEXT | Compatibilité combustible | Uniquement si fourni explicitement par le fournisseur. Jamais inféré. |

**Valeurs fermées de `appliance_type` (8) :**
`poele_bois` · `poele_granules` · `insert_bois` · `insert_granules` · `chaudiere_bois` · `chaudiere_granules` · `foyer_ferme` · `cheminee_foyer_ouvert`

**Valeurs fermées de `fuel_type` (6) :**
`wood` · `pellet` · `gas` · `oil` · `mixed` · `other`

### Taxonomie spécifique

| Champ | Type | Définition | Règle |
|---|---|---|---|
| `environment_category` | TEXT | Taxonomie articles environnement | 10 valeurs fermées. Articles `item_family = 'environment'` uniquement. |

**Valeurs fermées de `environment_category` (10) :**
`grille_air_chaud` · `arrivee_air_frais` · `distribution_air_chaud` · `protection_murale` · `protection_sol` · `protection_securite` · `rangement_bois` · `rangement_granules` · `accessoire_entretien` · `accessoire_decoratif`

### Présentation

| Champ | Type | Définition | Règle |
|---|---|---|---|
| `description` | TEXT | Description courte complémentaire | |
| `quote_description` | TEXT | Description spécifique pour le devis | |
| `image_url` | TEXT | URL photo produit externe | Jamais de blob en base. URL uniquement. |
| `technical_doc_url` | TEXT | URL notice technique PDF | Priorité sur `image_url`. |

### Recherche

| Champ | Type | Définition | Règle |
|---|---|---|---|
| `search_keywords` | TEXT | Synonymes et abréviations | Alimenté par le pipeline de normalisation. |
| `normalized_name` | TEXT | Nom normalisé pipeline | |

### Import et qualité

| Champ | Type | Définition | Règle |
|---|---|---|---|
| `import_batch_id` | UUID | UUID de la campagne d'import | Traçabilité et rollback. |
| `source_system` | TEXT | Nom du système source | Ex : "Lorflex_CSV", "ADEME" |
| `source_file` | TEXT | Nom du fichier CSV source | |
| `normalization_status` | TEXT | État de normalisation | Ex : "normalized", "partial", "raw" |
| `data_quality_status` | TEXT | Qualité globale des données | 4 valeurs fermées. |
| `raw_metadata` | JSONB | Champs bruts non mappés du CSV source | **Jamais exposé en UI ni dans les RPCs.** |

**Valeurs fermées de `data_quality_status` (4) :**
`complete` · `partial` · `uncertain` · `invalid`

### Logistique

| Champ | Type | Définition | Règle |
|---|---|---|---|
| `deee_tax_ht` | NUMERIC | Éco-taxe DEEE | Appareils électroniques uniquement (poêles granulés). |
| `catalog_id` | UUID | Appartenance au catalogue source | NULLABLE jusqu'à définition métier actée de la table `catalogs`. |

### Colonnes V2 READY

Présentes en base, non alimentées en V1, activables sans migration.

| Champ | Trigger d'activation |
|---|---|
| `distributor_name` | Premier artisan avec grossiste multi-fabricants distincts |
| `primary_vendor` | V2 multi-distributeurs |
| `min_order_qty` | V2 commande fournisseur active |
| `lead_time_days` | V2 commande fournisseur active |

---

## 3. CHAMPS REJETÉS

Ces champs **ne doivent pas exister** dans `catalog_items` V1. Tout import ou RPC qui les alimente viole le modèle.

### Appartiennent à `heating_appliances`
`power_kw` · `efficiency_pct` · `label_flamme_verte` · `flue_diameter_mm` · `emission_co_mg` · `emission_cov_mg` · `emission_dust_mg` · `emission_nox_mg` · `emission_pm_cov_mg` · `weight_kg` · `warranty_years_manufacturer`

### Redondants avec des champs CORE ou NULLABLE V1
`sku` — redondant avec `supplier_ref`
`sku_code` — redondant avec `supplier_ref`
`brand` — redondant avec `manufacturer_name`
`product_type` — remplacé par `item_family` + `is_labor`
`product_kind` — remplacé par `item_family`
`dta_status` — remplacé par `has_dta` + `needs_human_review` + `review_reason`
`pricing_status` — remplacé par `prix_sur_devis`
`external_id` + `external_system` — remplacés par `source_system` + `source_file`

### Prix d'achat — invariant absolu
`cost_price` — **le prix d'achat n'est jamais stocké sur l'article.** Il est calculé à la volée par `resolve_item_price` depuis `unit_price_ht` et `tenant_supplier_discounts`.

### Données techniques non-métier
`normalization_confidence` · `normalization_source` · `parser_version` · `raw_label`

### Données appartenant à d'autres référentiels
`customer_label` — appartient à `quote_lines`
`finish_color` — appartient à `heating_appliances` ou aux variantes appareils
`flue_connection` — appartient à `heating_appliances`
`fuel_detail` — redondant avec `fuel_type` plus granulaire

### Données sans usage V1 identifié
`device_category` · `energy_type` · `component_role` · `member_price` · `add_on_price_ht` · `recommendations` · `upgrades` · `hours_estimate` · `is_taxable` · `dimensions_cm` · `lifespan_years` · `flamme_verte_url` · `maprimrenov_description` · `other_vendors` · `installation_context` · `supplier_series` · `supplier_family` · `supplier_family_label` · `long_description` · `technical_description` · `fuel_detail` · `flue_connection` · `material_inner` · `material_outer` · `inox_grade_inner` · `inox_grade_outer` · `finish_type` · `temperature_class` · `pressure_class` · `condensate_class` · `corrosion_class` · `sootfire_class` · `joint_type` · `seal_required` · `insulation_mm` · `test_report_number` · `test_norm` · `test_laboratory` · `warranty_years_installer` · `power_min_kw` · `efficiency_etas_pct` · `valid_until`

---

## 4. RÈGLES MÉTIER FIGÉES

Ces règles ne se rediscutent pas.

**R-01 — `supplier_ref` est immuable.**
La référence fournisseur ne peut jamais être modifiée après la création de l'article. C'est l'identifiant stable à travers les réimports, les mises à jour tarifaires et les échanges SAV.

**R-02 — Le prix d'achat n'existe pas sur l'article.**
`cost_price` n'existe pas dans `catalog_items`. Le prix net artisan est calculé à la volée par `resolve_item_price(item_id, tenant_id, purchase_supplier_name)` depuis `unit_price_ht` et `tenant_supplier_discounts`. Cette règle protège la confidentialité des remises négociées.

**R-03 — `item_family` est obligatoire et ses valeurs sont fermées.**
Tout article sans `item_family` est un article inutilisable dans LIGNIA : la TVA est indéterminée, la section de devis est indéterminée, la prescription est aveugle. Le pipeline rejette tout article sans famille. Aucune valeur hors liste n'est acceptée.

**R-04 — `valid_from` est obligatoire dans tout import.**
Tout fichier d'import sans date de tarif est rejeté. Un article sans date de tarif ne permet pas de savoir si ses prix sont à jour.

**R-05 — Jamais supprimer, toujours archiver.**
`is_active = false` est la seule façon de retirer un article du catalogue. La suppression physique casse les devis historiques, les commandes fournisseur et la traçabilité SAV.

**R-06 — `is_central = true` requiert `tenant_id IS NULL`, et inversement.**
Un article central appartient à tous les tenants et n'a pas de tenant_id. Un article privé appartient à un artisan et a un tenant_id. Ces deux états ne peuvent pas coexister.

**R-07 — `appliance_type` est interdit si `heating_appliance_id` est renseigné.**
Un appareil lié à la base ADEME via `heating_appliance_id` tire son type de `heating_appliances.appliance_type`. La colonne `catalog_items.appliance_type` ne doit jamais dupliquer cette information.

**R-08 — `warning_message` et `review_reason` sont limités à 200 caractères.**
Ces champs sont des messages opérationnels courts destinés à l'artisan. Ils ne contiennent pas de règles normatives, de références DTU/CPT/DTA, ni de paragraphes d'explication.

**R-09 — `raw_metadata` n'est jamais exposé en UI ni dans les RPCs.**
Ce champ conserve les données brutes du CSV source à des fins d'audit import uniquement. Il n'est jamais inclus dans les RETURNS TABLE des RPCs ni dans les SELECT frontend.

**R-10 — `fuel_type` n'est jamais inféré automatiquement.**
La compatibilité combustible d'un article conduit n'est alimentée que si le fournisseur la fournit explicitement dans son CSV. Aucun pipeline ne calcule ou déduit cette valeur.

---

## 5. RÈGLES D'IMPORT FIGÉES

Ces règles s'appliquent à tout import dans `catalog_items`, quelle que soit la source.

**I-01 — Idempotence par `(supplier_name, supplier_ref)` pour les articles centraux.**
Tout réimport d'un article central déjà existant met à jour ses champs — il ne crée pas de doublon. La clé de déduplication est `(supplier_name, supplier_ref)` avec `is_central = true`.

**I-02 — Idempotence par `(tenant_id, supplier_name, supplier_ref)` pour les articles privés.**
Même règle pour les catalogues privés artisan.

**I-03 — `valid_from` est obligatoire dans chaque ligne du fichier source.**
Le pipeline rejette toute ligne sans cette valeur. La valeur doit correspondre à la date réelle du tarif fournisseur, pas à la date d'import.

**I-04 — `item_family` est obligatoire dans chaque ligne du fichier source.**
Le pipeline rejette toute ligne sans cette valeur. La valeur doit appartenir aux 13 valeurs fermées définies en section 1.

**I-05 — `supplier_ref` est obligatoire et non vide dans chaque ligne.**
Le pipeline rejette toute ligne avec `supplier_ref` NULL ou vide. Sans référence fournisseur, l'idempotence est impossible.

**I-06 — `cost_price` n'est jamais transmis dans un fichier d'import.**
Aucun CSV fournisseur, aucun script de mapping ne doit produire un champ `cost_price`. Le pipeline rejette tout fichier contenant ce champ.

**I-07 — Les champs REJETÉS ne sont jamais transmis.**
Les colonnes listées en section 3 ne font pas partie du format d'import V1. Le pipeline les ignore s'ils sont présents dans le CSV source (ils ne sont pas écrits en base).

**I-08 — `manufacturer_name` est alimenté avec la valeur exacte du fabricant réel.**
Jamais forcé à la valeur de `supplier_name`. Si le fabricant est inconnu, le champ reste NULL.

**I-09 — `diameter_inner_mm` est obligatoire pour les familles fumisterie.**
Toute ligne avec `item_family` IN (`conduit_principal`, `systeme_etanche`, `tubage_flexible`, `tubage_rigide`, `raccordement_visible`, `raccordement_pellets_visible`, `sortie_toiture`) sans `diameter_inner_mm` est rejetée ou signalée en avertissement selon la configuration du pipeline.

**I-10 — `is_central` et `tenant_id` sont cohérents.**
Un import central (Joncoux, Poujoulat, KEMP) produit des lignes avec `is_central = true` et `tenant_id = NULL`. Un import privé artisan produit des lignes avec `is_central = false` et `tenant_id = UUID_du_tenant`. Un pipeline qui mélange les deux états est en erreur.

---

*CATALOG-V1-FINAL — figé juin 2026 — Thomas + Claude Analytics*
*Document de référence officielle. Annule CATALOG_ITEMS_V1_CANONICAL.md pour toute question de périmètre des champs.*
