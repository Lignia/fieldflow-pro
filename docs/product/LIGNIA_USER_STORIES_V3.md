# LIGNIA — User Stories Complètes
> Document de référence — v3.0
> Claude Analytics + OpenAI + Chapeau Noir — Mai 2026
> Pour : Claude Exec, Claude Read, Lovable, développeurs

---

## INVARIANTS SYSTÈME — Jamais violés

```
INVARIANT 1  supplier_ref = code brut fournisseur, jamais modifié, jamais préfixé
INVARIANT 2  cost_price = NULL toujours dans catalog_items (contrainte SQL CHECK)
INVARIANT 3  unit_price_ht = prix public uniquement
INVARIANT 4  quote_lines = snapshots immuables après signature
INVARIANT 5  resolve_item_price = seule source de pricing runtime
INVARIANT 6  RLS obligatoire sur toutes les tables multi-tenant
INVARIANT 7  Ne jamais modifier resolve_item_price, search_quote_items_v2, replace_quote_lines
INVARIANT 8  supplier_name ≠ manufacturer_name
             supplier_name = qui distribue (ex: Lorflex)
             manufacturer_name = qui fabrique (ex: Poujoulat, Dinak, Joncoux)
             Ces deux concepts sont toujours distincts.
INVARIANT 9  technology_type = technologie de construction
             (simple paroi, double paroi, concentrique, pellets, gaz)
             ≠ supplier_family_code = famille commerciale fournisseur
             (DEKO BOIS, FLEX, DUAL/EI, Apollo)
             Ne pas confondre ces deux concepts.
```

---

## PÉRIMÈTRE PRODUIT LIGNIA — 4 domaines

```
DOMAINE A — FUMISTERIE
  Conduits (simple paroi, double paroi, concentrique, flexible)
  Accessoires (coudes, tés, raccords, collerettes)
  Sorties de toit, terminaux
  Tubage flexible
  Ventilation aéraulique

DOMAINE B — APPAREILS
  Poêles bois / granulés
  Inserts bois / granulés
  Chaudières biomasse
  (V2) PAC, chauffe-eau, solutions hybrides

DOMAINE C — PRESTATIONS
  Pose et installation
  Ramonage
  Entretien annuel
  SAV / dépannage
  Visites techniques

DOMAINE D — CONSOMMABLES ET ACCESSOIRES DIVERS
  Granulés, bûches
  Pièces détachées
  Consommables de pose (joints, mastic, visserie)
  Produits d'entretien
```

**Note V1 :** Le domaine A est prioritaire. Le domaine B existe via `heating_appliances`
mais n'est pas encore branché au QuoteEditor. C'est la prochaine grande étape après
validation de l'import Poujoulat.

---

## PERSONAS

### Clients CRM — P0 (cœur MVP)

| ID | Prénom | Rôle | Entreprise |
|---|---|---|---|
| PER001 | Thierry | Artisan installateur solo | Vaysse Chauffage |
| PER002 | Luc | Ramoneur | Ramoneur du Morvan |
| PER003a | Arnaud | Patron showroom | Ambiance Chaleur |
| PER003b | Sophie | Vendeuse showroom | Ambiance Chaleur |
| PER003c | Yohan/Félicien | Équipe de pose terrain | Ambiance Chaleur |
| PER003d | Amélie | Secrétaire administrative | Ambiance Chaleur |
| PER009P | Claire | Prospect particulier | — |
| PER009C | Michel | Client particulier équipé | — |

### Extension réseau — P1

| ID | Prénom | Rôle | Entreprise |
|---|---|---|---|
| PER004 | Joris | Franchisé de marque | Jotul Saillagouse |
| PER005 | Paul | Distributeur | Joncoux |
| PER011 | Sabrina | Comptable | Cabinet Bâtiment |

### Écosystème fabricants — P2

