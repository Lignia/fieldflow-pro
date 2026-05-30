# LIGNIA — User Stories Complètes
> Document de référence — v3.1
> Claude Analytics + OpenAI + Chapeau Noir — Mai 2026
> Pour : Claude Exec, Claude Read, Lovable, développeurs

---

## VISION PRODUIT

```
LIGNIA est 3 choses simultanément :

1. UN CRM / MINI-ERP
   Devis → Installation → Facture → Comptabilité
   Compatible logiciels comptables et Facture-X (V3)

2. UN CATALOGUE MULTI-FOURNISSEURS
   100 fournisseurs, 4 domaines, 1 pipeline d'import
   Recherche rapide < 500ms, ouvrages pré-remplis

3. UN GESTIONNAIRE DE PARC INSTALLÉ
   Appareil → Ramonage → Entretien → SAV → Remplacement
   Le fil conducteur de toute la récurrence client
```

---

## INVARIANTS SYSTÈME — Jamais violés

```
INVARIANT 1   supplier_ref = code brut fournisseur, jamais modifié, jamais préfixé
INVARIANT 2   cost_price = NULL toujours dans catalog_items (contrainte SQL CHECK)
INVARIANT 3   unit_price_ht = prix public uniquement
INVARIANT 4   quote_lines = snapshots immuables après signature
INVARIANT 5   resolve_item_price = seule source de pricing runtime
INVARIANT 6   RLS obligatoire sur toutes les tables multi-tenant
INVARIANT 7   Ne jamais modifier resolve_item_price, search_quote_items_v2, replace_quote_lines
INVARIANT 8   supplier_name ≠ manufacturer_name
              supplier_name = qui distribue (ex: Lorflex)
              manufacturer_name = qui fabrique (ex: Poujoulat, Dinak, Joncoux)
              Ces deux concepts sont toujours distincts.
INVARIANT 9   technology_type = technologie de construction
              (simple paroi, double paroi, concentrique, pellets, gaz)
              ≠ supplier_family_code = famille commerciale fournisseur
              (DEKO BOIS, FLEX, DUAL/EI, Apollo)
              Ne pas confondre ces deux concepts.
INVARIANT 10  catalog_domain sépare les 4 univers produit
              FUMISTERIE | APPAREIL | PRESTATION | PIECE_DETACHEE
              search_quote_items_v2 filtre toujours par domain selon le contexte
              Ne JAMAIS mélanger les domaines dans une recherche sans contexte explicite
              Exemple : en mode devis installation → FUMISTERIE + APPAREIL + PRESTATION
                        en mode SAV → PIECE_DETACHEE + PRESTATION
```

---

## PÉRIMÈTRE PRODUIT LIGNIA — 4 domaines catalog_domain

```
DOMAINE A — FUMISTERIE          (catalog_domain = 'FUMISTERIE')
  Conduits (simple paroi, double paroi, concentrique, flexible)
  Accessoires (coudes, tés, raccords, collerettes)
  Sorties de toit, terminaux
  Tubage flexible
  Ventilation aéraulique
  Fournisseurs : Poujoulat, Lorflex, Joncoux, Dinak, Bofill, Jeremias, Tubest...

DOMAINE B — APPAREILS           (catalog_domain = 'APPAREIL')
  Poêles bois / granulés
  Inserts bois / granulés
  Chaudières biomasse
  (V2) PAC, chauffe-eau, solutions hybrides
  Source : base ADEME (éligibles MaPrimeRénov') + catalogues fabricants

DOMAINE C — PRESTATIONS         (catalog_domain = 'PRESTATION')
  Pose et installation
  Ramonage
  Entretien annuel
  SAV / dépannage
  Visites techniques
  Main d'œuvre

DOMAINE D — PIÈCES DÉTACHÉES    (catalog_domain = 'PIECE_DETACHEE')
  Joints, vitres, bougies d'allumage
  Cartes électroniques, pressostats, sondes
  Vis sans fin, moteurs, ventilateurs
  Télécommandes, modules WiFi
  NE PAS IMPORTER MASSIVEMENT EN V1
  Approche : catalogue privé artisan + ligne libre pour SAV exceptionnel
```

