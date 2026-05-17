# LIGNIA ARCHITECTURE LEDGER

> Version 1.0 — 2026-05-17  
> Source de vérité pour Lovable, Claude, et toute session technique future.  
> Ce document ne décrit PAS ce qui devrait être. Il décrit ce qui EST, et pourquoi.

---

## 1. VISION PRODUIT ET ARCHITECTURE CIBLE

**Produit** : SaaS vertical pour artisans en chauffage/fumisterie (France).  
**Utilisateurs** : Artisans-installateurs multi-tenant. 7 tenants actifs.  
**Stack** : React + TypeScript + Vite (Lovable) ↔ Supabase PostgreSQL (EU West).  
**Projet Supabase** : `hejxvqghsyaauwzkfikg` — LIGNIA 4.

**Architecture cible :**
```
catalog.*   = référentiel produit + outils de recherche
billing.*   = cycle commercial complet (devis → facture → commande)
core.*      = entités métier (client, bien, projet, installation)

Lovable    → catalogDb.rpc()  → catalog.* (wrappers)
                              ↓
                         public.* (implémentations)
```

**Principe central** :
- `catalog_items` = mutable (source des prix et dims)
- `quote_lines` = snapshot immuable (preuve contractuelle)
- Les deux ne doivent jamais être confondus.

---

## 2. INVARIANTS TECHNIQUES ABSOLUS

Violations = bug ou fraude. Sans exception.

```
[PRICING]
unit_price_ht   = prix vente client    — JAMAIS écrasé par net_price_ht
unit_cost_price = net_price_ht         — JAMAIS affiché au client
Calcul TTC      = total_ht × (1 + vat_rate / 100)
vat_rate        ∈ {5.5, 10.0, 20.0}   — JAMAIS 0.055 / 0.10 / 0.20
vat_rate = 0    = interdit sauf justification explicite
remise          = tenant_supplier_discounts uniquement — JAMAIS dans catalog_items

[SNAPSHOT]
quote_lines.metadata = immuable après insertion (pricing + prescription)
quote_lines.product_id → catalog_items.id   (jamais catalog_item_id)
billing.quote_lines.*_snapshot = figé à l'insertion — jamais recalculé

[CATALOGUE CENTRAL]
is_central=true ↔ tenant_id IS NULL  (contrainte CHECK active)
UNIQUE (supplier_name, supplier_ref) WHERE is_central=true
Jamais écrire is_central=true sans passer par le pipeline staging

[SÉCURITÉ DTA]
has_dta = (dta_status = 'confirmed') — cohérence obligatoire
needs_human_review = true UNIQUEMENT pour sécurité/DTU/DTA
ADEME confirmed = registre officiel uniquement — JAMAIS catalogue fabricant
Flamme Verte confirmed = registre Qualit EnR/ADEME uniquement

[RPC WRAPPER]
catalog.* = interface Lovable (catalogDb.rpc())
public.*  = implémentation interne
Toute modification RETURNS TABLE dans public.* doit être répercutée dans catalog.*

[STAGING]
import_joncoux_staging : service_role uniquement
Jamais publier sans import_status = 'valid'
```

---

## 3. ARCHITECTURE SUPABASE — ÉTAT RÉEL

### 3.1 Schémas et tables

#### `catalog` (18 tables)

| Table | Lignes | Statut | Rôle |
|---|---|---|---|
| `catalog_items` | 18 260 | STANDARD | Référentiel produit principal |
| `heating_appliances` | 1 516 | STANDARD | Registre ADEME appareils |
| `import_joncoux_staging` | 0 | STANDARD | Sas import central |
| `tenant_supplier_discounts` | 0 | STANDARD | Remises négociées |
| `family_search_profiles` | 34 | STANDARD | Ranking recherche devis |
| `search_synonyms` | 57 | STANDARD | Jargon artisan → nomenclature |
| `supplier_range_mappings` | 27 | STANDARD | Gammes fournisseur → tech LIGNIA |
| `compatibility_rules` | 4 | STANDARD | Compatibilité inter-marques |
| `supplier_brands` | 60 | STANDARD | Référentiel marques |
| `supplier_column_mappings` | 2 | STANDARD | Mapping import fichiers |
| `catalogs` | 8 | LEGACY | Conteneur catalogue tenant |
| `device_types` | 24 | LEGACY | Types d'appareils (ancienne taxo) |
| `product_terms` | 0 | LEGACY | Termes produits (inutilisé) |
| `supplier_connectors` | 0 | FUTUR | Config envoi commandes |
| `supplier_order_logs` | 0 | FUTUR | Journal commandes |
| `tenant_appliance_brands` | 0 | FUTUR | Filtrage marques par artisan |
| `heating_appliance_import_rows` | 0 | FUTUR | Staging import fabricants |

