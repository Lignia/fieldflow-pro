# CATALOG_ITEMS V1 — RÉFÉRENCE OFFICIELLE

> Statut : **FIGÉ** — Aucune modification sans décision fondateur explicite.
> Auteur : Thomas + Claude Analytics — juin 2026 (révision doctrine product_type/item_family, juin 2026)
> Ce document est la source de vérité unique pour `catalog.catalog_items`.
> Il annule et remplace tout document partiel antérieur sur le même sujet.

---

## 0. DOCTRINE DES AXES

`product_type` est l'**axe universel** du catalogue : tout article en possède un, quelle que soit sa nature (fumisterie, appareil, pièce détachée, consommable, prestation). C'est lui qui porte la nature commerciale de l'article.

`item_family` est une **sous-classification fumisterie** : elle qualifie la nature fumisterie d'un article. Elle est obligatoire pour les articles fumisterie et reste `NULL` pour les appareils, les pièces détachées d'appareil et les consommables non fumisterie. Elle n'est jamais rendue NOT NULL globalement, et aucune valeur nouvelle n'est créée en V1.

Les deux axes sont **complémentaires, jamais concurrents** : `product_type` dit *quelle nature*, `item_family` sous-classe la seule fumisterie. `catalog_items` est le référentiel commercial de tout ce qui se vend ; `heating_appliances` est le référentiel technique des appareils (sans donnée tarifaire), relié optionnellement via `heating_appliance_id` (champ V2 READY, non encore créé en base — voir section 2).

**Navigation catalogue.** La navigation se fait par `product_type` (niveau 1), puis `item_family` pour la fumisterie et `appliance_type` pour les appareils (niveau 2) ; `manufacturer_name` et `fuel_type` sont des filtres transverses. Un appareil à `item_family = NULL` n'est pas un trou de navigation : son axe de classement est `appliance_type`.

---

## 1. CHAMPS CORE

Obligatoires. Tout article qui ne respecte pas ces contraintes est rejeté par le pipeline d'import. Exception explicite : `item_family` est obligatoire pour la fumisterie uniquement (voir doctrine section 0 et R-03).

| Champ | Type | Défaut | Définition métier |
|---|---|---|---|
| `id` | UUID | gen_random_uuid() | Clé primaire |
| `supplier_ref` | TEXT | — | Référence immuable chez le fournisseur. Jamais modifiée après création. Clé d'idempotence des imports. |
| `supplier_name` | TEXT | — | Fournisseur d'achat — celui qui facture l'artisan. Clé de résolution de remise. |
| `name` | TEXT | — | Désignation commerciale. Affiché sur le devis, le bon de commande, la facture. |
| `product_type` | ENUM | — | **Axe universel du catalogue.** Nature commerciale de tout article. 4 valeurs fermées. Présent sur tout article. |
| `item_family` | TEXT | NULL | **Sous-classification fumisterie.** 13 valeurs fermées. Obligatoire pour les articles fumisterie uniquement ; `NULL` pour appareils, pièces d'appareil et consommables non fumisterie. Pilote la TVA suggérée et la navigation catalogue pour la fumisterie. |
| `valid_from` | DATE | — | Date de mise à jour du tarif fournisseur. Obligatoire dans tout import. |
| `unit_price_ht` | NUMERIC | — | Prix public HT. Base du calcul de remise. Seul prix stocké sur l'article. |
| `prix_sur_devis` | BOOLEAN | false | True si le prix n'est pas public et doit être saisi manuellement. |
| `vat_rate` | NUMERIC | — | Suggestion de TVA (règle D-24). Valeur par défaut, modifiable dans le devis (TVA contextuelle des prestations). |
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

**Valeurs fermées de `product_type` (4) :**
`appliance` · `part` · `service` · `consumable`

**Valeurs fermées de `item_family` (13) :**
`conduit_principal` · `systeme_etanche` · `tubage_flexible` · `tubage_rigide` · `raccordement_visible` · `raccordement_pellets_visible` · `sortie_toiture` · `gaine_technique` · `accessoire_fumisterie` · `adaptateur_transition` · `environment` · `service` · `labor`

`product_type` est l'axe universel et obligatoire ; `item_family` n'en est qu'une sous-classification fumisterie, obligatoire pour la seule fumisterie.

---

## 2. CHAMPS NULLABLE

Utiles. Alimentés progressivement selon les fournisseurs et les cas d'usage. Un article peut exister sans ces champs.

### Identification commerciale

