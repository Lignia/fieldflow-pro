# DECISION_LOG.md

> Pourquoi un choix a été fait, pas seulement quoi.
> Lire avant toute modification d'une RPC ou d'un schéma concerné.

---

## État actuel — Mai 2026

Sessions appliquées : CAT-3, RESET-CATALOG-2 v1.3, SQI-1, SEC-1, SQI-2, PRICING-1, WRAPPER-1, ARCH-DOC-1, DOC-ALIGN-1, CATALOG-STABILIZE-1, SESSION-2, SESSION-3, SESSION-C (Joncoux 6 093 articles).
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

**Règle** : `supplier_name = 'Joncoux'` (groupement Sphering/Lorflex qui facture). `manufacturer_name = 'Joncoux'` pour les conduits Apollo, `'Paroc'` pour les isolants achetés chez Lorflex, `'Firerock'` pour les panneaux, etc. La séparation fabricant/distributeur est portée par `manufacturer_name` + `distributor_name`, pas par `supplier_name`.

---

## D-10 — [DOC-ALIGN-1] `technology_type` ≠ `canonical_technology`

| Date | Session | Statut |
|---|---|---|
| 2026-05-17 | DOC-ALIGN-1 | ✅ Appliqué |

**Contexte** : Les docs proposaient `canonical_technology` avec 12 valeurs figées. En base, `technology_type` TEXT a les valeurs réelles.

**Décision** : Ne pas créer `canonical_technology`. `technology_type` est l'implémentation retenue.

**Règle** : `technology_type = NULL` est correct pour les articles non-fumisterie (KEMP Environment Layer, ouvrages). Ne pas forcer une valeur artificielle.

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

**Décision** : `item_family` est le candidat naturel. CHECK remplacé par 13 valeurs cibles (Session CATALOG-STABILIZE-1 M2).
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

**Décision** : Ne pas fusionner `normalization_confidence` (qualité parsing) et `confidence_pct` OEM (fiabilité fabricant). Si nécessaire en V2, créer `oem_confidence_pct` distinct.

---

## D-17 — [CATALOG-STABILIZE-1 + SESSION-2] Stratégie legacy vs central

| Date | Session | Statut |
|---|---|---|
| 2026-05-19 | CATALOG-STABILIZE-1 + SESSION-2 | ✅ Appliqué |

**Contexte** : 18 260 articles Joncoux legacy avec `is_central=false`, `tenant_id` renseigné sur 3 tenants.

**Décision** : Les articles legacy restent intacts. Catalogue central `CENTRAL_LIGNIA` créé à côté. Les nouveaux imports alimentent uniquement le central.

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

**Décision** : Deux colonnes JSONB sur `catalog_items` pour le modèle multi-distributeurs MVP.
**TEMPORAIRE MVP** — Cible V2 : `catalog.catalog_item_suppliers` (table relationnelle normalisée).
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

**Contexte** : Lorflex distribue plusieurs marques (Joncoux conduits, Paroc isolants, Firerock panneaux, KEMP accessories). La séparation fabricant/canal d'achat doit être claire en base pour que `resolve_item_price` et les grilles de remises fonctionnent correctement.

**Décision** :
- `supplier_name` = qui facture l'artisan = canal d'achat = `'Joncoux'` (groupement Sphering/Lorflex)
- `manufacturer_name` = qui fabrique = `'Joncoux'` (conduits Apollo), `'Paroc'` (isolants), `'Firerock'` (panneaux), `'KEMP SAS'` (accessoires)
- `distributor_name` = enseigne commerciale = `'Lorflex'`
- `primary_vendor` = `{"name":"Lorflex","bareme_code":"LX_ATRIER_25"}`

**Ce qu'on ne fait PAS en MVP** :
- Pas de table `suppliers` distincte
- Pas de gestion des prix d'achat alternatifs (Richardson, Cédéo, Comafranc)
- Pas de rapprochement avec données fabricants externes

**Ce qu'on prévoit sans construire** : `other_vendors` JSONB est déjà là pour le jour où un artisan aura deux sources d'achat pour le même article.

**Règle** : `supplier_name` sensible à la casse. Le fait que Lorflex appartienne au groupe Joncoux est un détail commercial sans impact sur le modèle. Ce qui compte : "je commande chez Lorflex, j'ai une remise de 52%, voilà mon prix net."

---

## D-22 — [SESSION-C] Grilles de remises multi-niveaux — anticipation V2

| Date | Session | Statut |
|---|---|---|
| 2026-05-20 | SESSION-C | ✅ Colonnes ajoutées / ⚠️ Logique V2 |

**Contexte** : Le modèle MVP `tenant_supplier_discounts` a une remise unique par `supplier_name`. En réalité chaque artisan a une grille par fabricant et par famille produit :
- Conduits Apollo Pellets (systeme_etanche) : 52%
- Grilles air chaud (environment) : 35%
- Isolants Paroc : 45%
- Consommables entretien : 40%

**Décision** : Trois colonnes ajoutées à `tenant_supplier_discounts` en prévision V2 :
- `manufacturer_name TEXT` — NULL en MVP
- `item_family TEXT` — NULL en MVP
- `technology_type TEXT` — NULL en MVP

**Logique de résolution V2 (cascade du plus spécifique au plus général)** :
1. `tenant + supplier_name + manufacturer_name + item_family`
2. `tenant + supplier_name + manufacturer_name`
3. `tenant + supplier_name` ← MVP actuel
4. remise par défaut du tenant

**En MVP** : `resolve_item_price` prend la ligne la plus générale (toutes les colonnes V2 à NULL). Aucune modification de `resolve_item_price` nécessaire maintenant.

**Règle** : La grille de remises fait foi — c'est l'artisan qui la configure, pas LIGNIA. LIGNIA affiche le prix net calculé, l'artisan ajuste si sa grille réelle diffère.

---

## D-23 — [SESSION-C] `eligible_fonds_air_bois` sur `catalog_items`

| Date | Session | Statut |
|---|---|---|
| 2026-05-20 | SESSION-C | ✅ Appliqué |

**Contexte** : La prescription MaPrimeRénov' et les aides régionales Fonds Air Bois nécessitent de savoir si un appareil est éligible. Ce critère est distinct de Flamme Verte (critères régionaux variables, programmes locaux).

**Décision** : Colonne `eligible_fonds_air_bois BOOLEAN DEFAULT false` ajoutée à `catalog_items`. À renseigner depuis `catalog.heating_appliances.ademe_fonds_air_bois_status`.

**Ce qui ne change pas** : `heating_appliances` reste la table de référence des appareils ADEME (1 516 lignes). Le champ sur `catalog_items` permet de l'exposer dans `search_quote_items_v2` sans jointure.

**Règle** : Un appareil peut être Flamme Verte sans être éligible Fonds Air Bois. Les deux booléens sont indépendants.

---

*ARCH-DOC-1 v1.5 — 2026-05-20 — SESSION-C*
