# ESTIMATE_TO_INSTALLATION_WORKFLOW

> Auteur : Claude Analytics  
> Date : mai 2026  
> Statut : document de référence workflow — lecture obligatoire avant tout prompt Lovable ou Claude Exec sur les modules Devis, VT, Installation, SAV

---

## Pourquoi ce document existe

Les tables existent. Les briques sont posées. Ce qui manquait était un document qui les relie dans l'ordre métier réel.

`billing.quotes` a déjà `quote_kind` (estimate / final / service), `version_number`, `previous_quote_id`, `installation_id`, `tva_context`.  
`core.technical_surveys` a déjà 130 colonnes fumisterie, ventilation, mesures toiture, raccordement.  
`operations.service_requests` et `operations.interventions` sont déjà liés à `core.installations`.  
`core.installations` a déjà `origin`, `installed_by_self`, `takeover_date`, `predicted_replacement_date`.

Le problème n'est pas l'architecture. C'est que personne n'avait écrit dans quel ordre utiliser ces briques.

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
Devis final (quote_kind = final, previous_quote_id = estimatif)
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
Installation créée (core.installations)
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
Création installation manuelle (core.installations, origin = 'takeover')
↓
  ├── Si entretien → Devis SAV (quote_kind = service)
  │                → Intervention planifiée
  │                → Facture
  │
  ├── Si panne → Service request (operations.service_requests)
  │             → Intervention (operations.interventions)
  │             → Devis réparation si pièces
  │
  └── Si remplacement → Devis estimatif nouvel appareil (Flux A)
                       → predicted_replacement_date mis à jour
```

---

## Détail du Flux A — étape par étape

### Étape 1 — Qualification

**Objet créé :** `core.projects` + `core.customers`  
**Données collectées :** type d'appareil souhaité, combustible, surface à chauffer, budget estimé, délai souhaité  
**Table impliquée :** `core.technical_surveys.desired_device_type`, `heating_volume_m3`, `estimated_budget_eur`  
**Statut projet :** `prospect`

---

### Étape 2 — Devis estimatif

**Objet créé :** `billing.quotes` avec `quote_kind = 'estimate'`  
**Contenu :** appareil pressenti (`appliance_id`), fumisterie estimée, pose estimée  
**Caractéristique clé :** prix indicatifs, pas de relevés réels. L'artisan travaille depuis sa connaissance du type de chantier, pas depuis les mesures.  
**Colonnes clés utilisées :**
- `quote_kind = 'estimate'`
- `appliance_id` sur les lignes appareil → doit être persisté (P0-01)
- `tva_context` → déjà rempli à 100% en base
- `aides_estimees_total` → déjà présent sur `billing.quotes`

**Ce qui ne doit PAS bloquer à cette étape :**  
L'estimatif peut être envoyé au client avec une mention "sous réserve de visite technique". Il n'a pas besoin d'être parfait. Il doit être rapide.

---

### Étape 3 — Visite technique

**Objet créé :** `core.technical_surveys` lié au projet  
**Durée réelle terrain :** 45min à 1h30  
**Ce que l'artisan mesure et saisit :**

```
Fumisterie
  flue_scenario         → type d'installation (conduit existant, tubage, extérieur...)
  flue_diameter_mm      → diamètre conduit existant
  new_flue_diameter_mm  → diamètre préconisé
  new_flue_height_m     → hauteur conduit nécessaire
  liner_diameter_mm     → si tubage
  liner_length_m        → longueur tubage
  flue_bends_count      → coudes
  stack_above_ridge     → conduit dépasse le faîtage

Appareil
  appliance_outlet_position    → sortie fumée appareil
  connection_diameter_mm       → diamètre raccordement
  tee_required                 → té de ramonage nécessaire
  sealed_combustion            → étanche ou non
  is_canalisable               → si distribution d'air

Pièce
  room_area_m2, room_height_m  → pour calcul volume
  wall_backing_material        → protection murale
  floor_plate_required         → dalle
  door_width_cm                → accès livraison appareil

Toiture (mesures)
  measure_roof_slope_pct
  measure_floor_to_ridge_m
  measure_flue_ridge_dist_left_m / right_m
  stack_above_ridge

Ventilation
  fresh_air_existing           → amenée d'air existante
  fresh_air_to_create          → à créer
  fresh_air_diameter_mm