| ID | Prénom | Rôle | Entreprise |
|---|---|---|---|
| PER006 | Marc | Fabricant poêles | Turbo Fonte |
| PER007 | Claire-Marie | Tête de réseau | Jotul France |
| PER008 | Olivier | Fabricant conduits | Poujoulat |
| PER010 | Lucie | Formateur RGE | CAPEB |

### Admin LIGNIA — Rôles internes

| ID | Rôle |
|---|---|
| SUPER_ADMIN | Solopreneur (toi) — imports, mapping, maintenance globale, tous tenants |
| TENANT_ADMIN | Artisan gérant — paramétrage de ses remises, fournisseurs actifs |
| TENANT_USER | Vendeur, poseur, secrétaire — usage quotidien |

**Note :** "Admin" seul est ambigu dans le document. Utiliser SUPER_ADMIN ou
TENANT_ADMIN selon le contexte.

---

## SÉPARATION V1 / V2 / V3

```
V1 — En cours / imminent
  Import Poujoulat + Lorflex (fumisterie)
  Devis estimatif et final avec remise globale fournisseur
  Recherche catalogue (code + description)
  Kits / Ouvrages pré-remplis
  Fournisseurs actifs/inactifs par tenant
  Catalogue privé artisan (lignes maison)
  Fiche chantier mobile basique
  Cycle ramonage simple
  Appareils dans devis (branchement heating_appliances → QuoteEditor)

V2 — Après validation terrain (1-3 mois)
  Remises par famille (supplier_family_code importé)
  Bon de commande fournisseur
  Monitoring imports + comparaison versions tarifaires
  Archivage articles disparus automatique
  Facturation et relances automatiques
  Portail client (signature, suivi)
  Historique installation par client
  Permissions multi-utilisateurs (rôles)
  Compatibilité appareil ↔ fumisterie (suggestion)
  Gouvernance normalisation catalogue

V3 — Après terrain artisans (3-12 mois)
  Assistant vocal devis chantier
  Alertes compatibilité technique avancées
  Variantes produits
  Export comptable FEC
  Réseau marques (fabricants, franchisés)
  Reporting multi-sites
  LIGNIA Manufacturer (portail fabricants)
```

---

## EXIGENCES NON-FONCTIONNELLES (PWA)

```
PERFORMANCE
  Recherche catalogue       < 500ms (jusqu'à 100k articles)
  Ajout article au devis    < 300ms (resolve_item_price inclus)
  Import 5 000 articles     < 2 min
  Chargement fiche chantier < 1s (mode offline)

OFFLINE (PWA)
  Fiche chantier : accessible hors connexion
  Devis en brouillon : consultable hors connexion
  Synchronisation à la reconnexion

FIABILITÉ
  0 perte de données sur devis signés
  Rollback import possible par batch_id
  Idempotence : réimporter = safe
```

---

## BLOC C — CATALOGUE ET IMPORTS (SUPER_ADMIN)

### US-C01 — Importer un nouveau catalogue fournisseur (V1)
**En tant que SUPER_ADMIN, je veux intégrer un nouveau catalogue fournisseur dans LIGNIA.**

```
BESOIN MÉTIER
  Un fournisseur m'envoie son tarif annuel.
  Je dois le rendre disponible pour tous les artisans
  qui travaillent avec ce fournisseur.

RÈGLES MÉTIER
- supplier_ref = code brut fournisseur (INVARIANT 1)
- manufacturer_name ≠ supplier_name (INVARIANT 8)
- cost_price JAMAIS importé (INVARIANT 2)
- technology_type ≠ supplier_family_code (INVARIANT 9)
- import_batch_id UUID unique par campagne
- Devis signés non affectés (INVARIANT 4)

RÉSULTAT ATTENDU
  N articles disponibles dans la recherche
  Prix cohérents (min/max vérifiés)
  cost_price = NULL sur 100%
  Rollback possible par batch_id

ROLLBACK
  Supprimer tous les articles d'une campagne via batch_id
  Les devis signés utilisant ces articles restent valides
```

