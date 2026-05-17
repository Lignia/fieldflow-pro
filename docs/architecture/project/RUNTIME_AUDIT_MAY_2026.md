# RUNTIME AUDIT — MAI 2026

> Session : RUNTIME-STABILIZATION-1 / RUNTIME-AUDIT-REPORT-1  
> Date    : 2026-05-17  
> Projet  : LIGNIA 4 — `hejxvqghsyaauwzkfikg` (Supabase EU West)  
> Sources : audit SQL direct + logs API 24h + lecture corps des RPCs

---

## 1. Résumé Exécutif

### Ce qui est réellement branché

```
✅ Authentification multi-tenant       — fonctionne
✅ Dashboard KPIs billing              — quotes, invoices, interventions lus correctement
✅ Pipeline projet / activities        — transitions RPC actives
✅ catalog.search_quote_items_v2       — RPC fonctionnelle, 34 colonnes, scoring correct
✅ catalog.resolve_item_price          — logique A/B/C/D correcte, JSONB complet
✅ RLS sur tous les schémas            — modèle cohérent
✅ Catalogue fumisterie                — 18 260 articles Joncoux, prix remplis
✅ heating_appliances ADEME            — 1 516 appareils structurés
```

### Ce qui est encore partiellement simulé ou non branché

```
❌ quote_lines.metadata               — {} sur 100% des 83 lignes
❌ addItem() → resolve_item_price     — non branché (0 appel RPC dans les logs 24h)
❌ CatalogPopover → search_v2         — aucun appel RPC catalogue détecté en production
❌ unit_cost_price via RPC            — rempli manuellement sur certaines lignes, pas via RPC
❌ Snapshots supplier / prescription  — partiels ou absents
❌ Catalogue central publié           — is_central=false sur 100% des articles
❌ tenant_supplier_discounts          — 0 remise configurée → pricing_source=NULL
```

### Niveau de maturité global

La structure de données est saine et bien conçue. Les RPCs sont opérationnelles côté base.  
Le gap est côté frontend : le flux `CatalogPopover → addItem() → quote_lines` n'exploite pas encore les RPCs catalogue. Les devis actuels sont créés par un flux legacy non identifié dans les logs API.

---

## 2. Catalogue Central — `is_central = false` sur 100%

### Constats réels

```
catalog_items : 18 260 articles
is_central    : false sur 18 260 (100%)
tenant_id     : SET sur 18 260 (100% — jamais NULL)

Répartition par tenant :
  CHAUDE AMBIANCE  (78927921) : 6 087 articles
  AMD FLAMME       (aeb616ee) : 6 086 articles
  AMBIANCE CHALEUR (dbd5a19f) : 6 086 articles
  HERVE THERMIQUE  (f1766281) :     1 article
```

### Explication — ce qui s'est passé

L'import Joncoux a été exécuté via `catalog.import_supplier_items` ou l'Edge Function `import-catalog`, répété par tenant de test. Chaque exécution a assigné les articles au tenant appelant. Il n'y a pas eu de pipeline staging central (`import_joncoux_staging`) ni de publication `is_central=true`.

La contrainte `CHECK check_central_consistency` est active et correcte :
```sql
(is_central=true AND tenant_id IS NULL)
OR
(is_central=false AND tenant_id IS NOT NULL)
```
Elle garantit la cohérence — pas de bug ici.

### Pourquoi ce n'est pas une dette critique maintenant

Les articles avec `is_central=false` et `tenant_id` renseigné sont **visibles et utilisables** pour les tenants qui les possèdent. La recherche `search_quote_items_v2` les inclut correctement via la clause `(tenant_id = p_tenant_id OR (tenant_id IS NULL AND is_central=true))`. Les artisans des 3 tenants de test voient leur catalogue sans erreur.

L'impact réel est sur le **pricing** : `resolve_item_price` retourne `pricing_source=NULL` (pas `central_catalog`) pour ces articles, car `is_central=false`. C'est fonctionnellement cohérent — simplement sans distinction achat/vente opérationnelle.

### Pourquoi ne pas migrer brutalement maintenant

Passer les 18 260 articles à `is_central=true, tenant_id=NULL` via un `UPDATE` direct créerait plusieurs problèmes :

1. **Visibilité immédiate cross-tenant** : tous les articles deviennent visibles à tous les artisans, y compris futurs. Sans politique tarifaire configurée, cela expose les prix Joncoux à des tenants non ciblés.
2. **Contrainte CHECK stricte** : le passage nécessite de mettre `tenant_id=NULL` en même temps que `is_central=true`. Un UPDATE partiel ou raté laisse la base dans un état invalide.
3. **Pas de remises configurées** : sans `tenant_supplier_discounts`, tous les articles centraux retournent `pricing_source=central_catalog` sans discount — le pricing artisan est inexistant.
4. **Pipeline staging prévu** : le pipeline `import_joncoux_staging → validation → publication` existe précisément pour contrôler cette transition. L'utiliser garantit la traçabilité (`import_batch_id`) et la possibilité de rollback.

