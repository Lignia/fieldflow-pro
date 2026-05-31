# ESTIMATE_TO_INSTALLATION_WORKFLOW

> Auteur : Claude Analytics  
> Date : mai 2026 — mis à jour post-arbitrages D-26 / D-28 / D-30  
> Statut : document de référence workflow — lecture obligatoire avant tout prompt Lovable ou Claude Exec sur les modules Devis, VT, Installation, SAV  
> **Référence canonique pour le cycle de vie installation : LIGNIA_LIFECYCLE.md**

---

## Arbitrages actés dans ce document

| Décision | Contenu | Source |
|---|---|---|
| D-26 | 1 installation = 1 appareil principal. N installations par client/propriété. `heating_appliance_id` scalaire, pas de table pivot V1. | Fondateur — mai 2026 |
| D-28 | Signature → installation `status = draft`. Clôture chantier → installation `status = active`. | Fondateur — mai 2026 |
| D-30 | `catalog_items.heating_appliance_id` = P1, pas P0. Ne bloque pas les pilotes. | Fondateur — mai 2026 |

## Décisions ouvertes (ne pas exécuter sans décision)

| Ref | Sujet |
|---|---|
| D-27 | Contenu minimal de `appliance_snapshot` — non décidé |
| D-29 | `catalog_domain` dans `quote_lines` : créer la colonne ou utiliser `appliance_id IS NOT NULL` — non décidé |

---

## Les deux flux d'entrée

### Flux A — Nouveau projet de vente
```
Prospect contacte le showroom
↓
Qualification téléphonique
↓
Devis estimatif (quote_kind = estimate)
↓
Visite technique
↓
Photos chantier (avant travaux)
↓
Devis final (quote_kind = final, previous_quote_id = id estimatif)
↓
Signature → installation créée status = draft  [D-28]
↓
Acompte
↓
Commande fournisseur
↓
Planification
↓
Pose
↓
Photos chantier (après travaux)
↓
Réception chantier
↓
Facture
↓
Clôture chantier → installation status = active  [D-28]
↓
Entretien annuel planifié
↓
SAV si besoin
↓
Remplacement à terme
```

### Flux B — Client existant avec appareil déjà installé
```
Client appelle : "J'ai un MCZ installé en 2017"
↓
Création installation manuelle (core.installations, origin = 'takeover', status = active)
↓
  ├── Flux B1 — Entretien
  │     Devis SAV (quote_kind = service)  → voir règles service dans LIGNIA_V1_MASTER
  │     Intervention planifiée
  │     Facture
  │
  ├── Flux B2 — Panne / SAV
  │     Service request (operations.service_requests)
  │     Intervention (operations.interventions)
  │     Devis réparation si pièces (quote_kind = service)
  │     Facture
  │
  └── Flux B3 — Remplacement
        Nouveau devis estimatif (Flux A dès étape 2)
        actual_replacement_date rempli sur l'ancienne installation
        Nouvelle installation créée à la clôture (status = active)
        predecessor_installation_id → ancienne installation [P3 — colonne à créer]
```

**Note Flux B :** `quote_kind = service` suit les règles définies dans `LIGNIA_V1_MASTER.md` :
1-3 lignes max, pas d'acompte, pas de sections Appareil/Fumisterie/Pose, UI ultra-compacte, optimisé mobile (Luc).

---

## Détail du Flux A — étape par étape

### Étape 1 — Qualification

**Objet créé :** `core.projects` + `core.customers`  
**Données collectées :** type d'appareil souhaité, combustible, surface à chauffer, budget estimé, délai souhaité  
**Tables impliquées :** `core.technical_surveys.desired_device_type`, `heating_volume_m3`, `estimated_budget_eur`  
**Statut projet :** `prospect`

---

### Étape 2 — Devis estimatif

**Objet créé :** `billing.quotes` avec `quote_kind = 'estimate'`  
**Contenu :** appareil pressenti (`appliance_id`), fumisterie estimée, pose estimée  
**Caractéristique clé :** prix indicatifs, pas de relevés réels.

**Règles issues de LIGNIA_V1_MASTER :**
- Non contractuel. Ton informatif.
- PDF : "Proposition commerciale — sous réserve de visite technique"
- Pas d'acompte. Pas de signature engageante. Pas de `signed_at`.
- UI Editor : sans acompte, sans dates visite/travaux.

**Colonnes clés :**
- `quote_kind = 'estimate'`
- `appliance_id` sur les lignes appareil → doit être persisté [P0-01]
- `tva_context` → déjà rempli à 100% en base
- `aides_estimees_total` → déjà présent sur `billing.quotes`

