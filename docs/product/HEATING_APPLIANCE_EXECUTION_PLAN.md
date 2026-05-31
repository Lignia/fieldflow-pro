# HEATING_APPLIANCE_EXECUTION_PLAN

> Auteur : Claude Analytics — rôle CPO + Architecte métier  
> Sources : HEATING_APPLIANCE_GAP_ANALYSIS.md · APPLIANCE_LIFECYCLE_REVIEW.md · vérifications Supabase live  
> Date : mai 2026  
> Statut : plan d'exécution — aucun code, aucune migration dans ce document

---

## Faits établis avant ce plan

Ces chiffres sont issus de requêtes Supabase au moment de la rédaction.

| Fait | Valeur |
|---|---|
| Appareils en base (`heating_appliances`) | 1 516 — 100% ADEME |
| Colonnes remplies à > 10% | 4 : `nominal_power_kw`, `efficiency_pct`, `flamme_verte_status`, `ademe_fonds_air_bois_status` |
| `flue_diameter_mm` rempli | 0 / 1 516 |
| `flamme_verte_stars` rempli | 0 / 1 516 |
| `commercial_name` rempli | 194 / 1 516 (Invicta uniquement) |
| Toutes les autres colonnes enrichies | 0% |
| `quote_lines.appliance_id` non null en base | 0 — jamais écrit par la RPC |
| Installations en base | 3 — aucune liée à `catalog_item_id` |
| `catalog_items` → lien `heating_appliances` | ABSENT — aucune FK, aucune colonne |
| `core.installations` → lien `heating_appliances` | ABSENT |
| `core.technical_surveys` en base | 0 — table vide |
| `billing.quotes` avec `tva_context` rempli | 95 / 95 — 100% |
| `quote_kind` utilisés | estimate (82), final (12), service (1) |

---

## Le modèle canonique LIGNIA — colonnes par cycle

### Ce qui est le modèle cible, pas ce qui existe aujourd'hui

Un appareil dans LIGNIA doit porter deux niveaux de données :

**Niveau 1 — Identité réglementaire** (source ADEME, stable, officielle)  
`normalized_brand` · `normalized_model` · `commercial_name` · `fuel_type` · `appliance_type` · `nominal_power_kw` · `efficiency_pct` · `ademe_fonds_air_bois_status` · `flamme_verte_stars` · `flamme_verte_status`

**Niveau 2 — Données techniques installation** (source fabricant, nécessaire au devis et à la VT)  
`flue_diameter_mm` · `flue_exit_position` · `sealed_combustion` · `is_canalisable` · `air_intake_diameter_mm` · `heating_surface_m2_min/max` · `height_mm` · `width_mm` · `depth_mm` · `weight_kg`

**Niveau 3 — Données commerciales** (source catalogue fabricant/distributeur)  
`manufacturer_ref` · `warranty_years` · `finish_options` · `pellet_tank_volume_kg` · `autonomy_hours_min/max`

**Niveau 4 — Données V3 note de calcul** (source fabricant + normes)  
`power_min_kw` · `power_max_kw` · `heating_capacity_m3` · `rear_clearance_mm` · `side_clearance_mm` · `is_rt2012_re2020_compatible` · `eligible_aides_text` · `dtu_reference`

### Utilité par module

| Colonne | Devis | VT | Installation | Entretien | SAV | Note calcul V3 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `nominal_power_kw` | ✅ | ✅ | ✅ | — | — | ✅ |
| `flue_diameter_mm` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `flamme_verte_stars` | ✅ | — | ✅ | — | — | — |
| `ademe_fonds_air_bois_status` | ✅ | — | ✅ | — | — | — |
| `sealed_combustion` | ✅ | ✅ | ✅ | — | — | ✅ |
| `is_canalisable` | ✅ | ✅ | ✅ | — | — | ✅ |
| `commercial_name` | ✅ | — | ✅ | ✅ | ✅ | — |
| `warranty_years` | ✅ | — | ✅ | ✅ | ✅ | — |
| `manufacturer_ref` | — | — | ✅ | ✅ | ✅ | — |
| `weight_kg` | — | ✅ | — | — | — | — |
| `heating_surface_m2_max` | ✅ | ✅ | — | — | — | ✅ |
| `finish_options` | ✅ | — | — | — | — | — |
| `pellet_tank_volume_kg` | — | — | — | ✅ | — | — |
| `autonomy_hours_max` | ✅ | — | — | — | — | — |
| `rear/side_clearance_mm` | — | ✅ | — | — | — | ✅ |
| `eligible_aides_text` | ✅ | — | ✅ | — | — | — |

