# CATALOG_ITEMS V1 — MODÈLE CANONIQUE FIGÉ

> Statut : **FIGÉ** — Ne pas modifier sans décision fondateur explicite.
> Auteur : Claude Analytics + Thomas — juin 2026
> Ce document est la source de vérité pour la reconstruction de `catalog.catalog_items`.

---

## Règle de gouvernance — tout nouveau champ futur

Avant tout ajout d'un champ dans `catalog_items`, répondre OUI à au moins une question :

- Apparaît-il sur le devis ?
- Apparaît-il sur le bon de commande ?
- Participe-t-il au calcul de prix ?
- Participe-t-il à la TVA ?
- Participe-t-il à la recherche ?

**Si la réponse est NON à toutes → le champ va dans un autre référentiel.**

---

## Règle de séparation catalog_items / heating_appliances

`catalog_items` = catalogue commercial. Ce qu'on vend, ce qu'on commande, ce qu'on met dans un devis.

`heating_appliances` = référentiel technique ADEME. Ce qu'on pose. Puissance, émissions, label, diamètre de sortie fumée.

**Un champ appartient à `catalog_items` si et seulement si sa valeur est nécessaire pour afficher une ligne de devis, calculer un prix, ou construire un bon de commande.**

---

## Invariants absolus — ne jamais remettre en question

1. **`supplier_ref` est immuable.** Jamais modifié après création. Idempotence import, bon de commande, SAV.
2. **`cost_price` n'existe pas.** Prix d'achat jamais stocké sur l'article. Calculé par `resolve_item_price`.
3. **`item_family` est obligatoire.** Pipeline rejette si absent. 13 valeurs fermées.
4. **`valid_from` est obligatoire dans tout import.** Pipeline rejette tout fichier sans date.
5. **Jamais supprimer, toujours archiver.** `is_active = false` uniquement.

---

## V1 CORE — Obligatoires, non nullables

| Champ | Définition métier |
|---|---|
| `id` | Clé primaire UUID |
| `supplier_ref` | Référence immuable chez le fournisseur |
| `supplier_name` | Fournisseur d'achat — clé remise et commande |
| `name` | Désignation commerciale — affiché partout |
| `item_family` | Catégorie LIGNIA — 13 valeurs fermées — pilote TVA et navigation |
| `valid_from` | Date de mise à jour du tarif — obligatoire pipeline |
| `unit_price_ht` | Prix public HT — base calcul remise |
| `prix_sur_devis` | True si pas de prix public — défaut false |
| `vat_rate` | Suggestion TVA calculée selon item_family (D-24) |
| `unit` | Unité de vente |
| `is_active` | Archivage — jamais supprimer — défaut true |
| `is_sellable` | Proposé dans les devis — défaut true |
| `is_purchasable` | Proposé dans les commandes — défaut true |
| `is_labor` | Prestation main d'œuvre vs article physique — défaut false |
| `is_kit` | Assemblage de composants — défaut false |
| `is_central` | Central tous tenants vs privé artisan — défaut false |
| `tenant_id` | NULL = central, UUID = privé artisan |
| `discount_allowed` | False = prix net imposé — défaut true |
| `needs_human_review` | Blocage sécurité DTU/DTA uniquement — défaut false |
| `search_vector` | Vecteur full-text calculé par trigger |

**Remarques CORE :**
- `catalog_id` : présent mais **NULLABLE** jusqu'à définition métier actée de la table `catalogs`. Ne jamais rendre NOT NULL avant audit Claude Read.
- `is_central` : redondant avec `tenant_id IS NULL` mais utilisé dans les RPC. **Cible de simplification post-audit Claude Read. Ne pas toucher en V1.**
- `has_dta` : **NULLABLE défaut false** — pas CORE. Tous les fournisseurs ne transmettent pas l'information. Utiliser `needs_human_review = true` quand l'information est inconnue.

---

## V1 NULLABLE — Utiles, alimentés progressivement

### Identification commerciale
| Champ | Définition | Règle |
|---|---|---|
| `manufacturer_name` | Fabricant réel quand connu | NULL si inconnu. Jamais forcé = `supplier_name`. |
| `model_ref` | Nom du modèle commercial | Obligatoire pipeline pour appareils, nullable sinon |
| `supplier_range` | Gamme commerciale fournisseur | Quand le CSV le fournit |
| `bareme_code` | Code bordereau remise différenciée | Quand le CSV le fournit |
| `replaced_by_item_id` | FK vers article successeur | Quand article remplacé |
| `is_obsolete` | Discontinué, non commandable | Défaut false — distinct de `is_active` |

### Dimensions fumisterie
| Champ | Définition | Règle |
|---|---|---|
| `diameter_inner_mm` | Diamètre intérieur de l'élément conduit | Obligatoire pipeline si famille fumisterie |
| `diameter_outer_mm` | Diamètre extérieur | Double paroi uniquement |
| `length_mm` | Longueur de l'élément | Éléments dimensionnés |
| `angle_deg` | Angle des coudes | Coudes uniquement |
| `is_insulated` | Conduit isolé double paroi | Conduits double paroi |
| `is_etanche` | Système étanche — impacte TVA 20% par prudence | Conduits concentriques NHR |

