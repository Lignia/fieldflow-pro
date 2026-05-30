# Modèle objet métier LIGNIA

> **Statut : document métier de référence vivant.**
> Ce document décrit les objets métier manipulés par LIGNIA.
> Il n'est pas un schéma SQL ni une spécification technique finale.
> Les tables et champs évoluent — ce document décrit la logique métier.
>
> Deux colonnes sont utilisées : **État actuel** (implémenté) et
> **Vision cible** (prévu ou en cours). Cette distinction permet
> de savoir ce qui existe vraiment à tout moment.
>
> Pour les acteurs externes du marché,
> voir `docs/business/CATALOG_ECOSYSTEM.md`.
> Pour le cycle commercial complet,
> voir `docs/business/LIGNIA_LIFECYCLE.md`.

---

## Principe fondamental

LIGNIA est un CRM métier et mini-ERP spécialisé bois énergie.

La valeur de LIGNIA se crée sur 10 ans, pas sur un seul devis.
Un conduit Poujoulat disparaît du scope commercial une fois posé.
L'installation reste dans le système 15 ans et génère :
entretien → ramonage → SAV → remplacement.

Le catalogue est un outil de vente.
Le parc installé est l'actif stratégique.

---

## Les 4 niveaux d'objets métier

```
NIVEAU 1 — Acteurs et contexte
  Tenant / Entreprise artisan
  Client et contacts
  Projet
  Site / Adresse

NIVEAU 2 — Cycle de vie installation (cœur de la valeur long terme)
  Parc installé
  Installation
  Appareil
  Intervention
  Diagnostic SAV
  Contrat d'entretien
  Documents métier

NIVEAU 3 — Catalogue et transactions (moteur commercial)
  Article catalogue
  Prestation
  Ouvrage / Kit
  Devis
  Bon de commande
  Facture
  Note de calcul simplifiée
  Canal de création

NIVEAU 4 — Écosystème fournisseurs
  Fabricant / Importateur / Distributeur / Fournisseur
  Remise tarifaire
```

---

## Niveau 1 — Acteurs et contexte

### Tenant (Entreprise artisan)

| | |
|---|---|
| **État actuel** | Implémenté — `core.tenants` |
| **Vision cible** | Stable |

Isolation totale des données entre artisans.
Un tenant = une entreprise artisan avec ses propres clients, catalogue et tarifs.

### Client et contacts

| | |
|---|---|
| **État actuel** | Client implémenté — `core.customers` |
| **Vision cible** | Contacts multiples par client — à créer V1 |

Un client peut avoir plusieurs interlocuteurs :
propriétaire, comptable, gardien, architecte prescripteur.
Chaque contact a son propre rôle et ses propres coordonnées.

### Projet

| | |
|---|---|
| **État actuel** | Implémenté — `core.projects` |
| **Vision cible** | Stable |

Cycle de vie : Prospect → Qualifié → Devis envoyé → Signé → En cours → Terminé.
Un projet appartient à un client et un site. Il contient N devis et N interventions.

### Site / Adresse

| | |
|---|---|
| **État actuel** | Table `core.properties` présente mais non exploitée comme entité persistante |
| **Vision cible** | Entité persistante indépendante du projet — V2 |

Un client peut avoir plusieurs sites. Le site survit à la clôture du projet
et porte l'historique de toutes les installations qui s'y trouvent.

---

## Niveau 2 — Cycle de vie installation

### Parc installé

| | |
|---|---|
| **État actuel** | Données partielles dans `core.installations` (3 lignes de test) |
| **Vision cible** | Vue unifiée de toutes les installations actives d'un artisan — V1/V2 |

Le parc installé est la vue métier qui regroupe pour chaque artisan :
- toutes ses installations actives
- les appareils installés avec leurs garanties
- les prochaines échéances de ramonage et d'entretien
- l'historique des interventions par installation
- les contrats d'entretien actifs