**POURQUOI catalog_domain est critique :**
Sans ce champ, un artisan qui tape "joint" dans la recherche reçoit
des joints SAV, des joints fumisterie et des joints d'étanchéité mélangés.
Avec catalog_domain, la recherche est toujours filtrée sur le contexte courant.

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

---

## LES 4 CYCLES PRODUIT

```
CYCLE 1 — Installation (CRM / devis)
  Prospect → Estimatif → Visite → Définitif → Signé → Chantier → Facture
  Acteurs : Sophie, Thierry, Yohan, Amélie
  Objets : Appareil + Fumisterie + Prestation

CYCLE 2 — Entretien récurrent
  Parc installé → Ramonage → Entretien annuel → Rappel → Renouvellement
  Acteurs : Luc, Michel
  Objets : Installation existante

CYCLE 3 — SAV
  Panne → Diagnostic → Pièce détachée → Intervention → Facture → Historique
  Acteurs : Thierry, Yohan, Amélie
  Objets : Pièces détachées (catalogue privé ou ligne libre en V1)

CYCLE 4 — Maintenance catalogue (SUPER_ADMIN)
  Import → Dry-run → Vérif → Remises → Monitoring → Comparaison versions
  Acteurs : SUPER_ADMIN
  Objets : catalog_items, heating_appliances
```

---

## SÉPARATION V1 / V2 / V3

```
V1 — En cours / imminent
  Import Poujoulat + Lorflex (fumisterie)
  Devis estimatif et final avec remise globale fournisseur
  Recherche catalogue filtrée par catalog_domain
  Kits / Ouvrages pré-remplis
  Fournisseurs actifs/inactifs par tenant
  Catalogue privé artisan (lignes maison, pièces SAV basiques)
  Fiche chantier mobile basique
  Cycle ramonage simple
  Appareils dans devis (branchement heating_appliances → QuoteEditor)
  Enregistrement appareil à la clôture chantier (parc installé V1)
  Import base ADEME → heating_appliances

V2 — Après validation terrain (1-3 mois)
  Remises par famille (supplier_family_code importé)
  Bon de commande fournisseur
  Monitoring imports + comparaison versions tarifaires
  Archivage articles disparus automatique
  Facturation et relances automatiques
  Portail client (signature, suivi)
  Historique installation complet par client (parc installé V2)
  Permissions multi-utilisateurs (rôles)
  Compatibilité appareil ↔ fumisterie (suggestion automatique)
  Gouvernance normalisation catalogue
  Déclenchement SAV depuis fiche installation
  Catalogue pièces détachées (import sélectif par marque)

V3 — Après terrain artisans (3-12 mois)
  Assistant vocal devis chantier
  Alertes compatibilité technique avancées
  Variantes produits
  Export comptable FEC / Facture-X
  Réseau marques (fabricants, franchisés)
  Reporting multi-sites
  LIGNIA Manufacturer (portail fabricants)
  Parc installé intelligent (suggestion pièces compatibles par modèle)
  Mini-ERP complet avec comptabilité connectée
```

---

## EXIGENCES NON-FONCTIONNELLES (PWA)