#### `billing` (12 tables)

| Table | Lignes | Statut | Rôle |
|---|---|---|---|
| `quotes` | 119 | STANDARD | Devis artisan |
| `quote_lines` | 83 | STANDARD | Lignes snapshot immuables |
| `invoices` | 3 | STANDARD | Factures (deposit/final/avoir) |
| `invoice_lines` | 3 | STANDARD | Lignes facture |
| `document_sequences` | 7 | STANDARD | Numérotation docs |
| `quote_sections` | 8 | STANDARD | Sections visuelles devis |
| `quote_system_sections` | 0 | STANDARD | Sections système (fumisterie) |
| `purchase_orders` | 0 | STANDARD | Bons de commande fournisseur |
| `purchase_order_lines` | 0 | STANDARD | Lignes BDC |
| `sale_orders` | 0 | FUTUR | Commandes client |
| `delivery_notes` | 0 | FUTUR | BL réception |
| `payments` | 0 | FUTUR | Paiements |

#### `core` (9 tables)

| Table | Lignes | Statut | Rôle |
|---|---|---|---|
| `tenants` | 7 | STANDARD | Artisans (multi-tenant racine) |
| `users` | 7 | STANDARD | Utilisateurs liés aux tenants |
| `customers` | 27 | STANDARD | Clients |
| `properties` | 26 | STANDARD | Biens immobiliers |
| `projects` | 23 | STANDARD | Projets commerciaux |
| `activities` | 131 | STANDARD | Log d'événements (immuable) |
| `installations` | 3 | STANDARD | Installations réalisées |
| `technical_surveys` | 0 | STANDARD | Visites techniques |
| `documents` | 0 | STANDARD | Documents liés |

### 3.2 État réel du catalogue

```
catalog_items    : 18 260 articles
supplier_name    : 'Joncoux' à 100% (1 seul fournisseur chargé)
is_central       : false à 100% (import central non encore exécuté)
pricing_status   : priced 18 259 / NULL 1
normalization    : auto_probable 14 389 / needs_review 2 622 / auto_exact 1 248
has_dta          : false 18 260 (règles DTA non appliquées)
needs_human_review: false 18 260
energy_type ARRAY: vide à 100% (pre-enrichissement)
item_family      : vide à 100% (pre-import multi-fournisseurs)

heating_appliances: 1 516 appareils (source ADEME 2026)
quote_lines       : 83 lignes / unit_cost_price = NULL à 100% (L1 non branché)
```

### 3.3 Colonnes critiques `catalog.catalog_items` (119 colonnes)

**Identité / origine :**
```
id uuid PK | catalog_id FK | tenant_id (NULL=central) | is_central bool NOT NULL DEFAULT false
supplier_name | supplier_ref | distributor_name | manufacturer_name
source_system | source_file | import_batch_id | bareme_code
raw_label | customer_label | normalized_name | technical_description
```

**Pricing :**
```
unit_price_ht | vat_rate | cost_price | pricing_status | prix_sur_devis
add_on_price_ht | valid_from | valid_until | replaced_by_item_id
```

**Taxonomie fumisterie :**
```
product_kind TEXT         | technology_type TEXT       | item_family TEXT
component_role TEXT       | supplier_range TEXT        | supplier_family TEXT
supplier_series TEXT      | environment_category TEXT  | installation_context TEXT[]
energy_type TEXT[]        | appliance_type TEXT
```

