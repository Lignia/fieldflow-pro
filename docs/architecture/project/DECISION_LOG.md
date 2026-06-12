# DECISION_LOG.md

> Pourquoi un choix a été fait, pas seulement quoi.
> Lire avant toute modification d'une RPC ou d'un schéma concerné.

---

## État actuel — Mai 2026

Sessions appliquées : CAT-3, RESET-CATALOG-2 v1.3, SQI-1, SEC-1, SQI-2, PRICING-1, WRAPPER-1, ARCH-DOC-1, DOC-ALIGN-1, CATALOG-STABILIZE-1, SESSION-2, SESSION-3, SESSION-C (Joncoux 6 093 articles), RUNTIME-CONSOLIDATION, CANONICAL-AUDIT, CATALOG-V1-FREEZE.
Catalogue central : 6 267 articles publiés (Joncoux 6 093 + KEMP 166 + LIGNIA ouvrages 8).

---

## Template

| Champ | Valeur |
|---|---|
| Date | YYYY-MM-DD |
| Session | NOM |
| Statut | ✅ Appliqué / ⚠️ Dette / 🚧 Obsolète / 🚧 Superseded |

**Contexte** — **Décision** — **Alternatives rejetées** — **Conséquences** — **Règle à retenir**

---

## D-01 — [CAT-3] Colonnes prescription sur `catalog_items`

| Date | Session | Statut |
|---|---|---|
| 2026-05-15 | CAT-3 | ✅ Appliqué |

**Contexte** : Aucun champ pour piloter la prescription fumisterie (DTA, étanchéité).
**Décision** : Ajout de `has_dta`, `dta_status`, `needs_human_review`, `pricing_status`, `is_etanche`, `manufacturer_name`, `data_quality_status`, `environment_category`.
**Alternatives rejetées** : Table séparée — jointure coûteuse, inutile au MVP.
**Conséquences** : Champs exposés dans `search_quote_items_v2` et snapshotés dans `metadata.prescription`.
**Règle** : `needs_human_review = true` UNIQUEMENT pour sécurité/DTU/DTA.

---

## D-02 — [RESET-CATALOG-2] Pipeline staging pour l'import central

| Date | Session | Statut |
|---|---|---|
| 2026-05-16 | RESET-CATALOG-2 v1.3 | ✅ Appliqué |

**Contexte** : Import 6 093 articles Lorflex. Import direct = risque de pollution irréversible.
**Décision** : `catalog.import_joncoux_staging` avec RLS deny-all client. Pipeline SOURCE → STAGING → VALIDATION → PUBLICATION.
**Alternatives rejetées** : `ON CONFLICT DO UPDATE` direct — pas de rollback, pas d'audit.
**Conséquences** : `supplier_family`, `supplier_series` vides à 100 % — remplissage post-import.
**Règle** : Jamais d'import direct en catalogue central.

---

## D-03 — [SQI-1] Articles centraux invisibles dans la recherche

| Date | Session | Statut |
|---|---|---|
| 2026-05-16 | SQI-1 | ✅ Appliqué |

**Contexte** : `WHERE ci.tenant_id = p_tenant_id` excluait `tenant_id = NULL` malgré RLS correcte.
**Décision** : `WHERE (ci.tenant_id = p_tenant_id OR (ci.tenant_id IS NULL AND ci.is_central = true))`.
**Alternatives rejetées** : Modifier la RLS — la RLS était correcte.
**Conséquences** : Tout article central publié est visible dans tous les tenants.
**Règle** : RLS = droits d'accès. WHERE RPC = périmètre. Les deux sont indépendants.

---

## D-04 — [SQI-2 + WRAPPER-1] `search_quote_items_v2` plutôt que `CREATE OR REPLACE`

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | SQI-2 + WRAPPER-1 | ✅ Appliqué |

**Contexte** : PostgreSQL interdit `CREATE OR REPLACE` si `RETURNS TABLE` change.
**Décision** : Nouvelle fonction `public.search_quote_items_v2` (34 colonnes) + wrapper `catalog.search_quote_items_v2` pour `catalogDb = supabase.schema("catalog")`.
**Alternatives rejetées** : DROP + CREATE — breaking. Modifier le corps seul — impossible.
**Conséquences** : Wrapper `catalog.` à resynchroniser manuellement si signature `public.` change.
**Règle** : Pour modifier `RETURNS TABLE`, créer `_v3`, `_v4`… Ne jamais DROP + CREATE en prod.

