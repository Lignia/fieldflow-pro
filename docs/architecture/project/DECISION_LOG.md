# DECISION_LOG.md

> Pourquoi un choix a été fait, pas seulement quoi.
> Lire avant toute modification d’une RPC ou d’un schéma concerné.

---

## État actuel — Mai 2026

Sessions appliquées : CAT-3, RESET-CATALOG-2 v1.3, SQI-1, SEC-1, SQI-2, PRICING-1, WRAPPER-1, ARCH-DOC-1, DOC-ALIGN-1.
Catalogue central : 0 article publié. Staging prêt, non déclenché.

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

**Contexte** : Aucun champ pour piloter la prescription fumisterie (DTA, étanchéité).
**Décision** : Ajout de `has_dta`, `dta_status`, `needs_human_review`, `pricing_status`, `is_etanche`, `manufacturer_name`, `data_quality_status`, `environment_category`.
**Alternatives rejetées** : Table séparée — jointure coûteuse, inutile au MVP.
**Conséquences** : Champs exposés dans `search_quote_items_v2` et snapshotés dans `metadata.prescription`.
**Règle** : `needs_human_review = true` UNIQUEMENT pour sécurité/DTU/DTA.

---

## D-02 — [RESET-CATALOG-2] Pipeline staging pour l’import central

| Date | Session | Statut |
|---|---|---|
| 2026-05-16 | RESET-CATALOG-2 v1.3 | ✅ Appliqué |

**Contexte** : Import 6 093 articles Lorflex. Import direct = risque de pollution irréversible.
**Décision** : `catalog.import_joncoux_staging` avec RLS deny-all client. Pipeline SOURCE → STAGING → VALIDATION → PUBLICATION.
**Alternatives rejetées** : `ON CONFLICT DO UPDATE` direct — pas de rollback, pas d’audit.
**Conséquences** : `supplier_family`, `supplier_series` vides à 100 % — remplissage post-import.
**Règle** : Jamais d’import direct en catalogue central.

---

## D-03 — [SQI-1] Articles centraux invisibles dans la recherche

| Date | Session | Statut |
|---|---|---|
| 2026-05-16 | SQI-1 | ✅ Appliqué |

**Contexte** : `WHERE ci.tenant_id = p_tenant_id` excluait `tenant_id = NULL` malgré RLS correcte.
**Décision** : `WHERE (ci.tenant_id = p_tenant_id OR (ci.tenant_id IS NULL AND ci.is_central = true))`.
**Alternatives rejetées** : Modifier la RLS — la RLS était correcte.
**Conséquences** : Tout article central publié est visible dans tous les tenants.
**Règle** : RLS = droits d’accès. WHERE RPC = périmètre. Les deux sont indépendants.

---

## D-04 — [SQI-2 + WRAPPER-1] `search_quote_items_v2` plutôt que `CREATE OR REPLACE`

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | SQI-2 + WRAPPER-1 | ✅ Appliqué |

**Contexte** : PostgreSQL interdit `CREATE OR REPLACE` si `RETURNS TABLE` change.
**Décision** : Nouvelle fonction `public.search_quote_items_v2` (34 colonnes) + wrapper `catalog.search_quote_items_v2` pour `catalogDb = supabase.schema("catalog")`.
**Alternatives rejetées** : DROP + CREATE — breaking. Modifier le corps seul — impossible.
**Conséquences** : Wrapper `catalog.` à resynchroniser manuellement si signature `public.` change.
**Règle** : Pour modifier `RETURNS TABLE`, créer `_v3`, `_v4`… Ne jamais DROP + CREATE en prod.

---

## D-05 — [PRICING-1] Patch JSONB non-breaking sur `resolve_item_price`

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | PRICING-1 | ✅ Appliqué |

**Contexte** : Besoin de distinguer `central_catalog` (article central sans remise) de `null`.
**Décision** : Ajout des clés `is_central` et `pricing_source = 'central_catalog'` dans le JSONB. Non-breaking car `RETURNS jsonb`.
**Alternatives rejetées** : `resolve_item_price_v2` — inutile pour un retour JSONB.
**Règle** : `RETURNS jsonb` = ajout de clés safe. `RETURNS TABLE(...)` = jamais modifier en place.

---