| Champ | Type | Définition | Règle |
|---|---|---|---|
| `manufacturer_name` | TEXT | Fabricant réel quand il diffère du fournisseur d'achat | NULL si inconnu. Jamais forcé = `supplier_name`. Jamais déduit par parsing. |
| `model_ref` | TEXT | Nom du modèle commercial ("Alpha 3000") | Obligatoire pour les appareils dans le pipeline. |
| `supplier_range` | TEXT | Gamme commerciale fournisseur ("DP Orion Bois") | Source explicite ou NULL. Jamais inféré depuis un préfixe de catégorie. |
| `bareme_code` | TEXT | Code bordereau remise différenciée | Quand le CSV fournisseur le fournit. |
| `replaced_by_item_id` | UUID | FK vers l'article successeur | Quand un article est remplacé par une nouvelle référence. |
| `is_obsolete` | BOOLEAN | Discontinué, non commandable. Distinct de `is_active`. | Défaut false. Article encore utilisable en stock mais non réassortissable. |
| `heating_appliance_id` | UUID | **V2 READY — non encore créé en base.** Lien optionnel futur vers `heating_appliances`. | Ne pas utiliser en V1 tant que la migration n'existe pas. Fait partie de la doctrine cible (lien commercial → technique). |

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
| `appliance_type` | TEXT | Type d'appareil. Axe de navigation des appareils (niveau 2). | TEXT en base ; **8 valeurs fermées par convention pipeline** (non contraintes en base V1). Valeur inconnue → `needs_review`, jamais de valeur libre. **Interdit si `heating_appliance_id` est renseigné** (voir R-07, conditionnel V2). |
| `fuel_type` | TEXT | Compatibilité combustible | Uniquement si fourni explicitement par le fournisseur. Jamais inféré. |

**Valeurs fermées de `appliance_type` (8, convention pipeline) :**
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

> Note : `heating_appliance_id` est cité en section 2 comme V2 READY mais, contrairement aux colonnes ci-dessus, **n'existe pas encore en base** : sa création nécessitera une migration V2.

---

## 3. CHAMPS REJETÉS

Ces champs **ne doivent pas exister** dans `catalog_items` V1. Tout import ou RPC qui les alimente viole le modèle.

### Appartiennent à `heating_appliances`
`power_kw` · `efficiency_pct` · `label_flamme_verte` · `flue_diameter_mm` · `emission_co_mg` · `emission_cov_mg` · `emission_dust_mg` · `emission_nox_mg` · `emission_pm_cov_mg` · `weight_kg` · `warranty_years_manufacturer`

### Redondants avec des champs CORE ou NULLABLE V1
`sku` — redondant avec `supplier_ref`
`sku_code` — redondant avec `supplier_ref`
`brand` — redondant avec `manufacturer_name`
`product_kind` — remplacé par `item_family`
`dta_status` — remplacé par `has_dta` + `needs_human_review` + `review_reason`
`pricing_status` — remplacé par `prix_sur_devis`
`external_id` + `external_system` — remplacés par `source_system` + `source_file`

> Note : `product_type` **n'est plus rejeté**. Il est promu CHAMP CORE comme axe universel du catalogue (voir sections 0 et 1).

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
`device_category` · `energy_type` · `component_role` · `member_price` · `add_on_price_ht` · `recommendations` · `upgrades` · `hours_estimate` · `is_taxable` · `dimensions_cm` · `lifespan_years` · `flamme_verte_url` · `maprimrenov_description` · `other_vendors` · `installation_context` · `supplier_series` · `supplier_family` · `supplier_family_label` · `long_description` · `technical_description` · `material_inner` · `material_outer` · `inox_grade_inner` · `inox_grade_outer` · `finish_type` · `temperature_class` · `pressure_class` · `condensate_class` · `corrosion_class` · `sootfire_class` · `joint_type` · `seal_required` · `insulation_mm` · `test_report_number` · `test_norm` · `test_laboratory` · `warranty_years_installer` · `power_min_kw` · `efficiency_etas_pct` · `valid_until`

---

## 4. RÈGLES MÉTIER FIGÉES

Ces règles ne se rediscutent pas.

**R-01 — `supplier_ref` est immuable.**
La référence fournisseur ne peut jamais être modifiée après la création de l'article. C'est l'identifiant stable à travers les réimports, les mises à jour tarifaires et les échanges SAV.

**R-02 — Le prix d'achat n'existe pas sur l'article.**
`cost_price` n'existe pas dans `catalog_items`. Le prix net artisan est calculé à la volée par `resolve_item_price(item_id, tenant_id, purchase_supplier_name)` depuis `unit_price_ht` et `tenant_supplier_discounts`. Cette règle protège la confidentialité des remises négociées.