---

### Étape 3 — Visite technique

**Objet créé :** `core.technical_surveys` lié au projet  
**Durée réelle terrain :** 45min à 1h30

**Données collectées (sélection — table complète à 130 colonnes) :**

```
Fumisterie
  flue_scenario, flue_diameter_mm, new_flue_diameter_mm
  new_flue_height_m, liner_diameter_mm, liner_length_m
  flue_bends_count, stack_above_ridge

Appareil
  appliance_outlet_position, connection_diameter_mm
  tee_required, sealed_combustion, is_canalisable

Pièce
  room_area_m2, room_height_m, wall_backing_material
  floor_plate_required, door_width_cm

Toiture
  measure_roof_slope_pct, measure_floor_to_ridge_m
  measure_flue_ridge_dist_left_m / right_m

Ventilation
  fresh_air_existing, fresh_air_to_create, fresh_air_diameter_mm
```

**Photos obligatoires :**
- Foyer existant ou emplacement prévu
- Conduit existant (si reprise)
- Toiture vue de l'extérieur
- Accès chantier (escaliers, porte si appareil lourd)
- Tableau électrique (si poêle à granulés)

Stockage V1 : `core.technical_surveys.croquis_storage_path` pour le croquis.  
Photos : `core.installations.payload` (JSONB) en attendant colonnes dédiées P2.

**Statut projet après VT :** `surveyed`

---

### Étape 4 — Devis final

**Objet créé :** `billing.quotes` avec `quote_kind = 'final'`, `previous_quote_id` = id de l'estimatif

**Règles issues de LIGNIA_V1_MASTER :**
- Document contractuel signable.
- Prix exacts. Références catalogue obligatoires.
- PDF : header standard "DEVIS". Zone signature.
- Acompte présent. Déclenche facture d'acompte.
- UI Editor : dense, toutes sections, marge interne visible.

**Colonnes clés :**
- `previous_quote_id` → lien avec l'estimatif
- `version_number` → incrémenté
- `thread_id` → regroupe estimatif + final
- `tva_context` → confirmé depuis données VT
- `reste_a_charge_estime` → net après aides

**Lien VT → Devis final :** `billing.quotes.technical_survey_id` manquant. À ajouter en P2-03.

---

### Étape 5 — Signature et acompte

**S'applique uniquement à `quote_kind = 'final'`.** L'estimatif ne déclenche pas ces effets.

**Données créées :**
- `quote_status = 'signed'`, `signed_at` horodaté
- Acompte calculé depuis `deposit_pct`
- Transition client `prospect` → `active`

**Déclenchement automatique [D-28] :**
- `core.installations` créée avec `status = 'draft'`
- Données pré-remplies depuis la ligne devis appareil :

```
brand                ← appliance.normalized_brand
model                ← appliance.normalized_model / commercial_name
heating_appliance_id ← appliance_id ligne devis [après P0-04]
catalog_item_id      ← product_id ligne devis
fuel_type            ← appliance.fuel_type
device_type          ← appliance.appliance_type
project_id, customer_id, property_id ← depuis le devis
installed_by_self    ← true
origin               ← 'new_installation'
status               ← 'draft'
```

L'installation `draft` permet la planification de pose sans bloquer le workflow si les données de clôture ne sont pas encore connues.

---

### Étape 6 — Commande fournisseur [P1-06]

**Objet créé :** `billing.purchase_orders` + `billing.purchase_order_lines`  
**Périmètre V1 (D-28 dans DECISION_LOG à créer) :** vue liste lecture seule, articles groupés par `supplier_name_snapshot`, avec quantités et références. Pas d'envoi électronique. Pas de réconciliation comptable (V2).

---

### Étape 7 — Planification

**Objet créé :** `operations.interventions` avec `intervention_type = 'installation'`  
**Possible dès que l'installation est en `draft`** (déclenché à la signature).

---

### Étape 8 — Pose et réception

**Photos obligatoires :**
- Appareil installé en place
- Conduit terminé (sortie toiture)
- Plaque signalétique (numéro de série)
- Essai de mise en chauffe

Stockage : `core.installations.payload` JSONB pour V1.

---

### Étape 9 — Facture

**Objet créé :** `billing.invoices` + `billing.invoice_lines`  
**Statut projet :** `completed`

---

### Étape 10 — Clôture chantier → Installation active [D-28]