---

### US-C02 — Mettre à jour les tarifs annuels (V1)
**En tant que SUPER_ADMIN, je veux mettre à jour les prix sans détruire l'historique.**

```
BESOIN MÉTIER
  Chaque année les fournisseurs publient un nouveau tarif.
  Les articles existants changent de prix.
  Des articles disparaissent. Des nouveaux apparaissent.

COMPORTEMENT ATTENDU
  Articles existants → prix mis à jour (UPDATE via supplier_ref)
  Nouveaux articles → créés (INSERT)
  Articles disparus → archivés (is_active=false)
  Devis signés → inchangés (snapshots immuables)
  Devis brouillons → reprennent les nouveaux prix à la prochaine sauvegarde
  V2 : warning UI "prix mis à jour depuis dernière modification"

CRITÈRES D'ACCEPTATION
✅ Aucun devis signé modifié
✅ Articles disparus non proposés dans la recherche
✅ Option "archiver les articles manquants" disponible
```

---

### US-C03 — Paramétrer le mapping d'une nouvelle marque (V1)
**En tant que SUPER_ADMIN, je veux configurer comment importer les données d'un nouveau fournisseur.**

```
BESOIN MÉTIER
  Chaque fournisseur a son propre format de fichier.
  Je dois définir la correspondance entre
  les colonnes du fichier fournisseur et le modèle LIGNIA.

CONFIGURATION À DÉFINIR PAR FOURNISSEUR
  - Quelle colonne CSV = code article (supplier_ref)
  - Quelle colonne CSV = libellé
  - Quelle colonne CSV = prix public
  - TVA par défaut
  - Si distributeur multi-marques : quelle colonne = fabricant réel
  - Encodage du fichier (correction mojibake si besoin)

INVARIANTS À RESPECTER
  supplier_name = distributeur (ex: Lorflex)
  manufacturer_name = fabricant réel (ex: Poujoulat, Dinak) — INVARIANT 8
  supplier_ref jamais transformé — INVARIANT 1

CRITÈRES D'ACCEPTATION
✅ Vérification avant import : taux d'articles ignorés < 10%
✅ 0 article avec cost_price
✅ Mapping réutilisable pour les prochains imports
```

---

### US-C04 — Comparer deux versions d'un tarif (V2)
**En tant que SUPER_ADMIN, je veux voir les écarts entre l'ancien et le nouveau tarif.**

```
BESOIN MÉTIER
  Entre le tarif 2025 et le tarif 2026 de Poujoulat :
  certains articles ont changé de prix,
  d'autres ont disparu, de nouveaux sont apparus.
  Je veux un rapport avant de valider l'import.

CRITÈRES D'ACCEPTATION V2
✅ Rapport : N nouveaux, N mis à jour (+X% moyen), N disparus
✅ Alerte si hausse > 15% sur un article stratégique
✅ Import optionnel après validation du rapport
```

---

### US-C05 — Gérer les fournisseurs actifs par tenant (V1)
**En tant que TENANT_ADMIN (Arnaud), je veux activer ou désactiver des fournisseurs.**

```
BESOIN MÉTIER
  Ambiance Chaleur travaille avec Poujoulat et Joncoux.
  Vaysse Chauffage travaille uniquement avec Modinox.
  La recherche doit filtrer sur les fournisseurs actifs du tenant.

CRITÈRES D'ACCEPTATION
✅ Liste des fournisseurs disponibles par tenant
✅ Activation / désactivation sans perte de données
✅ Recherche filtrée sur fournisseurs actifs uniquement
```

---

## BLOC D — DEVIS (CORE FLOW)

### US-D01 — Créer un devis estimatif (V1)
**En tant que Vendeuse (PER003b — Sophie), je veux créer un devis rapide pour un prospect.**