---

## Colonnes à ignorer — sources Nova/ADEME/Ravelli

### ADEME — ignorer
- Toutes les colonnes d'audit interne ADEME (`source_catalog`, `source_confidence`, `data_quality_status`, `prescription_level`) — données système, pas métier
- `registry_entry_date` / `registry_valid_until` — pertinent uniquement pour la conformité réglementaire automatisée, pas pour V1
- `standard_obsolete` — à gérer par la RPC, pas exposé en UI

### Nova Group (export OpenFire multi-marques) — ignorer
- Toutes les colonnes OpenFire/Odoo : `id`, `create_uid`, `write_uid`, `create_date`, `write_date`, `active`, `sequence`
- Colonnes marketing vides : `description_sale`, `description_pickingout`, `description_picking`
- Colonnes comptables Odoo : `categ_id`, `uom_id`, `uom_po_id`, `taxes_id`, `supplier_taxes_id`
- Colonnes de gestion de stock Odoo : `type` (product/consu/service), `tracking`

### Ravelli (export Odoo) — ignorer
- 80% du fichier est du bruit Odoo : voir liste Nova ci-dessus, plus :
- `product_variant_count`, `product_tmpl_id`, `combination_indices`
- `lst_price` (prix liste Odoo interne) → utiliser uniquement si pas d'autre source prix
- `attribute_line_ids` — format Odoo propriétaire, non portable

### Invicta — tout garder
Invicta est le format cible. 28 colonnes structurées, cohérentes, sans bruit système. C'est le standard d'import à répliquer pour les autres fabricants.

---

## PARTIE 1 — P0 : Ce qui bloque la chaîne aujourd'hui

### P0-01 — `replace_quote_lines` n'écrit jamais `appliance_id`

| | |
|---|---|
| **Priorité** | P0 |
| **Responsable** | Claude Exec |
| **Prérequis** | Aucun |
| **Effort** | 1h |
| **Risque si ignoré** | Chaque devis terrain sauvegardé crée une dette irréversible. Aucun devis signé ne pourra alimenter le Parc installé automatiquement. |
| **Valeur métier** | Débloque toute la chaîne Devis → Installation → SAV |

**Ce qui doit être fait :**  
Patcher la RPC `billing.replace_quote_lines` pour inclure `appliance_id` dans l'INSERT. La colonne existe déjà dans `billing.quote_lines` avec une FK vers `catalog.heating_appliances`. C'est un ajout de 2 lignes dans la RPC.

---

### P0-02 — Payload frontend ne passe pas `appliance_id`