**La bonne action** : exécuter le pipeline `import-joncoux-central` + `publish-joncoux-batch` (Edge Functions planifiées) lorsque les remises seront configurées pour au moins un tenant de production.

---

## 3. Runtime Devis Réel

### Constats mesurés

```
quote_lines (83 lignes totales) :
  metadata = {}              : 83/83  (100%)
  product_id IS NULL         : 77/83  (93%)
  unit_cost_price IS NULL    : 58/83  (70%)
  supplier_ref_snapshot NULL : 79/83  (95%)
  supplier_name_snapshot NULL: 79/83  (95%)
  appliance_snapshot NULL    : 83/83  (100%)

  Lignes avec product_id     : 6/83   (7%)
  Dont unit_cost_price rempli: 6/6    (100% de celles-là)
  Lignes sans product_id
  mais unit_cost_price rempli: 19/77  (24% — saisie manuelle probable)
```

### Causes probables

**Flow legacy actif.** Les logs API ne montrent aucun appel aux RPCs catalogue (`/rpc/search_quote_items_v2`, `/rpc/resolve_item_price`). Les devis sont créés via un flux qui insère directement dans `billing.quote_lines` sans passer par les RPCs — probablement via une ancienne interface Lovable ou un INSERT direct depuis le formulaire de devis.

Les 6 lignes avec `product_id` rempli correspondent à des tests où l'article a été lié manuellement. Les snapshots `supplier_ref_snapshot` et `supplier_name_snapshot` présents sur ces 4 lignes confirment qu'une version du flux les capturait correctement à un moment.

**`metadata NOT NULL` mais `= {}`**. La contrainte DDL `NOT NULL` est satisfaite par l'objet vide `{}`. Le code Lovable actuel insère `{}` ou `null::jsonb` coercé en `{}`. La structure documentée (`pricing.resolved_at`, `prescription.catalog_item_id`) n'a jamais été implémentée côté Lovable.

**`addItem()` non stabilisé.** La fonction côté frontend qui devrait :
1. Appeler `resolve_item_price` pour récupérer `net_price_ht`
2. Construire le JSONB `metadata`
3. Insérer la ligne avec `product_id`, `unit_cost_price`, et `metadata` complets

…n'existe pas ou n'est pas branchée dans la version déployée.

### Impact

Les devis existants sont **contractuellement fragiles** : aucun snapshot pricing ni prescription. Si un prix catalogue change, il est impossible de prouver le prix au moment de la création. Les 3 factures existantes ont hérité de `metadata={}` par le même mécanisme.

Pour les 83 lignes actuelles, l'impact est limité car c'est du contexte de test. En production avec de vrais clients, ce serait un problème légal.

---

## 4. Pricing Runtime

### État mesuré

```
resolve_item_price — test live sur article bareme_code='10.35', tenant CHAUDE AMBIANCE :
  status          : 'no_discount_configured'
  is_central      : false
  net_price_ht    : 202.0   ← = unit_price_ht (pas de remise)
  pricing_source  : null    ← NULL car is_central=false ET 0 remise
  discount_applied: false

tenant_supplier_discounts : 0 ligne pour tous les tenants
```

### Ce qui fonctionne

La logique de `resolve_item_price` est correcte et complète. Les 4 niveaux de priorité (supplier_bareme → distributor_bareme → supplier_global → distributor_global) sont implémentés. Le JSONB retourné contient toutes les clés documentées. La RPC n'a pas de bug.

### Ce qui manque

`tenant_supplier_discounts` est vide. Tant qu'il n'y a aucune remise configurée, `resolve_item_price` retourne toujours `net_price_ht = unit_price_ht` avec `pricing_source=NULL`. Il n'y a pas de distinction prix d'achat / prix de vente opérationnelle pour les artisans.

Par conséquent, `unit_cost_price` dans `quote_lines` — quand il est rempli — est soit saisi manuellement, soit identique à `unit_price_ht`. La marge artisan n'est pas calculée.

### Cohérence

Le runtime pricing est **cohérent mais incomplet**. La RPC ne produit pas de résultat erroné. Elle produit un résultat correct pour l'état actuel des données (0 remise → prix public net). Le problème est l'absence de données de remise et de branchement dans `addItem()`.

---

## 5. `search_quote_items_v2` — État Runtime

### Architecture wrapper

```
catalog.search_quote_items_v2  ← interface Lovable (catalogDb.rpc())
  └→ SELECT * FROM public.search_quote_items_v2(...)  ← wrapper SQL pur
       └→ plpgsql 34 colonnes avec scoring, token analysis, family profiles
```