---

## D-05 — [PRICING-1] Patch JSONB non-breaking sur `resolve_item_price`

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | PRICING-1 | ✅ Appliqué |

**Contexte** : Besoin de distinguer `central_catalog` (article central sans remise) de `null`.
**Décision** : Ajout des clés `is_central` et `pricing_source = 'central_catalog'` dans le JSONB. Non-breaking car `RETURNS jsonb`.
**Alternatives rejetées** : `resolve_item_price_v2` — inutile pour un retour JSONB.
**Règle** : `RETURNS jsonb` = ajout de clés safe. `RETURNS TABLE(...)` = jamais modifier en place.

---

## D-06 — [SQI-2] `energy_type` ARRAY → `energy_type_simple` TEXT

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | SQI-2 | ⚠️ Dette — migration CAT-4 planifiée |

**Contexte** : Colonne `ARRAY` complexifie Lovable et la résolution vocale. Chaque article a une seule énergie.
**Décision** : `energy_type_simple TEXT = energy_type[1]` dans `search_quote_items_v2`. Colonne ARRAY inchangée.
**Conséquences** : NULL à 100 % sur le catalogue actuel — enrichissement post-import Lorflex.
**Règle** : `ARRAY[1]` peut être NULL même si la colonne contient `{}`. Tester `=== null` explicitement.

---

## D-07 — [RESET-CATALOG-2] `installation_context TEXT[]` sans ENUM PostgreSQL

| Date | Session | Statut |
|---|---|---|
| 2026-05-16 | RESET-CATALOG-2 v1.3 | ✅ Appliqué |

**Contexte** : Valeurs futures nombreuses (rénovation, façade, collectif, ERP, RT2012…).
**Décision** : `TEXT[]` + liste fermée validée côté Edge Function et TypeScript.
**Alternatives rejetées** : ENUM PostgreSQL — `ALTER TYPE` à chaque nouvelle valeur.
**Règle** : Pour les listes évolutives, `TEXT[]` + validation applicative > ENUM.

---

## D-08 — [WRAPPER-1] `catalog.*` (wrappers) vs `public.*` (natif)

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | WRAPPER-1 | ✅ Appliqué |

**Contexte** : Lovable utilise `catalogDb = supabase.schema("catalog")`. Sans wrapper, `catalogDb.rpc("search_quote_items_v2")` retourne « function does not exist ».
**Décision** : Toute RPC Lovable existe dans `catalog.` comme wrapper SQL `SELECT * FROM public.rpc_name(...)`.
**Alternatives rejetées** : Implémenter dans `catalog.` — search_path complexifié. Changer pour `public.` — perd la cohérence de `catalogDb`.
**Conséquences** : Mise à jour manuelle du wrapper si signature `public.` change.
**Règle** : `catalog.*` = interface Lovable. `public.*` = implémentation. Ne jamais appeler `public.*` depuis Lovable.

---

## D-09 — [DOC-ALIGN-1] `supplier_name` = canal d'achat de l'artisan

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Contexte** : Les docs proposaient `supplier_name` en snake_case stable. En base, la valeur est le nom commercial.
**Décision** : `supplier_name` = qui facture l'artisan (canal d'achat). Format libre, canonique et stable une fois choisi.
**Règle** : `supplier_name = 'Joncoux'` (groupement Sphering/Lorflex qui facture). `manufacturer_name = 'Joncoux'` pour les conduits Apollo, `'Paroc'` pour les isolants achetés chez Lorflex, `'Firerock'` pour les panneaux, etc.

---

## D-10 — [DOC-ALIGN-1] `technology_type` ≠ `canonical_technology`

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Décision** : Ne pas créer `canonical_technology`. `technology_type` est l'implémentation retenue.
**Règle** : `technology_type = NULL` est correct pour les articles non-fumisterie (KEMP Environment Layer, ouvrages).

---

## D-11 — [DOC-ALIGN-1] `product_kind` = implémentation de `component_type`

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Décision** : `product_kind` est l'implémentation. Ne pas renommer.
**Règle** : `product_kind = NULL` est correct pour les articles Environment Layer et ouvrages service.

---

## D-12 — [DOC-ALIGN-1] `item_family` = candidat pour `product_family`

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Décision** : `item_family` est le candidat naturel. CHECK remplacé par 13 valeurs cibles.
**Règle** : Ne pas créer une colonne `product_family`.