```
PERFORMANCE
  Recherche catalogue       < 500ms (jusqu'à 100k articles, filtré par domain)
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

VOLUME CIBLE
  100 fournisseurs maximum en base
  20 fournisseurs actifs par artisan en moyenne
  600 000 articles maximum (100 fournisseurs × 6 000 articles)
  catalog_domain évite la pollution inter-domaines dans la recherche
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
- catalog_domain défini par fournisseur (INVARIANT 10)
- import_batch_id UUID unique par campagne
- Devis signés non affectés (INVARIANT 4)

RÉSULTAT ATTENDU
  N articles disponibles dans la recherche (filtrés par domain)
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
COMPORTEMENT ATTENDU
  Articles existants → prix mis à jour (UPDATE via supplier_ref)
  Nouveaux articles → créés (INSERT)
  Articles disparus → archivés (is_active=false)
  Devis signés → inchangés (snapshots immuables)
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
CONFIGURATION À DÉFINIR PAR FOURNISSEUR
  - Quelle colonne CSV = code article (supplier_ref)
  - Quelle colonne CSV = libellé
  - Quelle colonne CSV = prix public
  - TVA par défaut
  - catalog_domain par défaut pour ce fournisseur
  - Si distributeur multi-marques : quelle colonne = fabricant réel
  - Encodage du fichier

CRITÈRES D'ACCEPTATION
✅ Vérification avant import : taux d'articles ignorés < 10%
✅ 0 article avec cost_price
✅ catalog_domain renseigné sur 100% des articles
✅ Mapping réutilisable pour les prochains imports
```

---

### US-C04 — Comparer deux versions d'un tarif (V2)
**En tant que SUPER_ADMIN, je veux voir les écarts entre l'ancien et le nouveau tarif.**

```
CRITÈRES D'ACCEPTATION V2
✅ Rapport : N nouveaux, N mis à jour (+X% moyen), N disparus
✅ Alerte si hausse > 15% sur un article stratégique
✅ Import optionnel après validation du rapport
```

---

### US-C05 — Gérer les fournisseurs actifs par tenant (V1)
**En tant que TENANT_ADMIN (Arnaud), je veux activer ou désactiver des fournisseurs.**

```
CRITÈRES D'ACCEPTATION
✅ Liste des fournisseurs disponibles par tenant
✅ Activation / désactivation sans perte de données
✅ Recherche filtrée sur fournisseurs actifs uniquement
```

---

### US-C06 — Importer la base ADEME dans heating_appliances (V1)
**En tant que SUPER_ADMIN, je veux importer les appareils éligibles MaPrimeRénov' depuis le fichier ADEME officiel.**

```
BESOIN MÉTIER
  Le fichier ADEME (mensuel, xlsx) liste tous les appareils
  éligibles aux aides (MaPrimeRénov', CEE, Flamme Verte).
  Ces appareils doivent être disponibles pour tous les artisans
  dans l'onglet "Appareils" du CatalogPopover.

SOURCE
  Fichier ADEME officiel (xlsx mensuel)
  Données : marque, modèle, puissance, rendement,
            Flamme Verte (nb étoiles), classe énergétique,
            type combustible, étanchéité, diamètre buse

RÈGLES
  catalog_domain = 'APPAREIL' (INVARIANT 10)
  is_central = true (visible par tous les tenants)
  Import idempotent (même pipeline que catalog_items)
  Pas de cost_price
  Pas de fournisseur (fabricant = manufacturer_name)

POURQUOI C'EST IMPORTANT
  Artisans ont besoin des données ADEME pour les dossiers MaPrimeRénov'
  LIGNIA peut générer automatiquement la fiche technique dans le PDF devis
  Différenciateur fort vs outils génériques

CRITÈRES D'ACCEPTATION
✅ Appareils visibles dans CatalogPopover onglet "Appareils"
✅ Données ADEME complètes (puissance, rendement, Flamme Verte)
✅ Import mensuel reproductible en une commande
```

---

## BLOC D — DEVIS (CORE FLOW)

### US-D01 — Créer un devis estimatif (V1)
**En tant que Vendeuse (PER003b — Sophie), je veux créer un devis rapide pour un prospect.**

```
FLOW
  1. Nouveau projet → client → créer devis estimatif
  2. Rechercher articles — catalog_domain filtre auto sur APPAREIL + FUMISTERIE + PRESTATION
  3. Ajouter lignes (prix public résolu par resolve_item_price)
  4. Remise globale fournisseur appliquée automatiquement
  5. Enregistrer et envoyer au client

UN DEVIS RÉEL RESSEMBLE À :
  Poêle Jotul F163 (APPAREIL)
  + Kit raccordement étanche Ø80/130 (PRESTATION = ouvrage)
  + Conduit concentrique Poujoulat 1m (FUMISTERIE)
  + Sortie toiture (FUMISTERIE)
  + Main d'œuvre pose (PRESTATION)
  ────────────────────────────────
  Ces 4 domaines coexistent dans UN SEUL devis

CRITÈRES D'ACCEPTATION
✅ Devis créé en < 5 min pour un cas standard
✅ Appareils + fumisterie + prestations dans le même devis
✅ Prix correct (remise appliquée via resolve_item_price)
✅ TVA correcte (5.5% rénovation / 20% neuf selon contexte)
```