## D-06 — [SQI-2] `energy_type` ARRAY → `energy_type_simple` TEXT

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | SQI-2 | ⚠️ Dette — migration CAT-4 planifiée |

**Contexte** : Colonne `ARRAY` complexifie Lovable et la résolution vocale. Chaque article a une seule énergie.
**Décision** : `energy_type_simple TEXT = energy_type[1]` dans `search_quote_items_v2`. Colonne ARRAY inchangée.
**Conséquences** : NULL à 100 % sur le catalogue actuel — enrichissement post-import Lorflex.
**Règle** : `ARRAY[1]` peut être NULL même si la colonne contient `{}`. Tester `=== null` explicitement.

---

## D-07 — [RESET-CATALOG-2] `installation_context TEXT[]` sans ENUM PostgreSQL

| Date | Session | Statut |
|---|---|---|
| 2026-05-16 | RESET-CATALOG-2 v1.3 | ✅ Appliqué |

**Contexte** : Valeurs futures nombreuses (rénovation, façade, collectif, ERP, RT2012…).
**Décision** : `TEXT[]` + liste fermée validée côté Edge Function et TypeScript.
**Alternatives rejetées** : ENUM PostgreSQL — `ALTER TYPE` à chaque nouvelle valeur.
**Règle** : Pour les listes évolutives, `TEXT[]` + validation applicative > ENUM.

---

## D-08 — [WRAPPER-1] `catalog.*` (wrappers) vs `public.*` (natif)

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | WRAPPER-1 | ✅ Appliqué |

**Contexte** : Lovable utilise `catalogDb = supabase.schema("catalog")`. Sans wrapper, `catalogDb.rpc("search_quote_items_v2")` retourne « function does not exist ».
**Décision** : Toute RPC Lovable existe dans `catalog.` comme wrapper SQL `SELECT * FROM public.rpc_name(...)`.
**Alternatives rejetées** : Implémenter dans `catalog.` — search_path complexifié. Changer pour `public.` — perd la cohérence de `catalogDb`.
**Conséquences** : Mise à jour manuelle du wrapper si signature `public.` change.
**Règle** : `catalog.*` = interface Lovable. `public.*` = implémentation. Ne jamais appeler `public.*` depuis Lovable.

---

## D-09 — [DOC-ALIGN-1] `supplier_name` = nom commercial canonique

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Contexte** : Les docs de référence (RUNTIME §2.5) proposaient `supplier_name` en snake_case stable (`f16-lorflex`). En base, la valeur est `'Joncoux'` (nom commercial). Les futurs imports multi-fournisseurs (Poujoulat, Jeremias, Tubest…) risquent d’introduire des variantes de casse (`Jeremias` vs `Jeremias France` vs `Jeremias GmbH`).

**Décision** : `supplier_name` = nom commercial du distributeur d’achat, format libre, mais **canonique et stable une fois choisi**. Pas de snake_case obligé. Pas de migration des valeurs existantes.

**Règle canonique** :
- Toute nouvelle valeur `supplier_name` doit être validée avant import.
- La valeur choisie doit être identique dans `catalog_items`, `tenant_supplier_discounts`, les bons de commande et les APIs futures.
- Sensible à la casse — `'Joncoux'` ≠ `'joncoux'`.
- En cas de doute : utiliser le nom commercial officiel du fournisseur, sans suffixe pays ni forme juridique.

**Alternatives rejetées** : snake_case (`f16-lorflex`) — inutilement opaque pour les artisans et les logs.

**Conséquences** : Les imports futurs doivent inclure une étape de validation `supplier_name` avant staging.

---

## D-10 — [DOC-ALIGN-1] `technology_type` ≠ `canonical_technology`

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Contexte** : Les docs de référence proposaient une colonne `canonical_technology` avec 12 valeurs figées. En base, `technology_type` TEXT a 3 valeurs réelles (`concentrique`, `double_paroi_isolee`, `flexible_tubage`) incompatibles avec la nomenclature des docs.

**Décision** : Ne pas créer `canonical_technology`. `technology_type` est l’implémentation retenue. La taxonomie sera enrichie progressivement lors des imports multi-fournisseurs. Aucun CHECK avant stabilisation des valeurs.

**Alternatives rejetées** : Créer `canonical_technology` en doublon — fragmentation garantie avec 3 valeurs réelles déjà incompatibles.