> C'est l'actif stratégique #1 de LIGNIA.
> Chaque installation clôturée alimente le parc installé
> et déclenche automatiquement le cycle de récurrence.

> Le parc installé est aussi la source des opportunités commerciales proactives :
> échéances dépassées, appareils vieillissants, garanties expirées.
> C'est lui qui transforme LIGNIA d'un outil de vente en outil de fidélisation.

### Installation

| | |
|---|---|
| **État actuel** | Table `core.installations` présente, champs garanties à compléter |
| **Vision cible** | Enregistrement complet à la clôture chantier — V1 |

Objet persistant créé à la signature du devis et complété à la clôture du chantier.
Il porte : appareil installé, numéro de série, date de mise en service,
garanties calculées automatiquement, diamètre du conduit posé,
prochaine échéance de ramonage.

Cycle de vie :
```
Devis signé       → Installation créée (statut : brouillon)
Chantier clôturé  → Installation active (appareil + garanties enregistrés)
Appareil remplacé → Installation archivée
```

### Appareil

| | |
|---|---|
| **État actuel** | 1 516 appareils ADEME dans `catalog.heating_appliances` |
| **Vision cible** | Branché au devis (onglet Appareils dans CatalogPopover) — V1 |

L'appareil dans le référentiel (heating_appliances) est distinct
de l'appareil installé chez un client (installations.appliance_id).
Source principale : base ADEME mensuelle (appareils éligibles MaPrimeRénov').

Données clés : fabricant, modèle, puissance (kW), label Flamme Verte,
diamètre sortie fumée, type (étanche / non étanche).

> La base ADEME constitue la source de référence officielle des appareils
> éligibles aux dispositifs d'aide (MaPrimeRénov', Flamme Verte).
> Elle est importée mensuellement dans LIGNIA via le pipeline catalogue.

### Intervention

| | |
|---|---|
| **État actuel** | Table `operations.interventions` présente, pages React partiellement codées |
| **Vision cible** | Objet unique pour tout RDV terrain, vue planning bureau — V1 |

Tout rendez-vous terrain est une intervention, quel que soit son type :
Visite Technique, Pose, Ramonage, Entretien, SAV, Autre.

Statuts : Planifiée → Confirmée → En cours → Terminée / Annulée / Reportée.

Chaque intervention porte un code analytique dérivé de son type
pour permettre l'export comptable par activité.

### Diagnostic SAV

| | |
|---|---|
| **État actuel** | Non implémenté |
| **Vision cible** | Étape intermédiaire avant intervention ou devis SAV — V2 |

Le diagnostic SAV est une étape intermédiaire permettant d'analyser
un problème avant de déclencher une intervention ou un devis SAV.

Cas possibles :
- appel téléphonique
- échange email
- photos envoyées par le client
- visio
- analyse à distance

Objectif : éviter les déplacements inutiles et préparer l'intervention terrain.

Cycle :
```
Panne → Diagnostic SAV → Décision
  → résolution à distance
  → intervention SAV
  → devis SAV
```

### Contrat d'entretien

| | |
|---|---|
| **État actuel** | Non implémenté |
| **Vision cible** | Abonnement annuel récurrent — V2 |

Lie un client à un cycle d'interventions récurrentes (notamment poêles granulés).
Couvre une ou plusieurs installations du même client.

### Documents métier

| | |
|---|---|
| **État actuel** | Table `core.documents` présente, non encore exploitée |
| **Vision cible** | Couche documentaire transversale — V1/V2 |

Les documents constituent une couche transversale utilisée par l'ensemble
des objets métier.

Exemples :
- devis (PDF généré)
- facture (PDF généré)
- certificat de ramonage (PDF généré)
- compte-rendu d'entretien
- rapport SAV
- photos chantier
- attestation de fin de travaux
- note de calcul simplifiée
- documents techniques (notices, fiches produits)

Objectif : centraliser l'historique documentaire d'un projet,
d'une installation ou d'une intervention en un seul endroit.

---