**Déclencheur :** bouton "Clôturer le chantier" sur la fiche Projet [à construire P2-01]

**Transition :** `core.installations.status` : `draft` → `active`

**Données saisies manuellement à la clôture (obligatoires) :**
```
serial_number
commissioning_date
```

**Données calculées automatiquement :**
```
manufacturer_warranty_start  ← commissioning_date
manufacturer_warranty_end    ← commissioning_date + warranty_years
next_sweep_date              ← commissioning_date + 12 mois
```

**Déclenchements automatiques à l'activation :**
- Installation active dans le parc installé
- Prochaine échéance ramonage calculée
- Rappel client programmé

---

### Étape 11 — Entretien annuel

**Déclencheur :** `next_sweep_date` atteinte  
**Objet créé :** `operations.service_requests` lié à `core.installations`  
**Devis associé :** `billing.quotes` avec `quote_kind = 'service'`, `installation_id` rempli  
**Note :** `billing.quotes.installation_id` existe déjà en base.

---

## Modèle installation — règles V1 [D-26]

- 1 installation = 1 appareil principal
- Un client peut avoir N installations (N posés chez lui sur plusieurs années)
- Une propriété peut avoir N installations (poêle + cuisinière = 2 installations séparées)
- `heating_appliance_id` = colonne scalaire UUID, FK vers `catalog.heating_appliances`
- Pas de table pivot `installation_devices` en V1

---

## Briques existantes vs manquantes

### Ce qui existe déjà

| Brique | Table | Statut |
|---|---|---|
| Devis estimatif / final / SAV | `billing.quotes.quote_kind` | ✅ 82+12+1 en base |
| Versioning devis | `previous_quote_id`, `thread_id`, `version_number` | ✅ |
| Lien devis SAV → installation | `billing.quotes.installation_id` | ✅ |
| Aides estimées | `aides_estimees_total`, `reste_a_charge_estime` | ✅ |
| Visite technique | `core.technical_surveys` 130 colonnes | ✅ table vide |
| Croquis VT | `croquis_storage_path` | ✅ |
| Service request + Interventions | `operations.*` | ✅ |
| Parc installé | `core.installations` | ✅ 3 entrées |
| Remplacement prévu | `predicted_replacement_date` | ✅ |
| Flux B (reprise) | `origin`, `installed_by_self`, `takeover_date` | ✅ |
| Installation draft à la signature | `status` enum | ✅ colonne existe |

### Ce qui manque et bloque le workflow

| Manque | Table cible | Priorité |
|---|---|---|
| `appliance_id` non écrit par la RPC | `billing.quote_lines` | **P0-01** |
| `heating_appliance_id` dans installations | `core.installations` | **P0-04** — décision D-26 actée |
| Garde prix 0€ sur ligne appareil | Frontend QuoteEditor | **P0-03** |
| `heating_appliance_id` dans catalog_items | `catalog.catalog_items` | P1 [D-30] |
| `technical_survey_id` sur le devis final | `billing.quotes` | P2-03 |
| `predecessor_installation_id` | `core.installations` | P3 |
| Photos colonnes dédiées | `core.installations` | P2 |
| Clôture chantier UI | Lovable | P2-01 |
| Formulaire VT | Lovable | P2-02 |

---

## Règle de lecture pour les prompts

```
Étape 1-2  → Qualification + Estimatif   → QuoteEditor (quote_kind = estimate)
Étape 3    → Visite technique            → TechnicalSurveyForm (à créer)
Étape 4    → Devis final                 → QuoteEditor (quote_kind = final)
Étape 5    → Signature                   → QuoteEditor + création installation draft
Étape 6    → Commande fournisseur        → PurchaseOrderView (à créer)
Étape 7-8  → Planification + Pose        → InterventionForm
Étape 9    → Facture                     → InvoiceEditor
Étape 10   → Clôture chantier            → ProjectPage + InstallationForm
Étape 11   → Entretien                   → ServiceRequestForm
```

Un prompt qui touche deux étapes à la fois a de fortes chances d'échouer.

---

## Ce que ce document ne tranche pas

**D-27 — Contenu minimal de `appliance_snapshot`** : décision ouverte. Ne pas implémenter sans décision actée.

**D-29 — `catalog_domain` dans `quote_lines`** : décision ouverte. Ne pas créer la colonne sans décision actée.

**Note de calcul simplifiée V3** : s'insère entre étape 3 et étape 4. Dépend de `flue_diameter_mm` rempli + VT opérationnelle. P3.

**Espace client** : signature électronique, partage photos réception. P3.