---

### US-D02 — Convertir un estimatif en devis final (V1)
**En tant que Vendeuse (Sophie), après la visite technique je crée le devis définitif.**

```
CRITÈRES D'ACCEPTATION
✅ Duplication estimatif → devis final (kind=final)
✅ Prix recalculés à la sauvegarde
✅ Numérotation distincte
```

---

### US-D03 — Rechercher un article dans le catalogue (V1)
**En tant qu'utilisateur, je veux trouver rapidement un article.**

```
CRITÈRES D'ACCEPTATION
✅ Recherche fulltext < 500ms
✅ Filtrage par fournisseurs actifs du tenant
✅ Filtrage par catalog_domain selon le contexte (INVARIANT 10)
✅ Articles archivés exclus
✅ Onglets : Appareils | Fumisterie | Prestations | Maison
```

---

### US-D04 — Appliquer une remise fournisseur (V1)
**En tant que TENANT_ADMIN, je veux que mes remises s'appliquent automatiquement.**

```
CRITÈRES D'ACCEPTATION
✅ Remise appliquée automatiquement à l'ajout
✅ net_price_ht < unit_price_ht
✅ Marge visible (interne, non transmise au client)
```

---

### US-D05 — Signer un devis (V1)
**En tant que Gérant (Arnaud), je veux enregistrer la signature du client.**

```
CE QUI SE PASSE À LA SIGNATURE
  1. quote_status → signed
  2. Facture d'acompte créée automatiquement
  3. Installation créée (status=draft) → alimente le parc installé
  4. Client converti de prospect → actif
  5. quote_lines = snapshot immuable (INVARIANT 4)

CRITÈRES D'ACCEPTATION
✅ Données figées après signature
✅ Facture acompte générée
✅ Installation créée dans le parc installé
```

---

### US-D06 — Remise ligne par ligne (V2)
**En tant que Vendeuse, je veux ajuster la remise sur une ligne spécifique.**

```
CRITÈRES D'ACCEPTATION V2
✅ Remise unitaire par ligne (discount_allowed=true requis)
✅ Lignes main d'œuvre non remisables
✅ Marge recalculée en temps réel
```

---

### US-D07 — Créer un kit / ouvrage (V1)
**En tant que Vendeuse, je veux réutiliser une configuration type.**

```
BESOIN MÉTIER
  "Raccordement granulés étanche Ø80/130" revient à chaque devis.
  Un ouvrage = N lignes insérées en 2 clics avec les bons prix.
  L'artisan ne cherche plus : il sélectionne son ouvrage.

CRITÈRES D'ACCEPTATION
✅ Créer un ouvrage depuis des lignes de devis existant
✅ Insérer un ouvrage = insérer toutes ses lignes en 1 clic
✅ Prix recalculé au moment de l'ajout (resolve_item_price)
✅ Ouvrages filtrés par catalog_domain si besoin
```

---

### US-D08 — Fiche technique appareil dans le devis (V2)
**En tant qu'Artisan, je veux que le PDF devis inclue les données techniques ADEME.**

```
BESOIN MÉTIER
  Pour une demande MaPrimeRénov', l'artisan doit fournir
  les données techniques : puissance, rendement, Flamme Verte.
  LIGNIA les génère automatiquement depuis heating_appliances.

CRITÈRES D'ACCEPTATION V2
✅ Données ADEME dans le PDF devis (puissance, rendement, Flamme Verte)
✅ Génération automatique si appareil depuis heating_appliances
✅ Mention classe énergétique visible sur le devis client
```