```
BESOIN MÉTIER
  Un prospect appelle. Je dois lui donner un ordre de prix rapide
  pour une installation complète.
  Je crée un devis estimatif avec les articles probables.

FLOW
  1. Nouveau projet → client → créer devis estimatif
  2. Rechercher articles (catalogue)
  3. Ajouter lignes (prix public résolu par resolve_item_price)
  4. Remise globale fournisseur appliquée automatiquement
  5. Enregistrer
  6. Envoyer au client

RÈGLES MÉTIER
  resolve_item_price = seule source de pricing (INVARIANT 5)
  cost_price dans quote_lines.unit_cost_price = prix net figé au moment de l'ajout
  unit_price_ht = prix public (INVARIANT 3)
  vat_rate = taux TVA figé (colonne dédiée) (INVARIANT 4)

CRITÈRES D'ACCEPTATION
✅ Devis créé en < 5 min pour un cas standard
✅ Prix correct (remise appliquée)
✅ TVA correcte
✅ Statut = draft → sent
```

---

### US-D02 — Convertir un estimatif en devis final (V1)
**En tant que Vendeuse (Sophie), après la visite technique je crée le devis définitif.**

```
BESOIN MÉTIER
  Après la visite terrain, j'ai les mesures exactes.
  Je transforme l'estimatif en devis final avec les bons articles.

CRITÈRES D'ACCEPTATION
✅ Duplication estimatif → devis final (kind=final)
✅ Lignes modifiables
✅ Prix recalculés au moment de la sauvegarde
✅ Numérotation distincte
```

---

### US-D03 — Rechercher un article dans le catalogue (V1)
**En tant qu'utilisateur, je veux trouver rapidement un article par référence ou description.**

```
CRITÈRES D'ACCEPTATION
✅ Recherche fulltext (libellé + normalized_name + search_keywords)
✅ Recherche par supplier_ref exact
✅ Résultats < 500ms
✅ Filtrage par fournisseurs actifs du tenant
✅ Articles archivés (is_active=false) exclus
```

---

### US-D04 — Appliquer une remise fournisseur (V1)
**En tant que TENANT_ADMIN, je veux que ma remise Poujoulat s'applique automatiquement.**

```
BESOIN MÉTIER
  Ambiance Chaleur a une remise de 40% sur Poujoulat.
  Quand Sophie ajoute un article Poujoulat, le prix net
  doit être calculé automatiquement.

FONCTIONNEMENT
  resolve_item_price retourne :
    public_price_ht = prix catalogue
    net_price_ht    = prix après remise
    discount_pct    = 40
    pricing_source  = supplier_global
  unit_cost_price dans quote_lines = net_price_ht figé

CRITÈRES D'ACCEPTATION
✅ Remise appliquée automatiquement à l'ajout
✅ net_price_ht < unit_price_ht
✅ Marge visible (interne, non transmise au client)
✅ Remise configurable par TENANT_ADMIN
```

---

### US-D05 — Signer un devis (V1)
**En tant que Gérant (PER003a — Arnaud), je veux enregistrer la signature du client.**

```
CE QUI SE PASSE À LA SIGNATURE
  1. quote_status → signed
  2. Facture d'acompte créée automatiquement
  3. Installation créée (status=draft)
  4. Client converti de prospect → actif
  5. Projet → signed
  6. quote_lines = snapshot immuable (INVARIANT 4)

SÉCURITÉ
  sign_quote_and_initialize exige auth.uid() valide
  tenant_id dérivé du JWT (non forgeable)
  actor_id dérivé de core.users (non forgeable)

CRITÈRES D'ACCEPTATION
✅ Données figées après signature
✅ Facture acompte générée
✅ Aucune modification possible sur les lignes
```

---

### US-D06 — Gérer une remise ligne par ligne (V2)
**En tant que Vendeuse (Sophie), je veux ajuster la remise sur une ligne spécifique.**

```
CRITÈRES D'ACCEPTATION V2
✅ Remise unitaire par ligne (discount_allowed=true requis)
✅ Lignes main d'œuvre non remisables (discount_allowed=false)
✅ Marge recalculée en temps réel
```