**Dimensions :**
```
diameter_inner_mm SMALLINT | diameter_outer_mm SMALLINT | length_mm SMALLINT
angle_deg SMALLINT (D-15)  | insulation_mm SMALLINT
material_inner | material_outer | inox_grade_inner | inox_grade_outer
```

**Sécurité/prescription :**
```
has_dta bool NOT NULL DEFAULT false
dta_status TEXT {confirmed|missing|not_applicable|unknown}
needs_human_review bool NOT NULL DEFAULT false
is_etanche bool NULLABLE (NULL ≠ false — tester === false)
data_quality_status TEXT
```

**Normalisation :**
```
normalization_status TEXT {auto_exact|auto_probable|needs_review}
normalization_confidence NUMERIC
normalization_source TEXT | parser_version TEXT
```

### 3.4 Colonnes critiques `billing.quote_lines` (35 colonnes)

```
id | tenant_id | quote_id | product_id (FK catalog_items.id)
label | qty | unit | unit_price_ht NOT NULL | vat_rate NOT NULL
total_line_ht | sort_order | metadata JSONB NOT NULL
unit_cost_price NULLABLE | line_type | item_type | line_category
supplier_ref_snapshot | supplier_sku_snapshot | supplier_name_snapshot
raw_label_snapshot | normalized_label_snapshot | customer_label | display_label
discount_pct | appliance_id | appliance_snapshot JSONB
ai_generated | ai_confidence | ai_reason
section_id | system_section_id
```

**Note critique** : `quote_line_id` et `source_line_id` sont dans `invoice_lines`, PAS dans `quote_lines`.

### 3.5 RPCs réelles

#### Interface Lovable (`catalog.*`) — appel via `catalogDb.rpc()`

| RPC | Signature | Statut | Usage |
|---|---|---|---|
| `catalog.search_quote_items_v2` | (tenant, query, suppliers[], context, low_prio, limit) | STANDARD | RPC principale catalogue Lovable |
| `catalog.search_quote_items` | identique | LEGACY | Wrapper v1 — ne plus utiliser |
| `catalog.resolve_item_price` | (item_id, tenant_id, supplier_name) | STANDARD | Seule source du prix achat |
| `catalog.import_supplier_items` | (tenant, supplier, items jsonb, margin) | LEGACY | Import tenant privé |
| `catalog.save_lines_as_bundle` | (tenant, name, lines, notes) | STANDARD | Sauvegarde bundle |
| `catalog.match_product` | (term, installation_id, limit) | STANDARD | Matching produit |
| `catalog.delete_catalog_with_items` | (catalog_id) | STANDARD | Suppression catalogue |

#### Implémentations internes (`public.*`)

| RPC | Statut | Note |
|---|---|---|
| `public.search_quote_items_v2` | STANDARD | Implémentation native 34 colonnes |
| `public.search_quote_items` | LEGACY | V1 — 25 colonnes |
| `public.search_heating_appliances` | STANDARD | Recherche appareils ADEME |
| `public.replace_quote_lines` | STANDARD | Remplacement transactionnel lignes |
| `public.import_supplier_items` | LEGACY | Doublon de catalog.import_supplier_items |

#### Colonnes retournées par `search_quote_items_v2` (34 colonnes)
```
-- 25 colonnes legacy + 9 nouvelles :
needs_human_review, pricing_status, prix_sur_devis, is_etanche,
has_dta, dta_status, energy_type_simple (TEXT extrait de energy_type[1]),
is_central, source_system
```

### 3.6 RLS — Modèle de sécurité

**Principe général** : `tenant_id = auth.uid()` ou `tenant_id = (SELECT tenant_id FROM core.users WHERE id = auth.uid())`