| | |
|---|---|
| **Priorité** | P0 |
| **Responsable** | Lovable |
| **Prérequis** | P0-01 (inutile de passer le champ si la RPC ne l'écrit pas) |
| **Effort** | 30min |
| **Risque si ignoré** | Même si P0-01 est fait, la colonne restera null côté frontend |
| **Valeur métier** | Complète le fix P0-01 côté frontend |

**Ce qui doit être fait :**  
Dans `handleSave`, dans le map `p_lines`, ajouter `appliance_id: li?.appliance_id ?? null`.

---

### P0-03 — Ligne appareil envoyable à 0 €

| | |
|---|---|
| **Priorité** | P0 |
| **Responsable** | Lovable |
| **Prérequis** | Aucun |
| **Effort** | 15min |
| **Risque si ignoré** | Premier litige commercial potentiel dès la semaine 1 des pilotes |
| **Valeur métier** | Élimine le seul scénario catastrophe avant le premier pilote |

**Ce qui doit être fait :**  
Dans `handleSave(true)`, avant `setSavingAll`, bloquer si une ligne `appliance_id` a `unit_price_ht === 0`.

---

### P0-04 — `core.installations` sans lien vers `heating_appliances`

| | |
|---|---|
| **Priorité** | P0 |
| **Responsable** | Claude Exec |
| **Prérequis** | Décision fondateur : 1 installation = 1 appareil (à confirmer avant migration) |
| **Effort** | 30min après décision |
| **Risque si ignoré** | Le Parc installé ne pourra jamais accéder aux données techniques de l'appareil. SAV aveugle. |
| **Valeur métier** | Fondement du Parc installé intelligent |

**Ce qui doit être fait :**  
Ajouter `heating_appliance_id uuid REFERENCES catalog.heating_appliances(id) ON DELETE SET NULL` dans `core.installations`.  
**Note :** Ne pas faire avant que le fondateur confirme que 1 installation = 1 appareil (et non N appareils).

---

### P0-05 — `catalog_items` sans lien vers `heating_appliances`

| | |
|---|---|
| **Priorité** | P0 |
| **Responsable** | Claude Exec |
| **Prérequis** | Aucun |
| **Effort** | 20min |
| **Risque si ignoré** | Impossible de croiser "cet article catalogue" avec "cet appareil ADEME". La prescription et le devis final resteront découplés des données techniques. |
| **Valeur métier** | Crée le pont commercial ↔ technique sans fusionner les tables |

**Ce qui doit être fait :**  
Ajouter `heating_appliance_id uuid REFERENCES catalog.heating_appliances(id) ON DELETE SET NULL` dans `catalog.catalog_items`.

---

## PARTIE 2 — P1 : Avant les pilotes

### P1-01 — Import Invicta (200-500 modèles)

| | |
|---|---|
| **Priorité** | P1 |
| **Responsable** | Claude Exec |
| **Prérequis** | Fichier Invicta disponible |
| **Effort** | 1-2 jours (script + run + vérification) |
| **Risque si ignoré** | Les appareils affichés dans l'onglet Appareils du devis n'ont que 4 colonnes renseignées. L'artisan voit une marque et une puissance, rien d'autre. |
| **Valeur métier** | Donne à l'onglet Appareils une vraie densité d'information : finitions, puissance min/max, garantie, surface chauffée |

**Ce qui doit être fait :**  
Importer le fichier Invicta via `map_supplier.py` configuré pour le domaine `APPAREIL`. Invicta est le format le plus riche disponible (28 colonnes structurées).

---

### P1-02 — Import Nova Group (590 modèles — enrichissement Flamme Verte)

| | |
|---|---|
| **Priorité** | P1 |
| **Responsable** | Claude Exec |
| **Prérequis** | P1-01 terminé (établir d'abord le workflow d'import APPAREIL) |
| **Effort** | 1 jour |
| **Risque si ignoré** | `flamme_verte_stars` reste à 0 pour 1 322 des 1 516 appareils. L'affichage ★★★★ dans le devis sera vide sur la majorité des appareils. |
| **Valeur métier** | Remplit `flamme_verte_stars` et `flue_diameter_mm` pour les marques Nova (MCZ, Edilkamin, Austroflamm...) |

---

### P1-03 — Import Ravelli (refs fabricant + prix indicatifs)

| | |
|---|---|
| **Priorité** | P1 |
| **Responsable** | Claude Exec |
| **Prérequis** | P1-01 terminé · Filtrage des colonnes Odoo à ignorer (liste en Partie Colonnes à ignorer) |
| **Effort** | 1 jour (filtrage colonnes + script + run) |
| **Risque si ignoré** | `manufacturer_ref` reste null. Le SAV ne peut pas faire de recherche par référence fabricant pour les pièces détachées Ravelli. |
| **Valeur métier** | `manufacturer_ref` + `flue_diameter_mm` + `weight_kg` pour la gamme Ravelli |

---

### P1-04 — UX : Bloc client visible en tête du devis

| | |
|---|---|
| **Priorité** | P1 |
| **Responsable** | Lovable |
| **Prérequis** | Aucun |
| **Effort** | 30min |
| **Risque si ignoré** | Les pilotes construisent des devis sans voir à qui ils vendent. Risque d'erreur d'attribution. |
| **Valeur métier** | Perception professionnelle immédiate du produit lors de l'onboarding |

---

### P1-05 — UX : Badge inline prix manquant sur ligne appareil

| | |
|---|---|
| **Priorité** | P1 |
| **Responsable** | Lovable |
| **Prérequis** | P0-02 |
| **Effort** | 20min |
| **Risque si ignoré** | Toast éphémère ignoré → artisan oublie de saisir le prix → devis sauvegardé à 0 € (sans être envoyé mais faussant les totaux) |
| **Valeur métier** | Signal permanent, non éphémère, sur la ligne concernée |

---

### P1-06 — Vue commande fournisseur depuis devis signé

| | |
|---|---|
| **Priorité** | P1 |
| **Responsable** | Lovable |
| **Prérequis** | P0-01/P0-02 |
| **Effort** | 2-3h |
| **Risque si ignoré** | L'artisan doit recopier manuellement les références depuis le devis vers son bon de commande. Friction qui réduit la valeur perçue du produit. |
| **Valeur métier** | C'est la feature qui convainc un artisan d'adopter le logiciel avant même le Parc installé |

**Ce qui doit être fait :**  
Page ou modal "Articles à commander" depuis un devis signé, groupée par fournisseur (`supplier_name_snapshot`), avec quantités et références.

---

## PARTIE 3 — P2 : Après les 5 premiers pilotes

### P2-01 — Clôture chantier → création automatique Installation

| | |
|---|---|
| **Priorité** | P2 |
| **Responsable** | Lovable + Claude Exec |
| **Prérequis** | P0-01 · P0-04 · Au moins 1 vrai chantier observé par le fondateur |
| **Effort** | 5-8h |
| **Risque si ignoré** | Le Parc installé reste manuel à vie. La valeur du Cycle 2 (entretien) et Cycle 3 (SAV) ne peut pas se construire. |
| **Valeur métier** | Ferme la boucle Vente → Pose → Parc. C'est le premier actif récurrent de LIGNIA. |

**Ce qui doit être fait :**  
Bouton "Clôturer le chantier" sur la fiche Projet. Pré-remplissage depuis la ligne devis appareil (`brand`, `model`, `heating_appliance_id`, `catalog_item_id`). Saisie obligatoire de `serial_number` et `commissioning_date`.

---

### P2-02 — Visite technique V1 (formulaire de saisie)

| | |
|---|---|
| **Priorité** | P2 |
| **Responsable** | Lovable |
| **Prérequis** | 5 vrais devis terrain réalisés · Retours fondateur sur les frictions |
| **Effort** | 5-10h (formulaire dense) |
| **Risque si ignoré** | Le flux Estimatif → VT → Devis Final reste manuel. L'artisan fait le devis final sans trace structurée de la VT. |
| **Valeur métier** | Alimente automatiquement le devis final avec les mesures réelles (diamètre, scénario fumisterie, longueur tubage). Réduit les erreurs de chiffrage. |

**Note :** `core.technical_surveys` a 130 colonnes déjà modélisées. Le travail est du branchement UI, pas de la conception SQL.

---

### P2-03 — Lien `quotes.technical_survey_id`

| | |
|---|---|
| **Priorité** | P2 |
| **Responsable** | Claude Exec |
| **Prérequis** | P2-02 |
| **Effort** | 20min |
| **Risque si ignoré** | Le devis final ne sait pas quelle VT l'a généré. Le lien Visite → Devis est perdu. |
| **Valeur métier** | Traçabilité complète Visite → Devis → Installation |

---

### P2-04 — SAV V1 depuis le Parc installé

| | |
|---|---|
| **Priorité** | P2 |
| **Responsable** | Lovable |
| **Prérequis** | P2-01 · Au moins 3 installations créées |
| **Effort** | 3-5h |
| **Risque si ignoré** | Le SAV reste géré hors LIGNIA. Le Cycle 3 ne démarre pas. |
| **Valeur métier** | Première boucle récurrente monétisable (devis SAV, facturation intervention) |

**Ce qui doit être fait :**  
Formulaire création `operations.service_requests` depuis une fiche installation. Vue "SAV en cours" par technicien. `operations.interventions` est déjà lié à `service_requests`.

---

### P2-05 — `appliance_snapshot` dans `quote_lines`

| | |
|---|---|
| **Priorité** | P2 |
| **Responsable** | Claude Exec + Lovable |
| **Prérequis** | P0-01 fonctionnel · Décision fondateur sur le contenu du snapshot |
| **Effort** | 1h |
| **Risque si ignoré** | Si `heating_appliances` évolue (mises à jour ADEME), les devis historiques perdent la trace des données techniques au moment de la vente |
| **Valeur métier** | Immutabilité commerciale des données techniques (comme `metadata.pricing` l'est déjà pour les prix) |

**Contenu minimal du snapshot :**
```json
{
  "id": "uuid",
  "normalized_brand": "MCZ",
  "normalized_model": "Ego Comfort",
  "fuel_type": "granules",
  "nominal_power_kw": 8.5,
  "flamme_verte_stars": 7,
  "flue_diameter_mm": 80,
  "ademe_fonds_air_bois_status": "confirmed"
}
```

---

## PARTIE 4 — P3 : Après 20 clients

### P3-01 — Note de calcul simplifiée V3

| | |
|---|---|
| **Priorité** | P3 |
| **Responsable** | Lovable + Claude Exec |
| **Prérequis** | `flue_diameter_mm` rempli pour les appareils (P1-01/P1-02) · Visite technique opérationnelle (P2-02) · 20 devis terrain pour calibrer la logique |
| **Effort** | 10-20h |
| **Risque si ignoré** | Pas de risque immédiat. C'est une feature premium. |
| **Valeur métier** | Différenciation majeure vs concurrents. Pré-sélection automatique des conduits depuis le diamètre appareil + scenario VT. |

---

### P3-02 — Parc installé multi-appareils

| | |
|---|---|
| **Priorité** | P3 |
| **Responsable** | Claude Exec + Lovable |
| **Prérequis** | P2-01 opérationnel · Retours terrain sur les cas poêle + cuisinière / chaudière + ballon |
| **Effort** | Variable selon décision architecturale (1 ligne par appareil vs table de pivot) |
| **Risque si ignoré** | Les chantiers multi-appareils sont modélisés comme 2 installations séparées — ce qui est fonctionnel mais moins élégant |
| **Valeur métier** | Cas d'usage fréquent mais pas bloquant en V1 |

---

### P3-03 — Pièces détachées par appareil

| | |
|---|---|
| **Priorité** | P3 |
| **Responsable** | Claude Exec + fondateur |
| **Prérequis** | `manufacturer_ref` rempli (P1-03) · SAV opérationnel (P2-04) |
| **Effort** | Dépend des données fournisseurs disponibles |
| **Risque si ignoré** | Le SAV restera générique sans recommandation de pièce. |
| **Valeur métier** | SAV intelligent : depuis une demande de panne, proposer la pièce compatible. |

---

### P3-04 — Import ADEME automatisé (mise à jour mensuelle)

| | |
|---|---|
| **Priorité** | P3 |
| **Responsable** | Claude Exec |
| **Prérequis** | Pipeline import stable |
| **Effort** | 2-4h (script + cron Supabase) |
| **Risque si ignoré** | La liste ADEME devient périmée. Des appareils éligibles MaPrimeRénov' manquent, d'autres obsolètes restent visibles. |
| **Valeur métier** | Conformité réglementaire automatique |

---

### P3-05 — Refactoring QuoteEditor.tsx

| | |
|---|---|
| **Priorité** | P3 |
| **Responsable** | Lovable |
| **Prérequis** | Modèle métier stabilisé par 20+ clients · Second développeur actif |
| **Effort** | 20-40h |
| **Risque si ignoré** | Maintenabilité dégradée à 2+ développeurs |
| **Valeur métier** | Aucune pour l'utilisateur final. Valeur pour la vélocité de développement. |

---

## Le plus petit ensemble de travaux — chemin critique

Pour permettre le workflow complet :  
**Catalogue appareil → Devis estimatif → VT → Devis final → Commande → Pose → Facture → Parc installé**

```
ÉTAPE 1 — Devis appareil fonctionnel (S1)
  P0-01 : replace_quote_lines écrit appliance_id          [Claude Exec, 1h]
  P0-02 : frontend passe appliance_id                     [Lovable, 30min]
  P0-03 : garde prix 0 €                                  [Lovable, 15min]

ÉTAPE 2 — Données appareils utilisables (S2-S3)
  P1-01 : import Invicta                                   [Claude Exec, 1-2j]
  P1-02 : import Nova (flamme_verte_stars)                 [Claude Exec, 1j]

ÉTAPE 3 — Commande fournisseur (S4-S5)
  P1-06 : vue articles à commander                        [Lovable, 2-3h]

ÉTAPE 4 — Lien installation (S5, après décision 1:1)
  P0-04 : installations.heating_appliance_id              [Claude Exec, 30min]
  P2-01 : clôture chantier → installation                 [Lovable, 5-8h]

ÉTAPE 5 — VT (S6-S7, après terrain)
  P2-02 : formulaire visite technique                     [Lovable, 5-10h]
  P2-03 : quotes.technical_survey_id                      [Claude Exec, 20min]

ÉTAPE 6 — Parc installé complet
  P0-05 : catalog_items.heating_appliance_id              [Claude Exec, 20min]
  P2-04 : SAV depuis installation                         [Lovable, 3-5h]
```

Effort total chemin critique : **~40-55h** réparties sur 6-8 semaines.

---

## Ce qui est explicitement reporté après les pilotes

| Sujet | Pourquoi repousser |
|---|---|
| Refactoring QuoteEditor monolithique | Pas de valeur utilisateur avant 2+ développeurs |
| Fusion `heating_appliances` / `catalog_items` | Architecturalement inutile si le lien FK suffit |
| Virtualisation des lignes du devis | Imperceptible sous 25 lignes |
| Les 5 libellés concurrents par ligne | Invisible pour l'artisan, bloquant seulement avec des canaux de sortie multiples |
| Note de calcul V3 | Nécessite des données appareils remplies + 20 devis pour calibrer |
| Pièces détachées par appareil | Nécessite SAV opérationnel + `manufacturer_ref` rempli |
| Import ADEME automatisé | Acceptable en mise à jour manuelle pour V1 |
| Design system — tokens sémantiques | Aucun impact utilisateur immédiat |
| `billing.quotes.tva_context` déjà rempli (95/95) | Rien à faire, déjà en place |

---

## Décision fondateur requise avant P0-04

**Question :** 1 installation = 1 appareil ou N appareils ?

**Cas réels à arbitrer :**
- Poêle granulés + cuisinière à bois dans la même maison
- Foyer ouvert + insert indépendant
- Chaudière bois + ballon tampon

**Option A — 1 installation = 1 appareil** : Deux appareils = deux lignes `installations`. Simple. Correspond au modèle actuel (`brand` + `model` scalaires). Migration triviale.  
**Option B — 1 installation = N appareils** : Nécessite une table de pivot `installation_devices`. Plus complexe, plus flexible.

**Recommandation :** Option A pour V1. Les cas multi-appareils dans une même maison sont rares dans le scope bois-énergie initial (≠ PAC réversible + ballon). Arbitrer en 20 minutes, ne pas bloquer le P0-04 sur ce débat.

---

## Synthèse des responsabilités

| Qui | Actions |
|---|---|
| **Claude Exec** | P0-01, P0-04, P0-05, P1-01, P1-02, P1-03, P2-03, P2-05 |
| **Lovable** | P0-02, P0-03, P1-04, P1-05, P1-06, P2-01, P2-02, P2-04 |
| **Fondateur** | Décision 1:1 installations · Validation terrain 5 devis · Arbitrage roadmap S8 |
| **Aucun maintenant** | P3-01 à P3-05 |
