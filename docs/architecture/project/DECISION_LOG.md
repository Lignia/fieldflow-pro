# DECISION_LOG.md

> Pourquoi un choix a été fait, pas seulement quoi.
> Lire avant toute modification d'une RPC ou d'un schéma concerné.

---

## État actuel — Mai 2026

Sessions appliquées : CAT-3, RESET-CATALOG-2 v1.3, SQI-1, SEC-1, SQI-2, PRICING-1, WRAPPER-1, ARCH-DOC-1, DOC-ALIGN-1, CATALOG-STABILIZE-1, SESSION-2, SESSION-3.
Catalogue central : 174 articles publiés (KEMP 166 + LIGNIA ouvrages 8).

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

## D-09 — [DOC-ALIGN-1] `supplier_name` = nom commercial canonique

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Contexte** : Les docs de référence (RUNTIME §2.5) proposaient `supplier_name` en snake_case stable (`f16-lorflex`). En base, la valeur est `'Joncoux'` (nom commercial). Les futurs imports multi-fournisseurs (Poujoulat, Jeremias, Tubest…) risquent d'introduire des variantes de casse.

**Décision** : `supplier_name` = nom commercial du distributeur d'achat, format libre, mais **canonique et stable une fois choisi**. Pas de snake_case obligé. Pas de migration des valeurs existantes.

**Règle canonique** :
- Toute nouvelle valeur `supplier_name` doit être validée avant import.
- Sensible à la casse — `'Joncoux'` ≠ `'joncoux'`.
- En cas de doute : utiliser le nom commercial officiel du fournisseur, sans suffixe pays ni forme juridique.

**Alternatives rejetées** : snake_case (`f16-lorflex`) — inutilement opaque pour les artisans et les logs.

---

## D-10 — [DOC-ALIGN-1] `technology_type` ≠ `canonical_technology`

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Contexte** : Les docs proposaient `canonical_technology` avec 12 valeurs figées. En base, `technology_type` TEXT a 3 valeurs réelles (`concentrique`, `double_paroi_isolee`, `flexible_tubage`).

**Décision** : Ne pas créer `canonical_technology`. `technology_type` est l'implémentation retenue.

**Règle** : `technology_type = NULL` est correct pour les articles non-fumisterie (KEMP Environment Layer, ouvrages). Ne pas forcer une valeur artificielle.

---

## D-11 — [DOC-ALIGN-1] `product_kind` = implémentation de `component_type`

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Contexte** : Les docs appellent ce champ `component_type` (12 valeurs). En base, il s'appelle `product_kind`.

**Décision** : `product_kind` est l'implémentation. Ne pas renommer.

**Règle** : `product_kind = NULL` est correct pour les articles Environment Layer et ouvrages service (pas des composants fumisterie).

---

## D-12 — [DOC-ALIGN-1] `item_family` = candidat pour `product_family`

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Contexte** : Les docs proposent `product_family`. En base, `item_family` TEXT existe et est vide à 100 % (legacy).

**Décision** : `item_family` est le candidat naturel. CHECK remplacé par 13 valeurs cibles (Session CATALOG-STABILIZE-1 M2).

**Règle** : Ne pas créer une colonne `product_family`.

---

## D-13 — [DOC-ALIGN-1] `manufacturer_name` — règle `'unknown'` à l'import

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Contexte** : Les docs demandent `manufacturer_name = 'unknown'` si inconnu, jamais NULL.

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

**Décision** : Ne pas fusionner `normalization_confidence` (qualité parsing) et `confidence_pct` OEM (fiabilité fabricant). Si nécessaire en V2, créer `oem_confidence_pct` distinct.

---

## D-17 — [CATALOG-STABILIZE-1 + SESSION-2] Stratégie legacy vs central

| Date | Session | Statut |
|---|---|---|
| 2026-05-19 | CATALOG-STABILIZE-1 + SESSION-2 | ✅ Appliqué |

**Contexte** : 18 260 articles Joncoux legacy avec `is_central=false`, `tenant_id` renseigné sur 3 tenants. FK composite `(product_id, tenant_id)` active sur `quote_lines` bloquerait une migration en central.

**Décision** : Les 18 260 articles legacy restent intacts (`is_central=false`). Catalogue central `CENTRAL_LIGNIA` créé à côté (`tenant_id=NULL`, `is_central=true`). Les nouveaux imports alimentent uniquement le central.