---

## BLOC APP — APPAREILS ET PARC INSTALLÉ

### US-APP-01 — Ajouter un appareil au devis (V1 — PRIORITÉ HAUTE)
**En tant qu'Artisan, je veux ajouter un poêle ou insert à mon devis.**

```
BESOIN MÉTIER
  Un devis d'installation commence par l'appareil, pas par le conduit.
  heating_appliances existe en base mais n'est pas branché au QuoteEditor.
  C'est le principal gap V1 après l'import Poujoulat.

DONNÉES D'UN APPAREIL
  Marque, modèle, référence
  Puissance nominale (kW)
  Combustible (bois / granulés / mixte)
  Diamètre de sortie fumée (mm) → clé pour la compatibilité
  Étanchéité (étanche / non étanche)
  Flamme Verte (nb étoiles)
  Prix public HT

CRITÈRES D'ACCEPTATION
✅ heating_appliances branché au CatalogPopover (onglet "Appareils")
✅ Appareil ajouté avec catalog_domain='APPAREIL'
✅ Prix via resolve_item_price
✅ Diamètre sortie stocké dans le snapshot (pour suggestion fumisterie)
```

---

### US-APP-02 — Suggestion fumisterie compatible après ajout appareil (V2)
**En tant qu'Artisan, après avoir ajouté un appareil, je veux voir les conduits compatibles.**

```
COMPORTEMENT V2
  Poêle Jotul F163 → sortie Ø80, étanche
  → LIGNIA filtre automatiquement sur diameter_inner_mm=80, concentrique
  → Warning si l'artisan ajoute un conduit incompatible (non bloquant)

CRITÈRES D'ACCEPTATION V2
✅ Filtre automatique sur diamètre après ajout appareil
✅ Warning non bloquant si incompatibilité
```

---

### US-APP-03 — Enregistrement appareil à la clôture chantier (V1)
**En tant que Poseur (Yohan), quand je clôture une installation, je veux enregistrer l'appareil pour déclencher le cycle d'entretien.**

```
BESOIN MÉTIER
  C'est la clé de voûte du parc installé.
  Sans appareil correctement enregistré, le ramonage ne peut pas
  être automatisé et le SAV n'a pas de contexte.

DONNÉES SAISIES SUR MOBILE
  Marque + modèle (depuis heating_appliances ou saisie libre)
  Numéro de série
  Diamètre buse réel installé
  Date de mise en service
  Étanchéité confirmée
  Photos finales

DÉCLENCHEMENTS AUTOMATIQUES
  Prochaine date ramonage = date mise en service + 12 mois
  Rappel client programmé (Luc, PER002)
  Lien installation ↔ client créé (Michel, PER009C)
  Historique accessible depuis la fiche client

CRITÈRES D'ACCEPTATION
✅ Saisie terrain < 2 minutes sur mobile (PWA offline)
✅ Installation créée dans le parc installé
✅ Date ramonage calculée automatiquement
✅ Notification patron à la clôture
```

---

### US-APP-04 — Parc installé client (V1/V2)
**En tant qu'Artisan (Thierry), je veux voir l'historique complet d'un client depuis sa fiche.**

```
CONTENU DU PARC INSTALLÉ
  Appareil(s) installé(s) : marque, modèle, N° série, date
  Diamètre conduit installé
  Dernier ramonage (date + technicien)
  Prochain entretien recommandé
  Historique SAV

ACTIONS RAPIDES DEPUIS LE PARC
  → Créer devis ramonage
  → Créer devis SAV
  → Voir historique complet
  → Programmer rappel client

CRITÈRES D'ACCEPTATION V1
✅ Fiche client avec au moins 1 installation visible
✅ Lien direct vers création SAV ou ramonage
CRITÈRES D'ACCEPTATION V2
✅ Historique chronologique complet
✅ Parc multi-appareils (client avec plusieurs installations)
```

---

## BLOC SAV — SERVICE APRÈS-VENTE