**Règle** : `technology_type` = aide au tri dans la recherche, pas une taxonomie universelle complète. Valeurs à étendre lors des prochains imports.

---

## D-11 — [DOC-ALIGN-1] `product_kind` = implémentation de `component_type`

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Contexte** : Les docs appellent ce champ `component_type` (12 valeurs). En base, il s’appelle `product_kind` avec les mêmes 12 valeurs réelles.

**Décision** : `product_kind` est l’implémentation de `component_type`. Ne pas renommer. Les docs de référence utilisent `component_type` comme alias conceptuel uniquement.

**Règle** : Dans tout document ou code, utiliser `product_kind` (nom réel en base). `component_type` = terme métier uniquement.

---

## D-12 — [DOC-ALIGN-1] `item_family` = candidat pour `product_family`

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Contexte** : Les docs proposent `product_family` (9-10 valeurs : conduit_principal, systeme_etanche…). En base, `item_family` TEXT existe et est vide à 100 %.

**Décision** : `item_family` est le candidat naturel pour stocker les valeurs `product_family`. À remplir lors des imports multi-fournisseurs. Pas de renommage, pas de nouvelle colonne.

**Règle** : Ne pas créer une colonne `product_family`. Utiliser `item_family` existante lors des imports.

---

## D-13 — [DOC-ALIGN-1] `manufacturer_name` — règle `'unknown'` à l’import

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Contexte** : Les docs demandent `manufacturer_name = 'unknown'` si inconnu, jamais NULL. En base, `manufacturer_name` est nullable sans DEFAULT.

**Décision** : La règle `'unknown'` s’applique uniquement à l’import (validation Edge Function). Pas de migration SQL ni de DEFAULT. Les 18 260 lignes existantes (import Joncoux) restent avec NULL acceptable.

**Règle** : Tout nouvel import doit valider que `manufacturer_name IS NOT NULL OR manufacturer_name = 'unknown'`.

---

## D-14 — [DOC-ALIGN-1] `network_name` — jamais en base

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Contexte** : Le BENCHMARK propose `network_name` pour les enseignes (Flammes du Monde, Aäsgard). Ces enseignes ne sont pas des fournisseurs B2B directs pour les artisans LIGNIA.

**Décision** : Aucune colonne `network_name` en base. Valeur libre dans `technical_description` si nécessaire.

**Règle** : `network_name` ≠ `supplier_name`. Ne jamais créer une table `networks` ou `distributors` avant V2.

---

## D-15 — [DOC-ALIGN-1] `angle_deg` SMALLINT accepté pour le MVP

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ⚠️ Dette mineure acceptée |

**Contexte** : Les docs de référence supposaient `angle_deg` TEXT pour gérer les éléments réglables (`30-45°`, `variable`…). En base, `angle_deg` est SMALLINT.

**Décision** : `angle_deg` reste SMALLINT pour le MVP. Les éléments à angle réglable peuvent utiliser `angle_deg = NULL` complété d’une description technique dans `description` ou `technical_description`.

**Alternatives rejetées** : Migration vers TEXT — perd la capacité de filtrage numérique dans `search_quote_items_v2`.

**Conséquences** : Aucun impact sur les imports actuels Lorflex/Joncoux (tous les angles sont des entiers fixes). Dette mineure — une évolution future pourra introduire `angle_variable BOOLEAN` ou une représentation plus riche si nécessaire.

---

## D-16 — [DOC-ALIGN-1] `normalization_confidence` ≠ `confidence_pct` OEM

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Contexte** : Les docs candidats utilisaient `confidence_pct` pour mesurer la confiance sur l’origine industrielle/OEM d’un produit. La base contient `normalization_confidence` qui mesure uniquement la qualité de normalisation des données (parsing).

**Décision** : Ne pas fusionner ces deux concepts.
- `normalization_confidence` = qualité parsing/normalisation (0-100)
- `confidence_pct` OEM = confiance sur l’identification fabricant réel — concept différent

Pas de nouvelle colonne maintenant. Si nécessaire en V2, créer `oem_confidence_pct` distinct.

**Règle** : Ne jamais utiliser `normalization_confidence` comme proxy de fiabilité OEM.

---

*ARCH-DOC-1 v1.3 — 2026-05-17 — DOC-ALIGN-1*