---

### US-D07 — Créer un kit / ouvrage (V1)
**En tant que Vendeuse (Sophie), je veux réutiliser une configuration type.**

```
BESOIN MÉTIER
  "Fumisterie complète poêle granulés 6m" revient souvent.
  Je veux un ouvrage pré-rempli que j'ajoute en un clic.

CRITÈRES D'ACCEPTATION
✅ Créer un ouvrage depuis des lignes de devis
✅ Ajouter un ouvrage = ajouter toutes ses lignes
✅ Prix recalculé au moment de l'ajout (resolve_item_price)
```

---

## BLOC P — PROJET ET CHANTIER

### US-P01 — Créer un projet (V1)
**En tant que Vendeuse (Sophie), je veux créer un projet pour un client.**

```
CRITÈRES D'ACCEPTATION
✅ Projet lié à un client et une adresse chantier
✅ Statuts : prospect → qualified → signed → in_progress → completed
✅ Un projet peut avoir plusieurs devis (estimatif + final)
```

---

### US-P02 — Réaliser la visite technique (V1)
**En tant que Technicien (PER003c — Yohan), je veux documenter la visite technique sur mobile.**

```
CRITÈRES D'ACCEPTATION
✅ Formulaire mobile optimisé
✅ Photos jointes
✅ Scénario de fumisterie noté (type conduit, diamètre, longueur)
✅ Sync automatique quand connexion rétablie
```

---

### US-P03 — Suivre l'avancement du chantier (V1)
**En tant que Gérant (Arnaud), je veux voir l'état de tous les projets en cours.**

```
CRITÈRES D'ACCEPTATION
✅ Vue pipeline par statut
✅ Filtres par période, technicien, fournisseur
✅ Montant HT par stade
```

---

### US-P04 — Clôturer une installation (V1)
**En tant que Technicien (Yohan), je veux enregistrer la fin de chantier.**

```
CRITÈRES D'ACCEPTATION
✅ Attestation de fin de travaux
✅ Numéro de série appareil enregistré
✅ Date mise en service
✅ Déclenchement facturation solde
```

---

## BLOC R — RAMONAGE (V1)

### US-R01 — Planifier une tournée de ramonage (V1)
**En tant que Ramoneur (PER002 — Luc), je veux organiser mes interventions annuelles.**

```
BESOIN MÉTIER
  Luc a 200 clients à ramoner chaque année.
  Il doit planifier ses tournées géographiquement
  et prévenir les clients.

CRITÈRES D'ACCEPTATION V1
✅ Liste des clients en retard de ramonage
✅ Planification par zone géographique
✅ Notification client (SMS ou email)
✅ Bon de ramonage généré sur place (mobile)
```

---

### US-R02 — Enregistrer un ramonage sur mobile (V1)
**En tant que Ramoneur (Luc) sur chantier, je veux certifier le ramonage.**

```
CRITÈRES D'ACCEPTATION
✅ Formulaire rapide (< 2 min)
✅ Signature client sur écran
✅ Certificat PDF généré
✅ Historique ramonage lié à l'installation
```

---

### US-R03 — Historique d'entretien par installation (V1)
**En tant que Client (PER009C — Michel), je veux accéder à l'historique de mon installation.**

```
CRITÈRES D'ACCEPTATION
✅ Vue par installation : ramonages, SAV, pièces changées
✅ Rappels automatiques annuels
✅ Export PDF historique complet
```

---

## BLOC S — SAV (V1)

### US-S01 — Créer une demande SAV (V1)
**En tant que Secrétaire (PER003d — Amélie), je veux enregistrer une réclamation client.**

```
CRITÈRES D'ACCEPTATION
✅ Demande liée à une installation existante
✅ Priorité et délai d'intervention
✅ Devis SAV si remplacement pièce
✅ Clôture avec rapport d'intervention
```