```

**Photos obligatoires à cette étape :**
- Foyer existant ou emplacement prévu
- Conduit existant (si reprise)
- Toiture vue de l'extérieur
- Accès au chantier (escaliers, porte d'entrée si appareil lourd)
- Tableau électrique (si poêle à granulés)

Les photos ont deux fonctions :
1. Permettre le devis final depuis le bureau sans retourner sur place
2. Protection juridique en cas de litige post-installation

**Statut projet après VT :** `surveyed`

---

### Étape 4 — Devis final

**Objet créé :** `billing.quotes` avec `quote_kind = 'final'`, `previous_quote_id` = id de l'estimatif  
**Différence avec l'estimatif :**
- Quantités réelles (longueur tubage, nombre de coudes, hauteur conduit)
- Appareil confirmé (parfois différent de l'estimatif après VT)
- Aides calculées avec les vraies données (RE2020, surface, année construction)

**Colonnes clés utilisées :**
- `previous_quote_id` → lien avec l'estimatif
- `version_number` → incrémenté
- `thread_id` → regroupe estimatif + final dans la même conversation
- `tva_context` → confirmé depuis les données VT (building_status, construction_year)
- `reste_a_charge_estime` → net après aides

**Lien VT → Devis final :**  
Ajout nécessaire : `billing.quotes.technical_survey_id` (FK vers `core.technical_surveys`).  
Ce champ n'existe pas encore. C'est le P2-03 du plan d'exécution.

---

### Étape 5 — Signature et acompte

**Statut devis :** `quote_status = 'signed'`  
**Données créées :**
- `signed_at` sur `billing.quotes`
- Acompte calculé depuis `deposit_pct`
- Transition client de `prospect` → `active`

---

### Étape 6 — Commande fournisseur

**Objet créé :** `billing.purchase_orders` + `billing.purchase_order_lines`  
**Source :** lignes du devis signé groupées par `supplier_name_snapshot`  
**Vue à construire :** liste articles par fournisseur avec quantités et références  
**C'est le P1-06 du plan d'exécution — à construire avant les pilotes.**

---

### Étape 7 — Planification

**Objet créé :** `operations.interventions` avec `intervention_type = 'installation'`  
**Lié à :** `core.projects`, `core.customers`, `core.properties`  
**Données :** date planifiée, technicien assigné, durée estimée

---

### Étape 8 — Pose et réception

**Photos obligatoires :**
- Appareil installé en place
- Conduit terminé (sortie toiture)
- Plaque signalétique (numéro de série)
- Essai de mise en chauffe (si possible une flamme visible)

Les photos après travaux sont le pendant des photos avant. Sans elles, en cas de litige sur la qualité d'installation, l'artisan n'a pas de preuve.

---

### Étape 9 — Facture

**Objet créé :** `billing.invoices` + `billing.invoice_lines`  
**Source :** lignes du devis final signé  
**Statut projet :** `completed`

---

### Étape 10 — Création de l'installation (Parc installé)

**Objet créé :** `core.installations`  
**Déclencheur :** bouton "Clôturer le chantier" sur la fiche Projet (à construire en P2-01)  
**Données pré-remplies depuis le devis final :**

```
brand                  ← appliance.normalized_brand
model                  ← appliance.normalized_model / commercial_name
heating_appliance_id   ← appliance_id de la ligne devis (après P0-04)
catalog_item_id        ← product_id de la ligne devis
fuel_type              ← appliance.fuel_type
device_type            ← appliance.appliance_type
warranty_years         ← appliance.warranty_years (si rempli)
project_id             ← depuis le devis
customer_id            ← depuis le devis
property_id            ← depuis le devis
installed_by_self      ← true (installation en propre)
origin                 ← 'new_installation'
```

**Données saisies manuellement à la clôture :**
```
serial_number          → obligatoire
commissioning_date     → obligatoire
manufacturer_warranty_start → calculé depuis commissioning_date
manufacturer_warranty_end   → calculé depuis warranty_years
next_sweep_date        → J+12 mois automatiquement
```

---

### Étape 11 — Entretien annuel

**Déclencheur :** `next_sweep_date` atteinte  
**Objet créé :** `operations.service_requests` lié à `core.installations`  
**Devis associé :** `billing.quotes` avec `quote_kind = 'service'`, `installation_id` rempli  
**Note :** `billing.quotes.installation_id` existe déjà en base.

---

## Détail du Flux B — Client avec appareil existant

### Entrée dans le système

L'artisan apprend qu'un client a un appareil installé (pas par lui). Il crée l'installation manuellement :

```
core.installations
  origin             = 'takeover'
  installed_by_self  = false
  takeover_date      = date de la première intervention
  brand              = saisie libre
  model              = saisie libre
  serial_number      = lu sur la plaque (si accessible)
  commissioning_date = approximatif (fourni par le client)
```

Si l'appareil est dans `heating_appliances`, l'artisan peut le rechercher pour relier `heating_appliance_id` → données techniques disponibles immédiatement (diamètre conduit, garantie constructeur).

### Les trois sous-flux du Flux B

**Flux B1 — Entretien simple**
```
Installation existante
↓
Planification ramonage/entretien
↓
Intervention (operations.interventions)
↓
Devis entretien si pièces (quote_kind = service)
↓
Facture
↓
next_sweep_date mis à jour
```

**Flux B2 — Panne / SAV**
```
Client appelle
↓
Service request créé (operations.service_requests)
  source = 'client_call'
  installation_id = installation existante