```
core.*           : CRUD authenticated par tenant_id
billing.*        : CRUD authenticated par tenant_id
catalog.catalog_items : SELECT authenticated (central + tenant) | INSERT/UPDATE/DELETE authenticated tenant
catalog.import_joncoux_staging : ALL authenticated — policy qui BLOQUE (retourne false)
catalog.heating_appliance_import_rows : ALL service_role uniquement
catalog.heating_appliances : SELECT global ou tenant | INSERT/UPDATE/DELETE tenant uniquement
catalog.compatibility_rules : SELECT readonly
catalog.search_synonyms : SELECT readonly
catalog.supplier_range_mappings : SELECT readonly
core.tenants/users : no INSERT/UPDATE/DELETE par public
core.activities : no DELETE, no UPDATE
billing.document_sequences : no INSERT/UPDATE/DELETE par public
billing.payments : no DELETE
```

### 3.7 Edge Functions actives

| Slug | Version | Rôle |
|---|---|---|
| `provision-tenant` | 6 | Création artisan + catalog init |
| `import-catalog` | 18 | Import articles fournisseur |
| `import-appliances` | 4 | Import appareils fabricant |
| `run-import-nova` | 3 | Import Nova Groupe (batch) |
| `ademe-bulk-insert` | 1 | Import registre ADEME |

### 3.8 Migrations — Historique clé

```
20260422   fix_rls_operations_insert_with_check        — Fondations RLS
20260423   installations + billing + catalog roadmap   — Base MVP
20260425   catalog_import_supplier_rpc                 — Pipeline import
20260428   catalog_items_normalization_fields          — Moteur normalisation
20260428   billing_quote_system_sections               — Sections fumisterie
20260429   rpc_search_quote_items                      — Recherche v1
20260501   heating_appliances + staging import         — Registre ADEME
20260505   ademe_2026_import (chunks 00-14)            — 1 516 appareils
20260506   add_resolve_item_price_rpc                  — Pricing net
20260515   cat3_add_critical_catalog_columns           — DTA/NHR/is_etanche
20260516   cat2_v2_enrich_joncoux                      — bareme + manufacturer
20260516   reset_catalog_2_v1.3                        — Pipeline staging
20260516   sqi1 + sec1                                 — Fix central + RLS staging
20260517   sqi2 + pricing1 + wrapper1                  — search v2 + resolve v2
20260517   db_comment_1_final                          — Documentation en base
```

---

## 4. CONTRATS FRONTEND → BACKEND

### 4.1 Client Lovable

```typescript
// Client catalogue (schema catalog) — OBLIGATOIRE
const catalogDb = supabase.schema('catalog')

// Appel standard
const { data } = await catalogDb.rpc('search_quote_items_v2', {
  p_tenant_id: tenantId,
  p_query: query,
  p_active_supplier_names: activeSuppliers,  // string[] | null
  p_quote_context: 'fumisterie',
  p_include_low_priority: false,
  p_limit: 12
})

// Prix achat (dans addItem() UNIQUEMENT)
const { data: price } = await catalogDb.rpc('resolve_item_price', {
  p_item_id: item.id,
  p_tenant_id: tenantId,
  p_purchase_supplier_name: null  // optionnel
})
// price.net_price_ht   → unit_cost_price (jamais unit_price_ht)
// price.pricing_source → 'supplier_bareme' | 'central_catalog' | ...
```

### 4.2 Types TVA

```typescript
type VatRate = 5.5 | 10 | 20  // stockage DB : 5.5 / 10.0 / 20.0
// JAMAIS : 0.055 / 0.10 / 0.20
// Calcul : total_ttc = total_ht * (1 + vat_rate / 100)
```

### 4.3 Structure `metadata` de `quote_lines` (snapshot immuable)

```typescript
interface QuoteLineMetadata {
  pricing: {
    status: string           // pricing_status au moment de l'ajout
    public_price_ht: number  // unit_price_ht catalog
    net_price_ht: number     // prix achat résolu
    discount_pct: number
    discount_applied: boolean
    pricing_source: string   // 'supplier_bareme' | 'central_catalog' | ...
    bareme_code: string | null
    resolved_at: string      // ISO datetime — OBLIGATOIRE
  }
  prescription: {
    catalog_item_id: string  // OBLIGATOIRE
    diameter_inner_mm: number | null
    technology_type: string | null
    energy_type: string | null
    is_etanche: boolean | null
    has_dta: boolean
    dta_status: string | null
    needs_human_review: boolean
    supplier_name: string | null
    manufacturer_name: string | null
  }
}
// JAMAIS modifier après insertion
```