---

## BLOC CRM — CLIENTS

### US-CRM01 — Gérer la fiche client (V1)
**En tant que Vendeuse (Sophie), je veux avoir une vue complète d'un client.**

```
CRITÈRES D'ACCEPTATION
✅ Coordonnées complètes
✅ Historique projets et devis
✅ Installations en cours
✅ Statut : prospect / actif / inactif
```

---

### US-CRM02 — Tableau de bord commercial (V1)
**En tant que Gérant (Arnaud), je veux voir les KPIs de mon activité.**

```
CRITÈRES D'ACCEPTATION
✅ CA signé / en cours / perdu
✅ Taux de transformation devis
✅ Marge moyenne (si costs renseignés)
✅ Top articles et fournisseurs
```

---

## BLOC AUTH — AUTHENTIFICATION ET MULTI-TENANT

### US-AUTH01 — Isolation multi-tenant (V1)
**En tant que SUPER_ADMIN, je veux que les données de chaque artisan soient isolées.**

```
CRITÈRES D'ACCEPTATION
✅ RLS activée sur toutes les tables (INVARIANT 6)
✅ Aucune donnée d'un tenant visible par un autre
✅ Catalogue central partagé (is_central=true, tenant_id=NULL)
✅ JWT contient tenant_id (non forgeable)
```

---

### US-AUTH02 — Connexion et session (V1)
**En tant qu'utilisateur, je veux me connecter de façon sécurisée.**

```
CRITÈRES D'ACCEPTATION
✅ Auth Supabase (email/password)
✅ Session persistée
✅ Déconnexion propre
✅ Pas d'accès sans authentification (anon bloqué sur toutes les RPCs métier)
```

---

## BLOC PORTAL — PORTAIL CLIENT (V2)

### US-PORTAL01 — Signature électronique en ligne (V2)
**En tant que Prospect (PER009P — Claire), je veux signer le devis depuis mon téléphone.**

```
CRITÈRES D'ACCEPTATION V2
✅ Lien unique sécurisé par devis
✅ Vue devis + statut + historique
✅ Signature électronique intégrée
```

---

## BLOC O — COMMANDE FOURNISSEUR (V2)

### US-O01 — Générer un bon de commande (V2)
**En tant que Gérant (PER003a), je veux générer les BC fournisseurs après signature.**

```
RÈGLE CRITIQUE
  Le BC utilise supplier_ref_snapshot (figé à la création du devis)
  et NON supplier_ref de catalog_items (peut avoir changé depuis)
  supplier_name_snapshot détermine à quel fournisseur envoyer le BC.

CRITÈRES D'ACCEPTATION
✅ BC utilise supplier_ref_snapshot
✅ Regroupement par supplier_name_snapshot
✅ Quantités agrégées si même ref dans plusieurs lignes
✅ Export PDF ou email commercial
```

---

## BLOC FAC — FACTURATION (V2)

### US-FAC-01 — Conversion devis en facture (V2)
**En tant que Secrétaire (PER003d), je veux convertir un devis signé en facture.**

```
CRITÈRES D'ACCEPTATION
✅ Conversion en 1 clic
✅ Numérotation automatique
✅ Ventilation TVA par taux (5.5% rénovation / 20% neuf)
✅ PDF facture propre
```

---

### US-FAC-02 — Export comptable (V2)
**En tant que Comptable (PER011 — Sabrina), je veux exporter en format comptable.**

```
CRITÈRES D'ACCEPTATION V2
✅ Export CSV/FEC compatible logiciels comptables
✅ Ventilation TVA correcte
✅ Séparation installation / maintenance / SAV
```

---

## BLOC NORM — GOUVERNANCE NORMALISATION (V2)

### US-NORM-01 — Identifier les articles non normalisés (V2)
**En tant que SUPER_ADMIN, je veux voir les articles dont le libellé n'est pas normalisé.**