### US-SAV-01 — Créer un devis SAV depuis la fiche installation (V1)
**En tant qu'Artisan (Thierry), quand un client appelle pour une panne, je veux créer un devis SAV en 2 clics.**

```
BESOIN MÉTIER
  Michel appelle : "Mon poêle MCZ Ego affiche l'erreur A05."
  Thierry ouvre sa fiche, voit le modèle, crée le devis SAV.
  Le devis est pré-rempli avec le contexte de l'installation.

SCÉNARIO
1. Ouvrir fiche client Michel
2. Voir son poêle MCZ Ego (marque, modèle, date installation)
3. Cliquer "Créer devis SAV"
4. Devis pré-rempli : client, adresse, appareil, type = SAV
5. Ajouter les pièces :
   - Pièce récurrente → catalogue privé artisan (catalog_domain='PIECE_DETACHEE')
   - Pièce rare       → ligne libre avec coût interne
6. Envoyer le devis

RÈGLE V1
  Pas d'import massif de pièces détachées
  Catalogue privé artisan pour les pièces récurrentes (joint porte, vitre standard)
  Ligne libre pour les pièces rares ou premières fois
  Cette approche couvre 90% des cas SAV V1

CRITÈRES D'ACCEPTATION
✅ Devis SAV créé en < 3 minutes
✅ Contexte appareil pré-rempli depuis le parc installé
✅ Pièces détachées depuis catalogue privé ou ligne libre
✅ catalog_domain='PIECE_DETACHEE' pour les pièces catalogue
```

---

### US-SAV-02 — Catalogue privé pièces détachées (V1)
**En tant qu'Artisan, je veux créer mes propres pièces récurrentes dans mon catalogue.**

```
BESOIN MÉTIER
  Thierry pose souvent des MCZ et Edilkamin.
  Il a 10-15 pièces qu'il commande régulièrement.
  Il les crée une fois dans son catalogue privé.
  Il les réutilise dans tous ses devis SAV.

EXEMPLES
  "Joint porte MCZ Ego" → 18€
  "Vitre Edilkamin 40x25" → 45€
  "Bougie allumage granulés universelle" → 12€
  "Pressostat MCZ 0-5 mbar" → 35€

MODÈLE
  catalog_items avec :
    supplier_name = 'TENANT_PRIVATE'
    catalog_domain = 'PIECE_DETACHEE'
    tenant_id = uuid_artisan

CRITÈRES D'ACCEPTATION
✅ Artisan crée une pièce en 30 secondes
✅ Visible dans CatalogPopover onglet "SAV / Pièces"
✅ Non visible par d'autres artisans (isolation tenant)
✅ catalog_domain = 'PIECE_DETACHEE' pour ne pas polluer la recherche fumisterie
```

---

### US-SAV-03 — Catalogue SAV fabricants (V3)
**En tant que SUPER_ADMIN, je veux importer les catalogues de pièces détachées des fabricants.**

```
BESOIN MÉTIER
  À terme, quand l'artisan fait un SAV MCZ, il peut chercher
  "pressostat MCZ Ego" et trouver la bonne référence directement.
  Cela nécessite l'import du catalogue SAV MCZ, Edilkamin, Jotul...

VOLUME ESTIMÉ
  ~500 références par marque × 10 marques = 5 000 pièces minimum
  Potentiellement 50 000-200 000 références à long terme
  catalog_domain = 'PIECE_DETACHEE' isole totalement de la fumisterie

APPROCHE
  Même pipeline import que fumisterie (map_supplier.py + import_supplier_direct.py)
  catalog_domain = 'PIECE_DETACHEE' obligatoire
  Recherche SAV filtrée sur domain + marque appareil du client

CRITÈRES D'ACCEPTATION V3
✅ Import pièces MCZ disponible
✅ Recherche "MCZ Ego" → pièces compatibles uniquement
✅ Suggestion automatique depuis le parc installé (appareil connu)
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
**En tant que Technicien (Yohan), je veux documenter la visite technique sur mobile.**

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
✅ Date mise en service → déclenche US-APP-03 (parc installé)
✅ Déclenchement facturation solde
```