### 4.4 `pricing_source` — valeurs possibles

```
supplier_bareme     — remise spécifique au barème
supplier_global     — remise globale fournisseur
distributor_bareme  — remise distributeur barème
distributor_global  — remise distributeur globale
central_catalog     — article central sans remise configurée
null                — prix non résolu
```

### 4.5 `payload` JSONB — dette contrôlée

```typescript
// quotes.payload / invoices.payload — temporaire
{
  tva: {
    logement_eligible_tva_reduite: boolean | null
    tva_attestation_collected: boolean
    annee_construction?: number        // properties.payload.fiscal
  }
  aides?: {                            // MaPrimeRénov, CEE
    mpr_eligible?: boolean
    cee_eligible?: boolean
  }
}
// Accès défensif TOUJOURS : payload?.tva ?? {}
// JAMAIS stocker données contractuelles/légales ici
```

### 4.6 `item_family` — valeurs contrôlées applicativement

```typescript
const ITEM_FAMILY_VALUES = [
  'conduit_principal',
  'systeme_etanche',
  'tubage_flexible',
  'tubage_rigide',
  'raccordement_visible',
  'raccordement_pellets_visible',
  'sortie_toiture',
  'gaine_technique',
  'accessoire_fumisterie',
  'adaptateur_transition',
] as const
// Validation côté Edge Function à l'import — pas de CHECK SQL
```

### 4.7 `supplier_name` — politique canonique (D-09)

```
Format  : nom commercial officiel du distributeur d'achat
Exemple : 'Joncoux' (pas 'joncoux', pas 'JONCOUX', pas 'Joncoux France')
Règle   : case-sensitive — doit être identique dans :
          catalog_items.supplier_name
          tenant_supplier_discounts.supplier_name
          billing.purchase_orders.supplier_name
Validation : avant chaque import (Edge Function)
```

---

## 5. DÉCISIONS TECHNIQUES PRISES

Réf. complète : `docs/architecture/project/DECISION_LOG.md` D-01 à D-16

| Décision | Synthèse |
|---|---|
| D-01 | `needs_human_review` = sécurité/DTU/DTA uniquement |
| D-02 | Pipeline staging obligatoire pour import central |
| D-03 | SQI-1 : fix visibilité central (OR tenant_id IS NULL AND is_central) |
| D-04 | search_quote_items_v2 : nouvelle fonction + wrapper catalog (pas DROP/CREATE) |
| D-05 | resolve_item_price : patch JSONB non-breaking (ajout is_central + pricing_source) |
| D-06 | energy_type ARRAY → energy_type_simple TEXT extrait [1] dans RPC (dette CAT-4) |
| D-07 | installation_context TEXT[] + validation applicative (pas ENUM) |
| D-08 | catalog.* = wrappers Lovable / public.* = implémentation |
| D-09 | supplier_name = nom commercial canonique, case-sensitive |
| D-10 | technology_type ≠ canonical_technology — ne pas créer canonical_technology |
| D-11 | product_kind = implémentation de component_type (docs) — ne pas renommer |
| D-12 | item_family = candidat product_family — valeurs contrôlées applicativement |
| D-13 | manufacturer_name NULL acceptable sur import Joncoux — 'unknown' à l'import futur |
| D-14 | network_name = jamais en base |
| D-15 | angle_deg SMALLINT accepté MVP — NULL pour réglable |
| D-16 | normalization_confidence ≠ confidence_pct OEM — concepts distincts |

---

## 6. DETTE TECHNIQUE ACCEPTÉE VOLONTAIREMENT