---

## D-13 — [DOC-ALIGN-1] `manufacturer_name` — règle `'unknown'` à l'import

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | 🚧 Superseded (CATALOG-V1-FREEZE, 2026-06-08) |

> 🚧 SUPERSEDED — La règle d'origine ci-dessous (`manufacturer_name = 'unknown'` à l'import) est
> remplacée par la doctrine V1 : `manufacturer_name = NULL` si le fabricant est inconnu, jamais la
> chaîne `'unknown'`. Voir CATALOG_ITEMS_V1_FINAL.md règle I-08. Raison : `'unknown'` crée un faux
> fabricant qui pollue agrégations et `DISTINCT` ; aucune ligne `'unknown'` n'existe en base
> (vérifié juin 2026). Texte d'origine conservé ci-dessous pour historique.

**Décision** : La règle s'applique uniquement à l'import. Pas de migration SQL ni de DEFAULT.
**Règle** : Tout nouvel import doit valider `manufacturer_name IS NOT NULL OR manufacturer_name = 'unknown'`.

---

## D-14 — [DOC-ALIGN-1] `network_name` — jamais en base

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Décision** : Aucune colonne `network_name` en base. Réservé V2 (`core.networks`).

---

## D-15 — [DOC-ALIGN-1] `angle_deg` SMALLINT accepté pour le MVP

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ⚠️ Dette mineure acceptée |

**Décision** : `angle_deg` reste SMALLINT. Éléments réglables : `angle_deg = NULL` + `technical_description`.

---

## D-16 — [DOC-ALIGN-1] `normalization_confidence` ≠ `confidence_pct` OEM

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Décision** : Ne pas fusionner les deux colonnes. Si nécessaire en V2, créer `oem_confidence_pct` distinct.

---

## D-17 — [CATALOG-STABILIZE-1 + SESSION-2] Stratégie legacy vs central

| Date | Session | Statut |
|---|---|---|
| 2026-05-19 | CATALOG-STABILIZE-1 + SESSION-2 | ✅ Appliqué |

**Décision** : Les articles legacy restent intacts. Catalogue central `CENTRAL_LIGNIA` créé à côté.
**Règle** : Ne jamais UPDATE `tenant_id` en masse sur les articles legacy.

---

## D-18 — [SESSION-3] 8 ouvrages ramonage Niveau 2

| Date | Session | Statut |
|---|---|---|
| 2026-05-19 | SESSION-3 | ✅ Appliqué |

**Décision** : 8 prestations types en `is_central=true`, `item_family='service'`, `is_labor=true`, `supplier_name='LIGNIA'`, `vat_rate=10.0`.
**`import_batch_id`** : `001587be-a8bd-467b-b9e8-caa68a284a2a`

---

## D-19 — [SESSION-2] `primary_vendor` / `other_vendors` JSONB

| Date | Session | Statut |
|---|---|---|
| 2026-05-19 | SESSION-2 | ✅ Appliqué |

**Décision** : Deux colonnes JSONB pour le modèle multi-distributeurs MVP.
**TEMPORAIRE MVP** — Cible V2 : `catalog.catalog_item_suppliers` (table relationnelle).
**Règle** : Un seul article central, plusieurs `other_vendors`. Ne pas dupliquer pour chaque distributeur.

---

## D-20 — [SESSION-2 + SESSION-3] `item_family = 'environment'` pour l'Environment Layer

| Date | Session | Statut |
|---|---|---|
| 2026-05-19 | SESSION-2 + SESSION-3 | ✅ Appliqué |

**Décision** : `'environment'` ajouté au CHECK `item_family`. Articles KEMP = `item_family='environment'`, `technology_type=NULL`, `environment_category` = vraie taxonomie KEMP.

---

## D-21 — [SESSION-C] supplier_name = canal d'achat / manufacturer_name = fabricant réel

| Date | Session | Statut |
|---|---|---|
| 2026-05-20 | SESSION-C | ✅ Appliqué |

**Décision** :
- `supplier_name` = qui facture l'artisan = `'Joncoux'` (groupement Sphering/Lorflex)
- `manufacturer_name` = qui fabrique réellement l'article
- `distributor_name` = enseigne commerciale = `'Lorflex'`
- `primary_vendor` = `{"name":"Lorflex","bareme_code":"LX_ATRIER_25"}`