---

## BLOC R — RAMONAGE (V1)

### US-R01 — Planifier une tournée de ramonage (V1)
**En tant que Ramoneur (Luc), je veux organiser mes interventions annuelles.**

```
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
✅ Historique ramonage lié à l'installation (parc installé)
✅ Prochaine échéance mise à jour automatiquement
```

---

### US-R03 — Rappels automatiques d'échéances (V1)
**En tant que Ramoneur, je veux être rappelé 2 mois avant l'échéance de chaque client.**

```
CRITÈRES D'ACCEPTATION
✅ Notification Luc 2 mois avant échéance
✅ Email automatique client 1 mois avant (configurable)
✅ Calcul automatique basé sur date mise en service
```

---

## BLOC CRM — CLIENTS ET FACTURATION

### US-CRM01 — Fiche client complète (V1)
**En tant que Vendeuse (Sophie), je veux avoir une vue complète d'un client.**

```
CRITÈRES D'ACCEPTATION
✅ Coordonnées complètes
✅ Historique projets et devis
✅ Parc installé (appareils + dates)
✅ Statut : prospect / actif / inactif
```

---

### US-CRM02 — Tableau de bord commercial (V1)
**En tant que Gérant (Arnaud), je veux voir les KPIs de mon activité.**

```
CRITÈRES D'ACCEPTATION
✅ CA signé / en cours / perdu
✅ Taux de transformation devis
✅ Marge moyenne
✅ Top articles et fournisseurs
```

---

### US-FAC-01 — Conversion devis en facture (V2)
**En tant que Secrétaire (Amélie), je veux convertir un devis signé en facture.**

```
CRITÈRES D'ACCEPTATION
✅ Conversion en 1 clic
✅ Numérotation automatique
✅ Ventilation TVA par taux (5.5% rénovation / 20% neuf)
✅ PDF facture propre
```

---

### US-FAC-02 — Export comptable FEC / Facture-X (V3)
**En tant que Comptable (Sabrina), je veux exporter en format comptable standardisé.**

```
CRITÈRES D'ACCEPTATION V3
✅ Export FEC compatible logiciels comptables
✅ Format Facture-X (norme française e-facture)
✅ Ventilation TVA correcte
✅ Séparation installation / maintenance / SAV
```

---

## BLOC AUTH — MULTI-TENANT

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

## BLOC V — VOIX ET IA (V3)

### US-V01 — Créer une ligne devis par la voix (V3)
**En tant qu'Artisan sur chantier, je veux ajouter un article en parlant.**

```
SCÉNARIO
"Ajoute un coude 45° inox 150 double paroi Poujoulat"
→ Extraction entités : type, angle_deg, matière, diamètre, marque
→ search_quote_items_v2 filtré sur catalog_domain='FUMISTERIE'
→ Résultat en < 2s

PRÉREQUIS CRITIQUES (non satisfaits en V1)
  angle_deg, diameter_inner_mm, technology_type = null pour Poujoulat V1
  → À remplir en V2 (normalization job)
```

---

### US-V02 — Alertes compatibilité (V3)
**En tant qu'Artisan, LIGNIA doit signaler les incompatibilités évidentes.**

```
CRITÈRES V3
✅ Warning non bloquant basé sur diameter_inner_mm et technology_type
```

---

## BLOC FAB — FABRICANTS (V3)

### US-FAB-01 — Publication catalogue par le fabricant (V3)
**En tant que Fabricant (Olivier — Poujoulat), je veux publier directement dans LIGNIA.**

```
CRITÈRES V3
✅ Interface dédiée fabricants
✅ Catalogue publié → disponible pour les tenants autorisés
✅ Versioning et date de validité
```

---

## BLOC MAIN — MAINTENANCE SUPER_ADMIN

### US-MAIN-01 — Monitoring imports (V2)
**En tant que SUPER_ADMIN, je veux un tableau de bord de l'état de tous mes imports.**