```
[CRITIQUE — à solder avant Lovable L1]
unit_cost_price = NULL sur 100% des quote_lines
  Cause  : resolve_item_price non appelé dans addItem()
  Fix    : Lovable L1 — brancher addItem() → resolve_item_price

[IMPORTANT — à solder avant V1.5]
energy_type ARRAY vide à 100%
  Cause  : enrichissement post-import non exécuté
  Fix    : Session CAT-4 — migration ou import enrichi

item_family vide à 100%
  Cause  : premier import multi-fournisseurs non exécuté
  Fix    : Edge Function import Poujoulat/Jeremias

manufacturer_name NULL probable sur masse
  Cause  : import Joncoux sans règle 'unknown'
  Fix    : Valider à l'import suivant (pas de migration)

[MINEUR — acceptable MVP]
product_id (quote_lines) ≠ catalog_item_id (purchase_order_lines)
  Cause  : nommage historique différent sur deux tables
  Fix    : Renommage futur après tests d'intégration

catalog.import_joncoux_staging : nom Joncoux-centric
  Cause  : créé avant décision multi-fournisseurs
  Fix    : Renommer post-stabilisation pipeline

angle_deg SMALLINT (pas TEXT pour réglable)
  Cause  : SMALLINT choisi pour filtrage numérique
  Fix    : Ajouter angle_variable BOOLEAN si nécessaire en V2

heating_appliances.flamme_verte_stars sans CHECK IN(5,6,7)
  Fix    : Migration séparée à planifier

catalog.catalog_items.technology_type : 3 valeurs réelles vs taxonomie future
  Fix    : Enrichissement progressif aux prochains imports

catalog.search_quote_items (legacy v1) : wrapper non supprimé
  Fix    : Supprimer après migration Lovable L1

billing.catalog_items.distributor_name : colonne sans COMMENT ON
  Fix    : Vague 3 DB-COMMENT

RLS catalogue central : politiques exactes non documentées
  Fix    : Vague 3 DB-COMMENT

payload (quotes/properties) = dette contrôlée temporaire
  Fix    : Migration V1.5 vers colonnes dédiées
```

---

## 7. ROADMAP V2 / V3 / V4

### V1.5 (prochaine itération)

```
■ Lovable L1 : brancher resolve_item_price dans addItem()
■ Lovable L1 : migrer useCatalogSearch → search_quote_items_v2
■ Session F  : unit_code + accounting_account sur lines
■ Import central Lorflex : Edge Functions import-joncoux-central + publish-joncoux-batch
■ CAT-4 : energy_type ARRAY → TEXT simple
■ TVA V1.5 : migrer payload.tva → colonnes dédiées
```

### V2 (multi-fournisseurs stabilisé)

```
■ Import Poujoulat + Jeremias + Tubest (pipeline staging multi)
■ is_rebranded_product BOOLEAN + oem_source_ref TEXT
■ product_equivalences TABLE (DW-ECO ↔ THERMINOX)
■ appliance_flue_compatibility TABLE
■ Session H : invoice_type CHECK + linked_invoice_id (avoirs)
■ Session I : Vue billing.v_fec_export
■ supplier_connectors : API REST / EDI
■ catalog_item_components (ouvrages/kits)
```

### V3

```
■ Factur-X (e-facturation obligatoire 2026+)
■ supplier_price_lists TABLE (synchro tarifaire automatique)
■ catalog.compatibility_rules enrichissement
■ Vague 3 DB-COMMENT : compatibility_rules, family_search_profiles
■ RLS catalogue central : politiques formalisées
```

### V4

```
■ MaPrimeRénov / CEE API intégration automatique
■ IA prescription conduit (dimensionnement automatique)
■ Sync comptable Evoliz / Pennylane
■ Multi-utilisateurs par tenant
```

---