```
BESOIN MÉTIER
  Après import de 60 fournisseurs, on peut avoir :
  "FLEX", "Flexible", "Tubage Flexible", "FLEXIBLE"
  pour le même concept.
  La recherche et la voix en sont dégradées.

AFFICHAGE
  Liste des articles avec normalization_status='needs_review'
  Groupés par fournisseur
  Avec suggestion de libellé normalisé (V3 IA)

CRITÈRES D'ACCEPTATION V2
✅ Vue filtrée sur normalization_status='needs_review'
✅ SUPER_ADMIN peut marquer comme 'validated' ou 'ai_normalized'
✅ Statistiques : % normalisé par fournisseur
```

---

### US-NORM-02 — Gouvernance supplier_family_code (V2)
**En tant que SUPER_ADMIN, je veux harmoniser les familles commerciales entre fournisseurs.**

```
BESOIN MÉTIER
  Chaque fournisseur a ses propres codes famille :
  Lorflex : "Conduit Double paroi", "Tubage Flexible"
  Poujoulat : "DUAL/EI", "FLEXIBLE"
  Dinak : "DW 316L/304", "DINAFLEX INOX"

  Pour les remises et la recherche, il faut
  des familles LIGNIA canoniques qui transcendent les fournisseurs.

FAMILLES CANONIQUES LIGNIA (proposition)
  conduit_double_paroi
  conduit_simple_paroi
  conduit_concentrique
  tubage_flexible
  sortie_de_toit
  raccordement
  accessoire

CRITÈRES D'ACCEPTATION V2
✅ Table de correspondance famille_fournisseur → famille_canonique_LIGNIA
✅ tenant_supplier_discounts peut utiliser les deux niveaux
```

---

## BLOC MAIN — MAINTENANCE SUPER_ADMIN

### US-MAIN-01 — Monitoring imports (V2)
**En tant que SUPER_ADMIN, je veux un tableau de bord de l'état de tous mes imports.**

```
AFFICHAGE
  Fournisseur | Articles | Dernier import | Batch_id | % normalisé | Needs review

CRITÈRES D'ACCEPTATION V2
✅ Table import_runs avec status, counts, timestamps
✅ Alerte si import partiel ou en échec
```

---

### US-MAIN-02 — Rollback import (V1)
**En tant que SUPER_ADMIN, je veux annuler un import si erreur.**

```
CRITÈRES D'ACCEPTATION
✅ Rollback par batch_id
✅ Devis signés non affectés
✅ Procédure documentée dans le runbook
```

---

## BLOC V — VOIX ET IA (V3)

### US-V01 — Créer une ligne devis par la voix (V3)
**En tant qu'Artisan sur chantier, je veux ajouter un article en parlant.**

```
PRÉREQUIS CRITIQUES NON SATISFAITS AUJOURD'HUI
  angle_deg, diameter_inner_mm, technology_type = null pour Poujoulat V1
  → Ces champs doivent être remplis (normalization job V2)
  → Sans eux, la recherche vocale est dégradée

CRITÈRES V3
✅ Extraction entités → recherche → ajout en < 2s
✅ Confirmation vocale du prix et référence
```

---

### US-V02 — Alertes compatibilité (V3)
**En tant qu'Artisan, LIGNIA doit signaler les incompatibilités évidentes.**

```
CRITÈRES V3
✅ Warning non bloquant
✅ Basé sur diameter_inner_mm et technology_type existants
```

---

## BLOC FAB — FABRICANTS (V3 — LIGNIA Manufacturer)

### US-FAB-01 — Publication catalogue par le fabricant (V3)
**En tant que Fabricant (PER008 — Olivier), je veux publier mon catalogue directement dans LIGNIA.**

```
BESOIN MÉTIER
  Aujourd'hui Poujoulat envoie un CSV une fois par an.
  Demain il pourrait mettre à jour son catalogue directement
  dans LIGNIA, disponible instantanément pour tous ses revendeurs.

CRITÈRES V3
✅ Interface dédiée fabricants
✅ Catalogue publié → disponible pour les tenants autorisés
✅ Versioning et date de validité
```