```
CRITÈRES D'ACCEPTATION V2
✅ Table import_runs avec status, counts, timestamps
✅ Alerte si import partiel ou en échec
✅ Répartition par catalog_domain
```

---

### US-MAIN-02 — Rollback import (V1)
**En tant que SUPER_ADMIN, je veux annuler un import si erreur.**

```
CRITÈRES D'ACCEPTATION
✅ Rollback par batch_id
✅ Devis signés non affectés
```

---

## BLOC NORM — GOUVERNANCE NORMALISATION (V2)

### US-NORM-01 — Identifier les articles non normalisés (V2)
**En tant que SUPER_ADMIN, je veux voir les articles dont le libellé n'est pas normalisé.**

```
CRITÈRES D'ACCEPTATION V2
✅ Vue filtrée sur normalization_status='needs_review' par domain
✅ SUPER_ADMIN peut marquer comme 'validated' ou 'ai_normalized'
```

---

### US-NORM-02 — Gouvernance supplier_family_code (V2)
**En tant que SUPER_ADMIN, je veux harmoniser les familles commerciales.**

```
FAMILLES CANONIQUES LIGNIA
  conduit_double_paroi | conduit_simple_paroi | conduit_concentrique
  tubage_flexible | sortie_de_toit | raccordement | accessoire

CRITÈRES D'ACCEPTATION V2
✅ Table de correspondance famille_fournisseur → famille_canonique_LIGNIA
✅ tenant_supplier_discounts peut utiliser les deux niveaux
```

---

## RÉFÉRENCES TECHNIQUES

### Champs catalog_items

| Champ | Usage | Statut |
|---|---|---|
| supplier_ref | Code fournisseur brut (INVARIANT 1) | ✅ |
| catalog_domain | Domaine produit (INVARIANT 10) | ⚠️ À migrer V1 |
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

### Valeurs catalog_domain

| Valeur | Usage | Fournisseurs types |
|---|---|---|
| FUMISTERIE | Conduits, accessoires, tubage | Poujoulat, Lorflex, Dinak, Bofill |
| APPAREIL | Poêles, inserts, chaudières | ADEME, catalogues fabricants |
| PRESTATION | Pose, ramonage, entretien, SAV | Catalogue privé artisan |
| PIECE_DETACHEE | Joints, vitres, cartes électroniques | Catalogue privé ou import V3 |

### Champs quote_lines (snapshots INVARIANT 4)

| Champ | Rôle | Statut |
|---|---|---|
| supplier_ref_snapshot | Code fournisseur figé | ✅ |
| supplier_name_snapshot | Fournisseur figé | ✅ |
| unit_cost_price | Coût net figé (marge) | ✅ |
| metadata.pricing | Pricing complet figé | ✅ |
| vat_rate | TVA figée (colonne dédiée) | ✅ |

---

## DETTE TECHNIQUE CONNUE

| Dette | Gravité | Résoudre en |
|---|---|---|
| catalog_domain absent de catalog_items | CRITIQUE | V1 — avant import Lorflex |
| catalog_domain absent de map_supplier.py | CRITIQUE | V1 — avant import Lorflex |
| heating_appliances non branché au QuoteEditor | Critique | V1 après import Poujoulat |
| technology_type null (Poujoulat) | Moyen | V2 |
| diameter_inner_mm null | Moyen | V2 |
| unit null pour Poujoulat | Moyen | V2 |
| supplier_family_code absent | Fort | V2 avant remises famille |
| Table import_runs absente | Faible | V2 |
| Wrap RLS (SELECT auth.jwt()) | Moyen | V2 avant 50k articles |
| Index tenant_supplier_discounts | Moyen | V2 avant 200 remises |
| Tests E2E Playwright | Critique | V2 avant terrain |
| description_fabricant → technical_description | Moyen | V2 |
| Trigger immutabilité quote_lines | Moyen | V2 |
| Variantes produits | Fort | V3 |
| Export FEC / Facture-X | Moyen | V3 |
| Portail client | Moyen | V2 |
| Import catalogue SAV fabricants | Fort | V3 |