## Niveau 3 — Catalogue et transactions

### Article catalogue

| | |
|---|---|
| **État actuel** | 6 270 articles en base — `catalog.catalog_items` |
| **Vision cible** | Enrichissement catalog_domain + appareils branchés — V1 |

Le domaine produit est un attribut de l'**article**, pas du fournisseur.
Un même fournisseur peut avoir des articles dans plusieurs domaines.

Domaines :
```
FUMISTERIE      → conduits, accessoires, sorties de toit, tubage
APPAREIL        → poêles, inserts, chaudières
PRESTATION      → pose, ramonage, entretien, main d'œuvre
PIECE_DETACHEE  → joints, vitres, bougies, cartes électroniques,
                  pressostats, sondes, vis sans fin, ventilateurs
```

Règles fondamentales :
- La référence fournisseur ne change jamais une fois importée
- Le prix public est le seul prix stocké dans l'article
- Le prix d'achat n'est jamais importé ni stocké

### Prestation

| | |
|---|---|
| **État actuel** | Supporté comme article PRESTATION avec supplier_name='TENANT_PRIVATE' |
| **Vision cible** | UI de création dédiée dans le catalogue privé — V1 |

Une prestation est un article de domaine PRESTATION créé par l'artisan lui-même.
Elle n'a pas de fournisseur externe.
L'artisan la crée une fois et la réutilise dans tous ses devis.

Exemples : Pose poêle granulés étanche, Ramonage poêle à bûches,
Entretien annuel granulés, Déplacement zone 1, Main d'œuvre horaire.

Les prestations peuvent être regroupées dans des Ouvrages/Kits.

### Ouvrage / Kit

| | |
|---|---|
| **État actuel** | Non implémenté |
| **Vision cible** | Tables quote_kits + quote_kit_lines à créer — V1 |

> Un ouvrage n'est pas un produit.
> Un ouvrage est une combinaison réutilisable de produits et de prestations.

Exemple : l'ouvrage "Raccordement granulés étanche Ø80/130"
regroupe 5 articles fumisterie + 2 prestations.
Insérer cet ouvrage dans un devis insère toutes ses lignes en 1 clic,
avec les prix recalculés au moment de l'insertion.

Les prix d'un ouvrage ne sont jamais figés dans l'ouvrage lui-même.
Ils sont toujours recalculés à l'insertion selon les remises en vigueur.

Les ouvrages sont partagés dans le tenant et créés depuis les lignes
d'un devis existant.

Les ouvrages constituent le principal accélérateur de chiffrage de LIGNIA.
Ils permettent de transformer le savoir-faire métier d'un artisan
en bibliothèque réutilisable partagée dans son entreprise.
Un ouvrage bien configuré peut faire passer la création d'un devis
de 20 minutes à 2 minutes.

### Devis

| | |
|---|---|
| **État actuel** | Implémenté — 89 devis, 107 lignes en base |
| **Vision cible** | Stable — enrichir avec ouvrages et onglet Appareils |

Le devis est un document transitoire.
Une fois signé, ses lignes deviennent des snapshots immuables :
prix, référence fournisseur, fournisseur — tout est figé.
C'est ce snapshot qui sert de base au bon de commande fournisseur.

### Bon de commande

| | |
|---|---|
| **État actuel** | Tables présentes, vides |
| **Vision cible** | Généré depuis le devis signé — V2 |

Commande fournisseur générée depuis un devis signé.
Regroupement automatique par fournisseur.
Utilise toujours la référence fournisseur figée dans le snapshot du devis.

Vision V2 : à la réception de la facture fournisseur, Amélie pourra lier
le numéro de facture externe au bon de commande.
Cela permettra la réconciliation comptable sans ressaisie.

### Facture

| | |
|---|---|
| **État actuel** | Table présente, 3 factures de test |
| **Vision cible** | Générée depuis le devis signé — V1/V2 |