**Alternatives rejetées** : Migration UPDATE massive des legacy → trop risqué avec 83 `quote_lines` actives pointant sur des UUIDs tenant-specific.

**Conséquences** :
- Anciens devis → articles legacy (inchangés, stables).
- Nouveaux devis → articles centraux (`is_central=true`).
- FK composite remplacée par FK simple `product_id → catalog_items(id)` (Session 1D).

**Règle** : Ne jamais UPDATE `tenant_id` en masse sur les 18 260 articles legacy.

---

## D-18 — [SESSION-3] 8 ouvrages ramonage Niveau 2

| Date | Session | Statut |
|---|---|---|
| 2026-05-19 | SESSION-3 | ✅ Appliqué |

**Contexte** : Les artisans LIGNIA ont besoin de prestations types (ramonage, mise en service, dépose) pour les devis. Ces ouvrages doivent être partagés entre tous les tenants.

**Décision** : 8 prestations types insérées en `is_central=true`, `item_family='service'`, `is_labor=true`, `supplier_name='LIGNIA'`, `vat_rate=10.0` (art. 279-0 bis CGI — logement > 2 ans).

**Règle TVA** : 10% sur toutes les prestations ramonage/entretien en rénovation logement. L'artisan ajuste manuellement à 20% si chantier neuf ou local commercial. La prestation d'évacuation des déchets suit la TVA de la prestation principale.

**Conséquences** : Prix indicatifs — ajustables dans le devis. Stockage temporaire dans `catalog_items` — une table `service_templates` sera envisagée en V2 si la complexité le justifie.

**`import_batch_id`** : `001587be-a8bd-467b-b9e8-caa68a284a2a`

---

## D-19 — [SESSION-2] `primary_vendor` / `other_vendors` JSONB

| Date | Session | Statut |
|---|---|---|
| 2026-05-19 | SESSION-2 | ✅ Appliqué |

**Contexte** : KEMP SAS est distribué par Joncoux (via Lorflex, barème LX_ATRIER_25) ET par Tubest (gamme 5000). Sans modèle multi-distributeurs, il faudrait créer 3 lignes distinctes pour le même article physique → doublons + incohérences de prix.

**Décision** : Deux colonnes JSONB ajoutées à `catalog_items` :
- `primary_vendor` : canal d'achat principal `{"name": "KEMP SAS"}`
- `other_vendors` : canaux alternatifs `[{"name": "Joncoux", ...}, {"name": "Tubest", ...}]`

**Inspiré de** : ServiceTitan `primaryVendor` / `otherVendors`.

**Alternatives rejetées** : Table relationnelle `catalog_item_suppliers` — surengineering MVP. Doublons par distributeur — incohérence garantie sur les mises à jour de prix.

**Conséquences** : `manufacturer_name` reste le fabricant réel (inchangé). `primary_vendor.name` = distributeur d'achat principal.

**TEMPORAIRE MVP** — Cible V2 : `catalog.catalog_item_suppliers` (table relationnelle normalisée).

**Règle** : Ne pas dupliquer un article pour chaque distributeur. Un seul article central, plusieurs `other_vendors`.

---

## D-20 — [SESSION-2 + SESSION-3] `item_family = 'environment'` pour l'Environment Layer

| Date | Session | Statut |
|---|---|---|
| 2026-05-19 | SESSION-2 + SESSION-3 | ✅ Appliqué |

**Contexte** : Les articles KEMP (grilles, protections, rangements, accessoires) ne sont pas des composants fumisterie. La taxonomie `item_family` initialement définie pour la fumisterie (`conduit_principal`, `tubage_flexible`…) ne les couvre pas.

**Décision** : Ajout de `'environment'` dans le CHECK `item_family` (Session M2). Tous les articles KEMP reçoivent `item_family = 'environment'`. `technology_type = NULL` reste correct (confirmé D-10).

**Règle taxonomique KEMP** :
- `item_family = 'environment'` : article Environment Layer (aménagement autour du foyer)
- `environment_category` : vraie taxonomie KEMP (grille_air_chaud, protection_murale, rangement_bois…)
- `technology_type = NULL` : KEMP ≠ composant fumisterie
- `product_kind = NULL` : KEMP ≠ composant de conduit

**Règle de déduplication** : Un article KEMP distribué par Lorflex ET Tubest n'apparaît qu'une fois dans `catalog_items`, avec `other_vendors` listant les deux canaux (D-19).

---

*ARCH-DOC-1 v1.4 — 2026-05-19 — SESSION-3*