## 8. RISQUES MAJEURS

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Lovable écrase unit_price_ht avec net_price_ht | Haute | CRITIQUE | COMMENT ON actif en base. Bloquer en L1. |
| supplier_name casse différente à l'import | Haute | Fort | Validation Edge Function avant staging |
| metadata quote_lines modifié post-insertion | Moyenne | CRITIQUE | RLS UPDATE n'interdit pas. À bloquer applicativement. |
| catalog.search_quote_items_v2 wrapper désync | Moyenne | Fort | Documenter dans CI : tester après tout changement public.* |
| ADEME confirmed depuis catalogue fabricant | Faible | CRITIQUE Légal | COMMENT ON actif. Edge Function valide data_source. |
| Accumulation payload comme source de vérité | Haute | Moyen | Documentation + revue code Lovable |
| unit_cost_price NULL en production | Actuelle | Moyen | Lovable L1 prioritaire |
| Fragmentation item_family (valeurs libres) | Haute | Fort | Validation Edge Function obligatoire |
| technology_type incohérent entre fournisseurs | Haute | Moyen | Enrichissement progressif documenté |

---

## 9. QUESTIONS OUVERTES / ARBITRAGES NON DÉCIDÉS

```
Q1. quote_lines.discount_pct
    Colonne présente en base. Jamais utilisée. Rapport avec tenant_supplier_discounts ?
    → Clarifier : est-ce une remise client (différente de la remise achat) ?

Q2. catalog_items.cost_price
    Colonne ancienne (pre-resolve_item_price). Toujours utilisée ?
    → Clarifier avant V1.5 pricing.

Q3. catalog.catalogs (8 lignes)
    Table legacy. Tous les articles ont un catalog_id FK vers cette table.
    → À quelle logique correspond-elle ? Peut-elle être supprimée en V2 ?

Q4. billing.sale_orders vs billing.quotes
    Deux tables de commande client. Quelle est la distinction métier ?
    → Documenté nulle part. À clarifier avant Session F.

Q5. is_central = false sur 18 260 articles
    L'import central (is_central=true) n'a pas encore été exécuté.
    → Quand ? Quelle stratégie de migration tenant_id=uuid → NULL ?
    → Les 18 260 articles actuels passent-ils à is_central=true ?

Q6. catalog.device_types (24 lignes) et catalog_items.device_category
    Table de référence, inutilisée dans les RPCs actuelles.
    → Activée en V2 pour prescription appareils ?

Q7. RLS import_joncoux_staging
    Policy ALL authenticated retourne false (deny-all).
    Mais service_role n'a PAS de policy dédiée → service_role bypasse RLS par défaut.
    → Documenter formellement ce comportement Supabase dans DATABASE_INVARIANTS.

Q8. `tenant_appliance_brands` (0 lignes)
    Table pour filtrer les 1 516 appareils ADEME par artisan.
    → Activée en V1.5 ou V2 ?

Q9. Lovable D-ter (UX remises fournisseur)
    Interface de saisie des remises dans tenant_supplier_discounts.
    → Précède ou suit Lovable L1 ?

Q10. heating_appliances.appliance_type vs catalog_items.product_kind
     Taxonomies incompatibles (ADEME vs LIGNIA).
     La couche prescription/mapping n'est pas encore implémentée.
     → Qui la construit ? Lovable ? Edge Function ? RPC ?
```

---

## ANNEXE — Objets à ne pas créer (Décision ARCH-DOC-1 + DOC-ALIGN-1)

```
❌ canonical_technology  (doublon technology_type incompatible)
❌ product_family colonne (item_family existe et est vide)
❌ component_type colonne (c'est product_kind)
❌ network_name           (jamais en base — D-14)
❌ brand_name colonne     (brand TEXT libre suffit MVP)
❌ brands TABLE           (manufacturer_name TEXT suffit MVP)
❌ networks/distributors TABLE
❌ appliance_flue_compatibility (avant V2)
❌ product_equivalences   (avant V2)
❌ installation_rules TABLE (logique applicative)
❌ CHECK sur technology_type maintenant (taxonomie partielle)
❌ Trigger unit_price_ht → prix_sur_devis (côté application)
```

---

*LIGNIA Architecture Ledger v1.0 — 2026-05-17*  
*Généré depuis audit Supabase réel + sessions CAT-2/3, SQI-1/2, PRICING-1, WRAPPER-1, ARCH-DOC-1, DB-COMMENT-1, DOC-ALIGN-1*