**Règle** : `supplier_name` sensible à la casse. La complexité Lorflex/Joncoux/Sphering est un détail commercial sans impact sur le modèle.

---

## D-22 — [SESSION-C] Grilles de remises multi-niveaux — anticipation V2

| Date | Session | Statut |
|---|---|---|
| 2026-05-20 | SESSION-C | ✅ Colonnes ajoutées / ⚠️ Logique V2 |

**Décision** : Trois colonnes ajoutées à `tenant_supplier_discounts` en prévision V2 : `manufacturer_name`, `item_family`, `technology_type` (toutes NULL en MVP). Résolution en cascade du plus spécifique au plus général prévue.
**Règle** : `resolve_item_price` prend la ligne la plus générale en MVP. Aucune modification nécessaire maintenant.

---

## D-23 — [SESSION-C] `eligible_fonds_air_bois` sur `catalog_items`

| Date | Session | Statut |
|---|---|---|
| 2026-05-20 | SESSION-C | ✅ Appliqué |

**Décision** : Colonne `eligible_fonds_air_bois BOOLEAN DEFAULT false` ajoutée à `catalog_items`.
**Règle** : Distinct de Flamme Verte. Un appareil peut être Flamme Verte sans être éligible Fonds Air Bois.

---

## D-24 — [RUNTIME-CONSOLIDATION] TVA réglementaire catalogue — source BOFiP officielle

| Date | Session | Statut |
|---|---|---|
| 2026-05-21 | RUNTIME-CONSOLIDATION | ✅ Appliqué |

**Contexte** : `catalog_items.vat_rate` est une **suggestion ergonomique** — la vérité contractuelle est toujours `quote_lines.vat_rate`, modifiable par l'artisan. La question est : quelle suggestion pré-remplit le devis le plus correctement pour le cas dominant LIGNIA (fourniture + pose, logement > 2 ans, artisan pro) ?

**Sources officielles** :
- BOFiP BOI-ANNX-000210 (31/07/2024) — Taux TVA opérations entretien, désinfection, dépannage
- Art. 278-0 bis CGI — Équipements de chauffage ENR

**Tableau TVA réglementaire complet** :

| Opération | TVA | Remarque |
|---|---|---|
| Fourniture + pose poêle bois/granulés | **5,5%** | Logement >2 ans, artisan pro |
| Fourniture + pose conduits fumisterie (tubage, raccordement, sortie toiture) | **5,5%** | Travaux d'adaptation indissociables |
| Fourniture + pose insert / foyer fermé | **5,5%** | |
| Pièces détachées facturées avec main-d'œuvre de pose | **5,5%** | Indissociables de la prestation |
| Pièces détachées vendues seules sans pose | **20%** | Livraison de bien meuble |
| Ramonage, élimination suie/dépôts | **10%** | BOFiP §20 explicite |
| Entretien annuel poêle/chauffage | **10%** | BOFiP §40 — contrats maintenance chauffage |
| Dépannage avec pièces | **10%** | Prestation de service + fourniture accessoire |
| VMC, nettoyage gaines | **10%** | BOFiP §20 explicite |
| Accessoires meubles amovibles (décoration, rangement) | **20%** | Biens meubles non fixés |
| Logement neuf ou < 2 ans | **20%** | Taux réduit inapplicable |
| Local commercial | **20%** | |

**Décisions appliquées en base** :

*Joncoux — fumisterie (4 962 articles) :*
- `conduit_principal`, `tubage_flexible`, `raccordement_visible`, `sortie_toiture`, `accessoire_fumisterie`, `raccordement_pellets_visible` → **suggestion 5,5%**
- `systeme_etanche` (concentriques) → **20%** maintenu (NHR=true, DTA non confirmé, artisan doit trancher)
- `environment` → **20%** (biens meubles non-pose obligatoire)