Le wrapper `catalog.` est un `LANGUAGE sql SECURITY DEFINER` qui délègue directement à `public.`. Aucune logique ajoutée. La signature est identique. Le branchement est correct.

### Test live

Requête `'coude 80'` sur tenant CHAUDE AMBIANCE → 3 résultats cohérents, `unit_price_ht` rempli, `pricing_status='priced'`, colonnes v2 présentes (`is_central`, `needs_human_review`, `has_dta`, `dta_status`, `is_etanche`, `energy_type_simple`, `source_system`).

### Champs avancés encore peu alimentés

```
is_central       : false sur 100% (voir section 2)
energy_type_simple: NULL sur 100% (energy_type ARRAY vide)
is_etanche       : NULL sur 100% des articles pellets/étanches testés
dta_status       : NULL sur 100%
needs_human_review: false sur 100%
source_system    : NULL sur 100%
```

La RPC retourne correctement ces champs — ils sont simplement vides dans les données sources. Les badges ⚠️ ne seront jamais déclenchés tant que `is_etanche` et `dta_status` ne sont pas enrichis.

### Non-utilisation par Lovable

Les logs API des dernières 24h ne contiennent aucun appel `POST /rest/v1/rpc/search_quote_items_v2` ni `POST /rest/v1/rpc/search_quote_items`. Le CatalogPopover Lovable n'appelle pas ces RPCs dans la session observée. Le flow de recherche catalogue côté frontend est à identifier et brancher.

---

## 6. Taxonomie Runtime — `item_family`

### Constat critique

```
item_family dans catalog_items : NULL sur 18 260 (100%)

CHECK en base (réel) :
  item_family IN ('appliance','flue','spare_part','service','labor','kit')

Liste documentée dans ARCH-DOC-1 + DB-COMMENT-1 (COMMENT ON en base) :
  conduit_principal | systeme_etanche | tubage_flexible | tubage_rigide |
  raccordement_visible | raccordement_pellets_visible | sortie_toiture |
  gaine_technique | accessoire_fumisterie | adaptateur_transition
```

Il y a une **contradiction entre le CHECK SQL et la documentation produit**. Ces deux listes sont incompatibles.

### Explication

Le CHECK `{appliance, flue, spare_part, service, labor, kit}` est une taxonomie générique multi-vertical issue des premières migrations (avril 2026, avant la décision de se spécialiser fumisterie). La liste LIGNIA `{conduit_principal, systeme_etanche...}` a été définie lors de DOC-ALIGN-1 comme la taxonomie métier cible.

Les deux n'ont jamais été réconciliées. La colonne est `NULL` à 100%, ce qui signifie que le CHECK n'a jamais bloqué quoi que ce soit — la contradiction est dormante.

### Impact actuel

Nul en runtime aujourd'hui (colonne vide). Mais dès qu'un import ou une Edge Function essaiera de peupler `item_family` avec des valeurs LIGNIA (`conduit_principal`...), le CHECK le rejettera silencieusement ou avec une erreur.

### Ce qu'il faut décider avant tout import

Une seule question : quelle est la vraie taxonomie produit de LIGNIA ?
- Si c'est `{appliance, flue,...}` : mettre à jour la documentation ARCH-DOC-1 et DB-COMMENT-1.
- Si c'est `{conduit_principal,...}` : remplacer le CHECK en base par une migration.

Ce n'est pas une urgence à ce instant (colonne vide), mais c'est un **bloquant avant tout pipeline d'import qui peuple `item_family`**.

---

## 7. Vrai Niveau de Maturité Projet

### ✅ Structure saine

```
Schéma PostgreSQL        — cohérent, contraintes actives, RLS correct
Migrations (97)          — tracées, nommées, appliquées proprement
RPCs catalogue           — search_v2 + resolve_item_price opérationnelles
DB-COMMENT-1             — documentation en base complète
Pipeline staging         — prêt techniquement
RLS import staging       — deny-all authenticated, service_role uniquement
Activities / audit log   — immuable, correct
Billing document_sequences — numérotation opérationnelle
```

### ⚠️ Runtime partiellement branché

```
addItem() Lovable        — ne passe pas par resolve_item_price
CatalogPopover Lovable   — ne passe pas par search_quote_items_v2 (ou non confirmé)
quote_lines.metadata     — champ présent mais {} sur 100%
supplier snapshots       — capturés sur 4% des lignes seulement
unit_cost_price          — rempli partiellement, pas via RPC
payload.tva quotes       — structure documentée mais jamais peuplée
```

### 🚧 Flows legacy encore présents

```
Insertions quote_lines directes sans RPC catalogue
import_supplier_items (RPC legacy) — toujours actif, bypass staging
catalog.search_quote_items (v1 legacy) — wrapper actif, encore potentiellement appelé
public.import_supplier_items — doublon non supprimé
```