---

### US-FAB-02 — Statistiques réseau fabricant (V3)
**En tant que Fabricant, je veux voir l'usage de ma marque dans le réseau.**

```
CRITÈRES V3
✅ Nombre d'artisans actifs utilisant ma marque
✅ Familles les plus utilisées
✅ Volume de devis par mois
✅ Données anonymisées (pas de données client exposées)
```

---

## RÉFÉRENCES TECHNIQUES

### Champs catalog_items

| Champ | Usage | Statut |
|---|---|---|
| supplier_ref | Code fournisseur brut (INVARIANT 1) | ✅ |
| supplier_name | Distributeur (INVARIANT 8) | ✅ |
| manufacturer_name | Fabricant réel (INVARIANT 8) | ✅ |
| unit_price_ht | Prix public (INVARIANT 3) | ✅ |
| cost_price | TOUJOURS NULL + CHECK SQL (INVARIANT 2) | ✅ |
| technology_type | Techno construction (INVARIANT 9) | ⚠️ Null Poujoulat V1 |
| supplier_family_code | Famille commerciale fournisseur | ❌ À créer V2 |
| diameter_inner_mm | Diamètre → recherche + compatibilité | ⚠️ Null Poujoulat V1 |
| angle_deg | Angle → recherche vocale | ⚠️ Null Poujoulat V1 |
| unit | Unité (u/m/m²/forfait/h) | ⚠️ Null Poujoulat V1 |
| is_active | Archivage articles disparus | ✅ |
| discount_allowed | Remise interdite | ✅ |
| normalization_status | needs_review / ai_normalized | ✅ |
| import_batch_id | Traçabilité / rollback | ✅ |

### Champs quote_lines (snapshots INVARIANT 4)

| Champ | Rôle | Statut |
|---|---|---|
| supplier_ref_snapshot | Code fournisseur figé | ✅ |
| supplier_name_snapshot | Fournisseur figé | ✅ |
| unit_cost_price | Coût net figé (marge) | ✅ |
| metadata.pricing | Pricing complet figé | ✅ |
| vat_rate | TVA figée (colonne dédiée) | ✅ |

### 3 cycles produit distincts

```
CYCLE 1 — Installation (Devis → Pose → Facture)
  PER001 + PER003a/b/c/d
  Prospect → Estimatif → Visite → Définitif → Signé → Chantier → Facture

CYCLE 2 — Entretien récurrent (Ramonage / SAV)
  PER002 + PER009C
  Échéance → Tournée → Certificat → Rappel → Renouvellement

CYCLE 3 — Maintenance catalogue (SUPER_ADMIN)
  Import → Dry-run → Vérif → Remises → Monitoring → Comparaison versions
```

---

## DETTE TECHNIQUE CONNUE

| Dette | Gravité | Résoudre en |
|---|---|---|
| technology_type null (Poujoulat) | Moyen | V2 |
| diameter_inner_mm null | Moyen | V2 |
| unit null pour Poujoulat | Moyen | V2 (import map_supplier.py) |
| supplier_family_code absent | Fort | V2 (avant remises famille) |
| heating_appliances non branché au QuoteEditor | Critique | V1 après import Poujoulat |
| Table import_runs absente | Faible | V2 |
| Wrap RLS (SELECT auth.jwt()) | Moyen | V2 avant 50k articles |
| Index tenant_supplier_discounts | Moyen | V2 avant 200 remises |
| Tests E2E Playwright | Critique | V2 avant terrain |
| description_fabricant → technical_description | Moyen | V2 |
| Trigger immutabilité quote_lines | Moyen | V2 |
| Variantes produits | Fort | V3 |
| Export FEC | Moyen | V2 |
| Portail client | Moyen | V2 |