### Prescription et sécurité
| Champ | Définition | Règle |
|---|---|---|
| `has_dta` | Dispose d'un DTA conforme | Défaut false — nullable |
| `technology_type` | Type technologique fumisterie | Obligatoire pipeline si famille fumisterie |
| `warning_message` | Message court artisan dans le devis | **Max 200 caractères.** Jamais de règle normative. |
| `review_reason` | Explication du blocage `needs_human_review` | Quand `needs_human_review = true` |

### Éligibilités et conformité
| Champ | Définition | Règle |
|---|---|---|
| `eligible_fonds_air_bois` | Éligibilité Fonds Air Bois | Défaut false |
| `ce_marking` | Marquage CE | Défaut false |
| `eco_design` | Conforme Écoconception | Défaut false |

### Appareils (transition avant lien heating_appliances)
| Champ | Définition | Règle |
|---|---|---|
| `appliance_type` | Type d'appareil — 8 valeurs fermées | **Interdit si `heating_appliance_id` est renseigné.** Jamais en doublon. |
| `fuel_type` | Compatibilité combustible | Uniquement si fourni explicitement par le fournisseur. Jamais inféré. |

### Taxonomie spécifique
| Champ | Définition | Règle |
|---|---|---|
| `environment_category` | Taxonomie KEMP — 10 valeurs fermées | Articles `item_family = 'environment'` uniquement |

### Présentation et devis
| Champ | Définition | Règle |
|---|---|---|
| `description` | Description courte complémentaire | |
| `quote_description` | Description spécifique pour le devis | |
| `image_url` | URL photo produit externe | Ne pas bloquer un import si absent |
| `technical_doc_url` | URL notice technique PDF | Priorité sur `image_url` |

### Recherche
| Champ | Définition | Règle |
|---|---|---|
| `search_keywords` | Synonymes et abréviations | Pipeline normalisation |
| `normalized_name` | Nom normalisé pipeline | |

### Import et qualité
| Champ | Définition | Règle |
|---|---|---|
| `import_batch_id` | UUID campagne d'import | Traçabilité et rollback |
| `source_system` | Nom du système source | |
| `source_file` | Fichier source CSV | |
| `normalization_status` | État normalisation | |
| `data_quality_status` | Qualité données — 4 valeurs | |
| `raw_metadata` | JSONB champs bruts non mappés | Jamais exposé en UI ni dans les RPCs |

### Logistique
| Champ | Définition | Règle |
|---|---|---|
| `deee_tax_ht` | Éco-taxe DEEE | Appareils électroniques |
| `catalog_id` | Appartenance catalogue source | NULLABLE jusqu'à définition actée |

---

## V2 READY — Documenter, ne pas implémenter

| Champ | Trigger |
|---|---|
| `distributor_name` | Premier artisan avec grossiste multi-fabricants distincts |
| `eco_label` (A+/A/B) | Import Invicta/Nova |
| `performance_index_i` | Import Invicta/Nova |
| `flamme_verte_equivalence` | Import Invicta/Nova |
| `compatible_fuel_types TEXT[]` | Uniquement si fourni explicitement par le fournisseur. Jamais inféré. |
| `primary_vendor` JSONB | V2 multi-distributeurs |
| `min_order_qty` | V2 commande fournisseur active |
| `lead_time_days` | V2 commande fournisseur active |

---

## REJETÉS — Ne pas créer à la reconstruction

`sku` · `sku_code` · `device_category` · `energy_type` (ARRAY) · `member_price` · `add_on_price_ht` · `recommendations` · `upgrades` · `hours_estimate` · `is_taxable` · `flue_diameter_mm` · `dimensions_cm` · `lifespan_years` · `flamme_verte_url` · `maprimrenov_description` · `component_role` · `pricing_status` · `other_vendors` · `installation_context` · `external_id` · `external_system` · `supplier_series` · `normalization_confidence` · `normalization_source` · `parser_version` · `raw_label` · `long_description` · `technical_description` · `customer_label` · `fuel_detail` · `flue_connection` · `material_inner` · `material_outer` · `inox_grade_inner` · `inox_grade_outer` · `finish_color` · `finish_type` · `temperature_class` · `pressure_class` · `condensate_class` · `corrosion_class` · `sootfire_class` · `joint_type` · `seal_required` · `insulation_mm` · `emission_co_mg` · `emission_cov_mg` · `emission_dust_mg` · `emission_nox_mg` · `emission_pm_cov_mg` · `test_report_number` · `test_norm` · `test_laboratory` · `warranty_years_manufacturer` · `warranty_years_installer` · `power_min_kw` · `efficiency_etas_pct` · `valid_until` · `supplier_family_label` · `supplier_family` · `supplier_series` · `power_kw` · `efficiency_pct` · `label_flamme_verte`

**Ces champs appartiennent à `heating_appliances` :** `power_kw` · `efficiency_pct` · `label_flamme_verte` · `flue_diameter_mm` · `eligible_fonds_air_bois` (sur appareil) · `eco_design` (sur appareil) · `ce_marking` (sur appareil) · `emission_*`

---

## Champs à créer lors de la reconstruction (absents de la base actuelle)

- `is_obsolete BOOLEAN DEFAULT false`
- `review_reason TEXT` — max 200 caractères
- `image_url TEXT`
- `technical_doc_url TEXT`
- `raw_metadata JSONB`

---

*CATALOG-V1 — figé juin 2026 — fondateur Thomas + Claude Analytics*