**R-03 — `item_family` est obligatoire pour la fumisterie uniquement, et ses valeurs sont fermées.**
`product_type` est l'axe universel et obligatoire de tout article. `item_family` est une sous-classification fumisterie : elle est obligatoire pour les articles fumisterie, et reste `NULL` pour les appareils (`product_type = 'appliance'`), les pièces détachées d'appareil (`product_type = 'part'` hors fumisterie) et les consommables non fumisterie (`product_type = 'consumable'` hors fumisterie). `item_family` n'est jamais rendue NOT NULL globalement. Aucune valeur hors des 13 valeurs fermées n'est acceptée, et aucune valeur nouvelle n'est créée en V1. Pour un article fumisterie, l'absence de famille le rend inutilisable (TVA, section de devis et prescription indéterminées) : le pipeline le rejette.

**R-04 — `valid_from` est obligatoire dans tout import.**
Tout fichier d'import sans date de tarif est rejeté. Un article sans date de tarif ne permet pas de savoir si ses prix sont à jour.

**R-05 — Jamais supprimer, toujours archiver.**
`is_active = false` est la seule façon de retirer un article du catalogue. La suppression physique casse les devis historiques, les commandes fournisseur et la traçabilité SAV.

**R-06 — `is_central = true` requiert `tenant_id IS NULL`, et inversement.**
Un article central appartient à tous les tenants et n'a pas de tenant_id. Un article privé appartient à un artisan et a un tenant_id. Ces deux états ne peuvent pas coexister.

**R-07 — `appliance_type` est interdit si `heating_appliance_id` est renseigné (conditionnel V2).**
Cette règle s'appliquera lorsque la colonne `heating_appliance_id` sera créée en base (V2). Un appareil lié à la base ADEME via `heating_appliance_id` tirera son type de `heating_appliances.appliance_type` ; la colonne `catalog_items.appliance_type` ne devra jamais dupliquer cette information. En V1, `heating_appliance_id` n'existant pas, `appliance_type` est l'axe de navigation des appareils.

**R-08 — `warning_message` et `review_reason` sont limités à 200 caractères.**
Ces champs sont des messages opérationnels courts destinés à l'artisan. Ils ne contiennent pas de règles normatives, de références DTU/CPT/DTA, ni de paragraphes d'explication.

**R-09 — `raw_metadata` n'est jamais exposé en UI ni dans les RPCs.**
Ce champ conserve les données brutes du CSV source à des fins d'audit import uniquement. Il n'est jamais inclus dans les RETURNS TABLE des RPCs ni dans les SELECT frontend.

**R-10 — `fuel_type` n'est jamais inféré automatiquement.**
La compatibilité combustible d'un article conduit n'est alimentée que si le fournisseur la fournit explicitement dans son CSV. Aucun pipeline ne calcule ou déduit cette valeur.

**R-11 — `product_type` est l'axe universel et obligatoire.**
Tout article porte un `product_type` parmi `appliance`, `part`, `service`, `consumable`. C'est l'axe de nature du catalogue ; il n'est jamais NULL. `item_family` ne le remplace pas : les deux axes sont complémentaires (voir section 0).

---

## 5. RÈGLES D'IMPORT FIGÉES

Ces règles s'appliquent à tout import dans `catalog_items`, quelle que soit la source.

**I-01 — Idempotence par `(supplier_name, supplier_ref)` pour les articles centraux.**
Tout réimport d'un article central déjà existant met à jour ses champs — il ne crée pas de doublon. La clé de déduplication est `(supplier_name, supplier_ref)` avec `is_central = true`.

**I-02 — Idempotence par `(tenant_id, supplier_name, supplier_ref)` pour les articles privés.**
Même règle pour les catalogues privés artisan.

**I-03 — `valid_from` est obligatoire dans chaque ligne du fichier source.**
Le pipeline rejette toute ligne sans cette valeur. La valeur doit correspondre à la date réelle du tarif fournisseur, pas à la date d'import.

**I-04 — `item_family` est obligatoire pour les lignes fumisterie uniquement.**
Le pipeline exige `item_family` (parmi les 13 valeurs fermées de la section 1) pour toute ligne dont le `product_type` relève de la fumisterie. Pour les appareils, les pièces détachées d'appareil et les consommables non fumisterie, `item_family` reste `NULL` et la ligne n'est pas rejetée pour ce motif. Toute valeur hors des 13 valeurs fermées est rejetée.

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

**I-11 — `product_type` est obligatoire dans chaque ligne du fichier source.**
Le pipeline détermine `product_type` (axe universel) pour toute ligne, notamment via la catégorie source. Une ligne dont le `product_type` ne peut être déterminé est signalée pour revue (`needs_review`), jamais classée par défaut silencieux.

---

*CATALOG-V1-FINAL — figé juin 2026 — Thomas + Claude Analytics*
*Révision doctrine product_type/item_family — juin 2026.*
*Document de référence officielle. Annule CATALOG_ITEMS_V1_CANONICAL.md pour toute question de périmètre des champs.*