Types : Acompte (à la signature), Situation (à l'avancement),
Solde (à la clôture), Avoir, Retenue de garantie BTP.

Compatibilité comptable :
- Export compatible avec les principaux logiciels du marché
  (exemples : Pennylane, Sage, EBP)
- Format Facture-X (norme française e-facture) — V3
- Chaque ligne de facture porte un code comptable (706/707/607)
  et un axe analytique (INSTALLATION/ENTRETIEN/SAV/RAMONAGE)

### Note de calcul simplifiée

| | |
|---|---|
| **État actuel** | Non implémenté |
| **Vision cible** | Aide au dimensionnement après visite technique — V3 |

Document technique généré après la visite technique et avant le devis final,
lorsque la configuration nécessite une validation technique complémentaire.
Ce n'est pas une étape systématique.

Aide l'artisan à vérifier la faisabilité de l'installation :
diamètre de fumisterie, tirage, amenée d'air, points de vigilance réglementaires.

Position dans le cycle :
```
Visite technique → Analyse technique → [Note de calcul simplifiée si nécessaire] → Devis final
```

> Cette note ne remplace pas un logiciel complet de dimensionnement EN 13384-1.
> Elle sert d'aide métier, de pré-contrôle et de support documentaire.

Données à collecter dès la visite technique V1 pour préparer V3 :
type d'appareil, puissance, diamètre sortie fumée, hauteur conduit,
nombre de coudes, type de conduit, zone de débouché, amenée d'air,
étanchéité, combustible, contraintes du site.

### Canal de création

| | |
|---|---|
| **État actuel** | Non implémenté |
| **Vision cible** | Attribut des objets créés — V2/V3 |

Origine de création d'un objet métier ou d'une ligne de devis.

Valeurs possibles :
- MANUEL — saisie directe par l'utilisateur
- VISITE_TECHNIQUE — issu d'un formulaire de visite technique
- IA — suggéré ou créé par un assistant IA
- VOIX — créé par commande vocale
- IMPORT — issu d'un import automatique

Objectif : préparer les futurs workflows IA et devis vocal,
et permettre l'audit de la source de chaque ligne.

> Le canal VOIX doit permettre à terme la création d'un devis sans clavier.
> C'est une vision stratégique forte de LIGNIA : un artisan sur chantier
> dicte ses lignes de devis à voix haute, sans toucher à l'écran.

---

## Niveau 4 — Écosystème fournisseurs

Voir `docs/business/CATALOG_ECOSYSTEM.md` pour la cartographie complète.

### Mapping des concepts dans LIGNIA

| Concept marché | Champ dans l'article | État actuel |
|---|---|---|
| Fournisseur utilisé | supplier_name | Implémenté |
| Fabricant réel | manufacturer_name | Implémenté |
| Référence fournisseur | supplier_ref | Implémenté (jamais modifié) |
| Référence fabricant | manufacturer_ref | Optionnel V1 — prévu V2 |
| Famille commerciale | supplier_family_code | Absent V1 — prévu V2 probable |

> `supplier_family_code` permettra en V2 les remises par famille.
> Son absence en V1 est acceptable — la remise globale fournisseur couvre les cas courants.

### Remises tarifaires

| | |
|---|---|
| **État actuel** | Table présente — 1 remise configurée (Poujoulat test) |
| **Vision cible** | Remises par famille — V2 |

La remise nette est calculée à l'ajout d'un article au devis.
Hiérarchie de fallback : article exact → famille → distributeur → fournisseur global.

---

## Flux de valeur LIGNIA

```
Client
  ↓ Projet
Devis ← Articles + Prestations + Ouvrages
  ↓ Signature (lignes figées)
Bon de commande → Fournisseur
  ↓ Chantier
Installation ← Appareil
  ↓ Clôture (garanties + prochaine échéance calculées)
Parc installé
  ↓ Cycle récurrent
Interventions (Ramonage / Entretien / SAV)
  ↓
Factures → Export comptable (Pennylane / Sage / EBP)
         → Facture-X V3
```
