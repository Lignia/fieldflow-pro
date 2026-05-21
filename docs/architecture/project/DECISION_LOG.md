# DECISION_LOG.md

> Pourquoi un choix a été fait, pas seulement quoi.
> Lire avant toute modification d'une RPC ou d'un schéma concerné.

---

## État actuel — Mai 2026

Sessions appliquées : CAT-3, RESET-CATALOG-2 v1.3, SQI-1, SEC-1, SQI-2, PRICING-1, WRAPPER-1, ARCH-DOC-1, DOC-ALIGN-1, CATALOG-STABILIZE-1, SESSION-2, SESSION-3, SESSION-C (Joncoux 6 093 articles), RUNTIME-CONSOLIDATION.
Catalogue central : 6 267 articles publiés (Joncoux 6 093 + KEMP 166 + LIGNIA ouvrages 8).

---

## Template

| Champ | Valeur |
|---|---|
| Date | YYYY-MM-DD |
| Session | NOM |
| Statut | ✅ Appliqué / ⚠️ Dette / 🚧 Obsolète |

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
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

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

*ARCH-DOC-1 v1.6 — 2026-05-21 — RUNTIME-CONSOLIDATION*