### ❌ Non critiques à court terme

```
is_central=false sur 100%   — bloquant pour remises multi-tenant, pas pour l'usage actuel
energy_type ARRAY vide       — badge énergie absent, pas bloquant devis
item_family NULL             — pas d'impact tant qu'aucun import ne le peuple
DTA/is_etanche non enrichis  — sécurité DTU non couverte, acceptable MVP phase test
manufacturer_name NULL       — documentation incomplète, pas d'impact runtime
tenant_supplier_discounts=0  — pricing sans remise, fonctionnel pour tests
```

---

## 8. Priorités Réelles

### CRITIQUE — Bloquant avant tests artisans réels

**C1. Arbitrage `item_family` CHECK vs liste LIGNIA**

Décider quelle taxonomie est la vraie. Mettre en cohérence CHECK SQL et COMMENT ON avant tout import qui peuple ce champ. Pas une migration lourde — une migration simple `DROP CONSTRAINT / ADD CONSTRAINT` ou un COMMENT ON mis à jour.

**C2. Audit code Lovable : identifier le flow réel de `addItem()` et du CatalogPopover**

Identifier dans le code Lovable quel hook ou service gère l'ajout d'une ligne de devis. Les logs API montrent que les RPCs catalogue ne sont pas appelées — il faut savoir pourquoi avant de brancher quoi que ce soit.

**C3. Brancher `search_quote_items_v2` dans le CatalogPopover Lovable**

Une fois le flow identifié, migrer `useCatalogSearch` (ou équivalent) vers `catalogDb.rpc('search_quote_items_v2')`. C'est le point d'entrée de tout le reste.

**C4. Brancher `resolve_item_price` dans `addItem()` + peupler `metadata`**

À l'ajout d'une ligne, appeler la RPC et construire le snapshot `metadata.pricing` + `metadata.prescription`. Sans ça, aucun devis n'est traçable.

### IMPORTANT — Avant premier artisan en production

**I1. Configurer au moins 1 entrée `tenant_supplier_discounts` de test**

Valider le flux pricing end-to-end : `resolve_item_price` → `pricing_source='supplier_bareme'` → `unit_cost_price` distinct de `unit_price_ht`. C'est le test minimal de la marge artisan.

**I2. Enrichir `is_etanche` + `dta_status` sur articles Pellets identifiables**

Les articles PELLETS Ø80/130 et Ø80/125 sont manifestement étanches. `is_etanche=NULL`, `dta_status=NULL`, `needs_human_review=false`. Le badge sécurité DTU 24.1 ne se déclenchera jamais. Un UPDATE ciblé sur les gammes Apollo Pellets / Pellets 2.0 suffit — pas besoin de pipeline complet.

**I3. Identifier et désactiver les flows legacy d'insertion directe dans `quote_lines`**

Tant que le flow legacy bypass les RPCs, les nouvelles colonnes (metadata, snapshots, product_id) resteront vides même après branchement Lovable.

### PLUS TARD — Post-stabilisation Lovable

```
Publication catalogue central (is_central=true)
  → Après configuration des remises pour au moins 1 tenant de prod
  → Via pipeline staging, pas UPDATE direct

Enrichissement energy_type (Session CAT-4)
  → Après branchement search_v2 confirmé

Configuration tenant_supplier_discounts multi-fournisseurs
  → Après premier import Poujoulat/Jeremias

FRONT-DOC-1 : types TypeScript constants
  → Après que le flow réel est stable et documenté
  → Créer src/types/catalog.ts, src/constants/catalog.ts

Session ENRICH-1 complète (DTA pipeline)
  → Après validation du badge ⚠️ côté Lovable

Remplacement CHECK item_family (si nécessaire après arbitrage C1)
  → Migration simple, planifier après décision
```

---

## Annexe — Données Brutes Clés

```
catalog_items         : 18 260 articles / is_central=false / supplier='Joncoux'
quote_lines           : 83 lignes / metadata={} 100% / product_id NULL 93%
billing.quotes        : 119 devis / 3 signés / 14 envoyés / 99 draft
billing.invoices      : 3 factures
heating_appliances    : 1 516 appareils ADEME
tenant_supplier_disc. : 0 remise configurée
family_search_profiles: 34 profils de ranking actifs
search_synonyms       : 57 synonymes métier
normalization_status  : auto_probable 78% / needs_review 14% / auto_exact 7%
encoding résiduel     : noms type 'ROSACE APOLLO PELLETS Ã˜80' (Ø mal encodé)
vat_rate quote_lines  : 10.0 sur 100% des 83 lignes
API logs 24h          : 0 appel RPC catalogue détecté
```

---

*RUNTIME-AUDIT-REPORT-1 — 2026-05-17*  
*Basé sur audit SQL direct + logs API Supabase + lecture corps RPCs*