*KEMP SAS — environment layer (166 articles) :*
- `distribution_air_chaud` (22), `grille_air_chaud` (54), `arrivee_air_frais` (26), `protection_murale` (11) → **suggestion 5,5%** (composants fixés/posés, indissociables de l'installation)
- `protection_sol` (7), `protection_securite` (3), `rangement_bois` (19), `rangement_granules` (8), `accessoire_decoratif` (6), `accessoire_entretien` (10) → **20%** maintenu (biens meubles amovibles ou hétérogènes)

*LIGNIA — ouvrages (8 articles) :*
- Ramonage, entretien, mise en service → **10%** confirmé (BOFiP §20 et §40)

**Règles invariantes** :
1. `catalog_items.vat_rate` = suggestion. `quote_lines.vat_rate` = vérité contractuelle. L'artisan ajuste toujours.
2. La condition logement >2 ans est de la responsabilité de l'artisan (attestation client). LIGNIA n'a pas à la vérifier.
3. `systeme_etanche` reste à 20% par prudence : le 5,5% s'applique techniquement mais le NHR=true et l'absence de DTA confirme que l'artisan doit de toute façon valider manuellement ce type de ligne.
4. Ne jamais appliquer le 5,5% sur les pièces détachées vendues seules en SAV sans prestation associée.

**Alternatives rejetées** :
- `vat_rate = NULL` partout → trop de friction dans le devis, l'artisan saisit à chaque fois
- `vat_rate = 20%` partout → incorrect pour le cas dominant, force une correction systématique

---

## D-25 — [CANONICAL-AUDIT] Deux règles distinctes sur le coût d'achat

| Date | Session | Statut |
|---|---|---|
| 2026-06-03 | CANONICAL-AUDIT | ✅ Appliqué |

**Contexte** : La règle sur `cost_price` était implicite dans ENGINEERING_PRINCIPLES mais sans ID de décision. Risque qu'un import maladroit alimente `cost_price` et fausse la marge d'Arnaud sans alerte.
**Décision — Règle A** : `catalog_items.cost_price` est soumis à une contrainte SQL `CHECK (cost_price IS NULL)` active en base. Le prix d'achat fournisseur ne vit pas dans le catalogue. Jamais importé, jamais stocké.
**Décision — Règle B** : `quote_lines.unit_cost_price` est un champ légitime et actif (62 lignes remplies, vérifié juin 2026). C'est le coût saisi manuellement par l'artisan pour calculer sa marge dans le devis. Ne jamais l'alimenter automatiquement depuis une RPC ou un import.
**Alternatives rejetées** : Stocker le prix d'achat fournisseur pour calculer la marge automatiquement — rejeté pour confidentialité des remises et simplicité.
**Règle** : La marge est calculable dans LIGNIA via `unit_cost_price` saisi par l'artisan. Le prix d'achat fournisseur n'est pas stocké dans le catalogue. Ce sont deux choses distinctes.

---

## D-26 — [CANONICAL-AUDIT] 1 installation = 1 appareil principal (V1)

| Date | Session | Statut |
|---|---|---|
| 2026-06-03 | CANONICAL-AUDIT | ✅ Appliqué — décision fondateur |

**Contexte** : P0-04 (ajout de `heating_appliance_id` dans `core.installations`) était bloqué tant que la cardinalité installation/appareil n'était pas tranchée.
**Décision** : V1 — 1 installation = 1 appareil principal. Un client peut avoir N installations. Une propriété peut avoir N installations. `heating_appliance_id` sera ajouté comme colonne scalaire UUID dans `core.installations` (migration prévue en P0-04). Pas de table pivot `installation_devices` en V1.
**Alternatives rejetées** : Table pivot N:N — cas multi-appareils rares dans le scope bois-énergie V1 (poêle + cuisinière = 2 installations séparées, pas 1 installation à 2 appareils).
**Règle** : Poêle granulés + cuisinière à bois chez un même client = 2 lignes `core.installations`. Ne pas créer de table pivot avant retours terrain sur les cas multi-appareils.

---

## D-27 — [CANONICAL-AUDIT] Contenu minimal de `appliance_snapshot` — DÉCISION OUVERTE

| Date | Session | Statut |
|---|---|---|
| 2026-06-03 | CANONICAL-AUDIT | ⚠️ Décision ouverte — ne pas implémenter |

**Contexte** : `appliance_snapshot` JSONB nullable existe dans `billing.quote_lines`. Son contenu n'a jamais été défini. Aucune user story P0/P1 ne dépend de ce snapshot — `appliance_id` (FK live) + les champs déjà snapshotés (`brand`, `raw_label_snapshot`) couvrent tous les besoins V1.
**Décision** : Non décidée. Ne pas écrire ce champ avant les pilotes.
**Exemple non normatif** : `{id, normalized_brand, normalized_model, fuel_type, nominal_power_kw, flamme_verte_stars, flue_diameter_mm, ademe_fonds_air_bois_status}`
**Trigger de reprise** : Premier signalement d'incohérence données ADEME sur un devis historique, ou démarrage du SAV avancé (Cycle 3).
**Règle** : Bloquer toute implémentation de `appliance_snapshot` jusqu'à décision fondateur post-pilotes.

---

## D-28 — [CANONICAL-AUDIT] Périmètre commande fournisseur V1

| Date | Session | Statut |
|---|---|---|
| 2026-06-03 | CANONICAL-AUDIT | ✅ Appliqué |

**Contexte** : `LIGNIA_OBJECT_MODEL.md` indiquait "V2". Les roadmaps récentes ont avancé à "P1". Le périmètre V1 n'avait jamais été précisé — risque qu'un agent construise un bon de commande complet (10h) au lieu de la vue lecture seule dont Amélie a besoin (2-3h).
**Décision** : Commande fournisseur V1 = vue lecture seule uniquement. Liste articles groupée par `supplier_name_snapshot`, avec quantités et références. Pas d'envoi électronique. Pas de réconciliation comptable. Pas de suivi de livraison.
**V2** : Bon de commande complet avec envoi, suivi et réconciliation comptable.
**Alternatives rejetées** : Construire directement le bon de commande V2 — sur-ingénierie avant pilotes.
**Règle** : P1-06 Lovable = vue lecture seule uniquement. Ne pas ajouter l'envoi électronique ni la réconciliation avant V2.

---

## D-29 — [CANONICAL-AUDIT] `catalog_domain` dans `quote_lines` — DÉCISION OUVERTE

| Date | Session | Statut |
|---|---|---|
| 2026-06-03 | CANONICAL-AUDIT | ⚠️ Décision ouverte — ne pas créer la colonne |

**Contexte** : `catalog_domain = "APPAREIL"` est écrit côté frontend dans `addAppliance()` mais la colonne n'existe pas dans `billing.quote_lines`. La valeur est silencieusement perdue à chaque save. Aucune user story P0/P1 ne nécessite cette colonne — le type d'une ligne est déductible à 100% des colonnes existantes : `appliance_id IS NOT NULL` → APPAREIL, `supplier_name_snapshot = 'TENANT_PRIVATE'` → PRESTATION, sinon FUMISTERIE.
**Option A** : Créer la colonne TEXT dans `billing.quote_lines` + l'écrire dans `replace_quote_lines`.
**Option B** : Abandonner `catalog_domain` et utiliser la déduction runtime ci-dessus pour V1.
**Trigger de reprise** : Demande explicite de reporting analytique par domaine par un client payant, ou retour terrain après les 5 devis pilotes.
**Règle** : Ne pas créer la colonne avant décision fondateur. Ne pas supprimer le code frontend avant décision. Décision à réévaluer après les 5 devis pilotes.

---

## D-30 — [CANONICAL-AUDIT] `catalog_items.heating_appliance_id` = P1

| Date | Session | Statut |
|---|---|---|
| 2026-06-03 | CANONICAL-AUDIT | ✅ Appliqué — décision fondateur |

**Contexte** : `HEATING_APPLIANCE_EXECUTION_PLAN.md` classait ce travail en P0. Fondateur a arbitré P1 — ce lien ne bloque pas les pilotes, le devis, la signature, ni le parc installé.
**Décision** : La colonne `heating_appliance_id` dans `catalog.catalog_items` est une priorité P1. Elle prépare la prescription produit et la note de calcul V3. Ne pas créer cette migration avant que P0-01, P0-02, P0-03 et P0-04 soient tous fermés.
**Alternatives rejetées** : P0 — création prématurée qui mobilise du temps avant que les vrais P0 soient résolus.
**Règle** : Ne pas exécuter cette migration tant que les 4 P0 appareils ne sont pas fermés. Dans le corpus catalogue V1, ce champ est désigné « P1 READY — non créé en base ».

---

## D-31 — [CATALOG-V1-FREEZE] `product_type` = axe universel du catalogue

| Date | Session | Statut |
|---|---|---|
| 2026-06-08 | CATALOG-V1-FREEZE | ✅ Appliqué — décision fondateur |

**Contexte** : Le modèle catalogue doit accueillir fumisterie, appareils, pièces détachées, consommables et prestations dans une table unique `catalog_items`. Les 13 valeurs d'`item_family` sont exclusivement fumisterie et ne peuvent pas classer un poêle, une chaudière ou une pièce d'appareil. La colonne `product_type` (enum `appliance`/`part`/`service`/`consumable`) existe déjà en base mais a été alimentée en masse par valeur statique aux imports historiques (constat : 22 788 lignes à `part`, 8 à `service`, vérifié juin 2026), donc sans sémantique exploitable.

**Décision** : `product_type` est l'**axe universel** de nature commerciale du catalogue. Tout article en porte un, jamais NULL. C'est l'axe transverse qui distingue appareil / pièce / service / consommable, indépendamment de la fumisterie. Il doit être **dérivé à l'import** depuis la catégorie source (voir SUPPLIER_MAPPING_STRATEGY_V1), jamais affecté en valeur statique. Une valeur indéterminable → `data_quality_status='needs_review'`.

**Alternatives rejetées** :
- Créer une 14ᵉ valeur `item_family='appliance'` → mélange deux axes de nature différente dans un seul champ ; rejeté.
- Garder `product_type` statique et naviguer uniquement par `item_family` → impossible pour les appareils, qui n'ont pas de famille fumisterie.
- Supprimer `product_type` (il était listé en REJETÉ dans une version antérieure de V1_FINAL) → laisserait le catalogue sans axe de nature universel.

**Conséquences** :
- `product_type` passe de CHAMP REJETÉ à CHAMP CORE dans CATALOG_ITEMS_V1_FINAL.md (R-11, I-11).
- La navigation catalogue se fait par `product_type` (niveau 1) puis `item_family` (fumisterie) / `appliance_type` (appareils) au niveau 2.
- Le pipeline doit implémenter une règle de dérivation `catégorie source → product_type` (P-00d).
- Cohérent avec D-11 (`product_kind` reste l'implémentation de `component_type`, axe distinct et non concurrent).

**Règle** : `product_type` est l'axe de nature universel, dérivé à l'import, jamais statique, jamais NULL. `item_family` ne le remplace pas. Ne jamais classer un article par défaut silencieux : indéterminable → `data_quality_status='needs_review'`.

---

## D-32 — [CATALOG-V1-FREEZE] `item_family` = sous-classification fumisterie conditionnelle

| Date | Session | Statut |
|---|---|---|
| 2026-06-08 | CATALOG-V1-FREEZE | ✅ Appliqué — décision fondateur |

**Contexte** : `item_family` (13 valeurs) avait été décrit comme obligatoire pour tout article (R-03 / I-04 historiques, plan REBUILD SUPERSEDED prévoyait `item_family` NOT NULL global avec retrait de la clause `OR IS NULL` du CHECK). Or les 13 valeurs sont fumisterie : aucune ne désigne un appareil ni une pièce d'appareil. Rendre `item_family` NOT NULL globalement bloquerait tout import d'appareils.

**Décision** : `item_family` est une **sous-classification fumisterie**. Elle est obligatoire **uniquement pour les articles fumisterie** et reste `NULL` pour les appareils (`product_type='appliance'`), les pièces détachées d'appareil et les consommables non fumisterie. Elle n'est **jamais** rendue NOT NULL globalement ; la clause `OR item_family IS NULL` du CHECK `catalog_items_item_family_check` est **conservée**. Aucune valeur `item_family` nouvelle n'est créée en V1.

**Alternatives rejetées** :
- `item_family` NOT NULL global (plan REBUILD, SUPERSEDED) → bloque les appareils ; explicitement écarté.
- Ajouter des valeurs `item_family` pour appareils → changement de modèle, rejeté en V1.

**Conséquences** :
- R-03 et I-04 de CATALOG_ITEMS_V1_FINAL.md réécrites en obligation conditionnelle fumisterie.
- Le plan REBUILD (étape 8 « retirer IS NULL du CHECK ») est définitivement caduc — déjà SUPERSEDED.
- Les prestations LIGNIA conservent `item_family='service'` (D-18) : la conditionnalité n'interdit pas l'usage de `service`/`labor`/`environment` là où il est déjà acté, elle dispense les appareils/pièces de toute famille.

**Règle** : `item_family` obligatoire pour la fumisterie, `NULL` autorisé pour appareils/pièces d'appareil/consommables non fumisterie. Jamais NOT NULL global. Source de vérité du filtrage par nature = `product_type`, pas `item_family`.

---

*ARCH-DOC-1 v1.8 — 2026-06-08 — CATALOG-V1-FREEZE*