↓
Diagnostic (intervention)
↓
Devis réparation si pièces nécessaires
↓
Facture
```

**Flux B3 — Remplacement**
```
Installation existante (predicted_replacement_date atteinte)
↓
Nouveau devis estimatif (Flux A dès l'étape 2)
  L'ancien appareil reste dans le Parc comme 'replaced'
  actual_replacement_date rempli sur l'ancienne installation
↓
Nouvelle installation créée à la clôture
  predecessor_installation_id → ancienne installation (colonne à ajouter en P3)
```

---

## Les photos dans LIGNIA

### Pourquoi c'est sous-priorisé à tort

Dans le métier bois-énergie, une mauvaise installation peut provoquer un incendie. La responsabilité de l'installateur est engagée pendant 10 ans (garantie décennale). Sans photos datées avant et après travaux, l'artisan n'a aucune preuve en cas de litige.

Les photos ont plus de valeur commerciale et juridique que `finish_options` ou `autonomy_hours_max`.

### Les moments obligatoires

| Moment | Photos | Utilité |
|---|---|---|
| VT — avant | Foyer, conduit, toiture, accès | Preuve état initial, input devis final |
| Pose — pendant | Étapes clés installation | Traçabilité technique |
| Réception — après | Appareil posé, conduit terminé, plaque | Preuve conformité, garantie |
| SAV | État constaté avant intervention | Protection litige |

### Où stocker

`core.technical_surveys.croquis_storage_path` existe déjà pour le croquis de la VT. Le modèle pour les photos est identique : `storage_path` dans `core.installations.payload` en attendant une colonne dédiée.

**Aucune migration nécessaire pour V1.** Le JSONB `payload` sur `core.installations` peut stocker des chemins photos immédiatement. La colonne dédiée viendra en P2.

---

## Briques existantes vs manquantes

### Ce qui existe déjà et peut être branché

| Brique | Table | Statut |
|---|---|---|
| Devis estimatif / final / SAV | `billing.quotes.quote_kind` | ✅ existe, 82+12+1 devis en base |
| Versioning devis | `previous_quote_id`, `thread_id`, `version_number` | ✅ existe |
| Lien devis → installation (SAV) | `billing.quotes.installation_id` | ✅ existe |
| Aides estimées | `aides_estimees_total`, `reste_a_charge_estime` | ✅ existe |
| Visite technique | `core.technical_surveys` 130 colonnes | ✅ existe, table vide |
| Croquis VT | `croquis_storage_path` | ✅ existe |
| Service request | `operations.service_requests` | ✅ existe |
| Interventions | `operations.interventions` | ✅ existe |
| Parc installé | `core.installations` | ✅ existe, 3 entrées |
| Remplacement prévu | `predicted_replacement_date` | ✅ existe |
| Flux B (reprise) | `origin`, `installed_by_self`, `takeover_date` | ✅ existe |

### Ce qui manque et bloque le workflow

| Manque | Table cible | Priorité |
|---|---|---|
| `appliance_id` non écrit par la RPC | `billing.quote_lines` | P0-01 |
| `heating_appliance_id` dans installations | `core.installations` | P0-04 |
| `heating_appliance_id` dans catalog_items | `catalog.catalog_items` | P0-05 |
| `technical_survey_id` sur le devis final | `billing.quotes` | P2-03 |
| `predecessor_installation_id` | `core.installations` | P3 |
| Photos structurées (colonnes dédiées) | `core.installations` | P2 |
| Clôture chantier → installation automatique | UI Lovable | P2-01 |
| Formulaire VT | UI Lovable | P2-02 |

---

## Règle de lecture pour les prompts

Avant de rédiger un prompt Lovable ou Claude Exec, identifier à quelle étape du workflow appartient la feature :

```
Étape 1-2  → Qualification + Estimatif     → touche QuoteEditor
Étape 3    → Visite technique              → touche TechnicalSurveyForm (à créer)
Étape 4    → Devis final                  → touche QuoteEditor (quote_kind = final)
Étape 5-6  → Signature + Commande         → touche PurchaseOrderView (à créer)
Étape 7-8  → Planification + Pose         → touche InterventionForm
Étape 9    → Facture                      → touche InvoiceEditor
Étape 10   → Clôture chantier             → touche ProjectPage + InstallationForm
Étape 11   → Entretien                    → touche ServiceRequestForm
```

Un prompt qui touche deux étapes à la fois a de fortes chances d'échouer ou de produire des effets de bord.

---

## Ce que ce document ne tranche pas

**1 installation = 1 ou N appareils ?**  
Décision fondateur requise. Voir HEATING_APPLIANCE_EXECUTION_PLAN.md section "Décision fondateur requise avant P0-04".

**Note de calcul simplifiée V3**  
S'insère entre l'étape 3 (VT) et l'étape 4 (Devis final). Dépend de `flue_diameter_mm` rempli dans `heating_appliances` et de `technical_surveys` opérationnel. Pas avant P3.

**Espace client**  
Pas modélisé dans ce document. Potentiellement utile pour la signature électronique du devis final et le partage des photos de réception. P3 ou plus.
