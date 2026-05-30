# Cycle de vie commercial et opérationnel LIGNIA

> **Statut : document métier de référence vivant.**
> Ce document décrit le cycle commercial et opérationnel complet de LIGNIA.
> Il sert de fil conducteur entre les user stories, le CRM, le catalogue,
> les fournisseurs et le parc installé.
>
> Pour les acteurs du marché, voir `docs/business/CATALOG_ECOSYSTEM.md`.
> Pour les objets métier, voir `docs/business/LIGNIA_OBJECT_MODEL.md`.

---

## Principe

LIGNIA couvre quatre cycles distincts mais interconnectés.
Ils partagent un objet central : l'installation.

```
CYCLE 1 — Vente et installation      (70% du CA)
CYCLE 2 — Entretien récurrent        (20% du CA)
CYCLE 3 — SAV                        (10% du CA + fidélisation)
CYCLE 4 — Remplacement               (valeur long terme)
```

---

## Cycle 1 — Vente et installation

### Vue d'ensemble

```
Prospect
  ↓
Qualification
  ↓
Devis estimatif
  ↓
Visite technique
  ↓
Analyse technique
  ↓
[Note de calcul simplifiée — V3 si nécessaire]
  ↓
Devis final
  ↓
Signature
  ↓
Commande fournisseur
  ↓
Réception matériel
  ↓
Pose
  ↓
Mise en service
  ↓
Clôture chantier
  ↓
Installation active dans le parc
  ↓
Facture solde
```

### Détail étape par étape

**Prospect**
Un particulier ou professionnel entre en contact (appel, showroom, site web).
Acteurs : Sophie (commerciale), Arnaud (patron).
Objet créé : Client (statut Prospect).

**Qualification**
Prise d'information : type d'appareil souhaité, type de logement,
configuration de la cheminée existante, budget approximatif.
Acteurs : Sophie, Thierry (artisan solo).

**Devis estimatif**
Premier chiffrage rapide, sans visite.
Basé sur des ouvrages types et des articles catalogue.
Objet créé : Devis (type Estimatif).
Durée cible : moins de 5 minutes avec les ouvrages pré-remplis.

**Visite technique**
Déplacement terrain pour mesurer, photographier, valider la faisabilité.
Acteurs : Yohan (poseur), Thierry.
Données collectées : hauteur conduit, nombre de coudes, diamètre sortie,
type de conduit adapté, amenée d'air, contraintes du site,
étanchéité requise ou non, puissance appareil envisagé.
Objet créé : Intervention (type VT).

> Ces données sont collectées dès V1 et préparent la note de calcul V3.

**Analyse technique**
Examen des données collectées lors de la visite.
L'artisan vérifie la cohérence de la configuration envisagée :
diamètre adapté, tirage suffisant, amenée d'air conforme.

**Note de calcul simplifiée — V3 si nécessaire**
Aide au dimensionnement disponible lorsque la configuration
nécessite une validation technique complémentaire.
Ce n'est pas une étape systématique.
Vérifie la cohérence : tirage, diamètre, amenée d'air, conformité DTU.
Non bloquante — aide métier, pas obligation réglementaire dans LIGNIA.

**Devis final**
Devis définitif intégrant les données de la visite technique.
Références articles exactes, remises fournisseurs appliquées,
TVA selon contexte (5,5% rénovation / 20% neuf).
Numérotation automatique. CGV attachées.
Objet créé : Devis (type Final).

**Signature**
Le client signe le devis.
Déclenchements automatiques :
- Lignes de devis figées (snapshot immuable)
- Facture d'acompte créée
- Installation créée (statut brouillon)
- Intervention de type Pose planifiable

**Commande fournisseur**
Bon de commande généré depuis les lignes du devis signé.
Regroupement automatique par fournisseur.
Références figées issues du snapshot du devis.

**Réception matériel**
Contrôle à la réception. Lien avec le bon de commande.

**Pose**
Intervention terrain. Acteurs : Yohan, Félicien.
Fiche d'intervention accessible sur mobile.
Photos avant/après. Compte-rendu post-intervention.
Statuts : Planifiée → En cours → Terminée.

**Mise en service**
Test de fonctionnement. Vérification tirage.
Explication client sur l'utilisation.

**Clôture chantier**
Saisie sur mobile par le poseur :
- Marque et modèle de l'appareil posé
- Numéro de série
- Diamètre du conduit réellement installé
- Date de mise en service
- Durée garantie fabricant (ex : 24 mois)
- Durée garantie artisan/pose (ex : 12 mois)
- Photos finales

Déclenchements automatiques :
- Installation activée dans le parc installé
- Garanties calculées et stockées
- Prochaine échéance de ramonage calculée (mise en service + 12 mois)
- Rappel client programmé

**Facture solde**
Conversion du devis signé en facture de solde.
Numérotation automatique. PDF avec logo et mentions légales.

---

## Cycle 2 — Entretien récurrent

```
Installation active dans le parc
  ↓
Rappel automatique (2 mois avant échéance)
  ↓
Email client (1 mois avant)
  ↓
Planification intervention (Ramonage ou Entretien)
  ↓
Intervention terrain
  ↓
Certificat / Compte-rendu
  ↓
Prochaine échéance mise à jour
  ↓
Facturation
```

**Ramonage**
Obligation légale annuelle pour les appareils à bois et granulés.
Acteur terrain : Luc (ramoneur).
Documents générés : Certificat de ramonage (PDF signé sur mobile).

**Entretien granulés**
Nettoyage annuel recommandé pour les poêles à granulés.
Acteur terrain : Yohan, technicien SAV.
Documents générés : Compte-rendu d'entretien.

**Contrat d'entretien — V2**
Abonnement annuel couvrant ramonage + entretien.
Génère automatiquement les interventions récurrentes.

**Aides et obligations réglementaires**
Le ramonage est une obligation légale annuelle (condition des assurances habitation).
L'entretien annuel des poêles granulés est recommandé par les fabricants
pour maintenir la garantie appareil.
LIGNIA génère les certificats nécessaires à ces deux obligations.

---

## Cycle 3 — SAV

```
Client appelle (panne ou problème)
  ↓
Identification de l'installation dans le parc
  ↓
Vérification statut garantie
  ↓
Diagnostic SAV
  ↓
Décision
  ↓
  ├── Résolution à distance (fin du cycle)
  ├── Intervention SAV
  └── Devis SAV
        ↓
      Planification intervention
        ↓
      Diagnostic terrain
        ↓
      Commande pièce détachée si nécessaire
        ↓
      Remplacement / Réparation
        ↓
      Compte-rendu
        ↓
      Facturation
```

**Vérification garantie**
LIGNIA affiche immédiatement pour l'installation concernée :
- Garantie fabricant : active jusqu'au JJ/MM/AAAA ou expirée
- Garantie artisan/pose : active ou expirée

Cette information détermine si l'intervention est facturée ou non.

**Diagnostic SAV**
Avant tout déplacement, l'artisan ou la secrétaire tente de qualifier
le problème à distance : appel téléphonique, échange email,
photos envoyées par le client, visio.
Objectif : éviter les déplacements inutiles et préparer l'intervention terrain.

Trois issues possibles après le diagnostic :
- **Résolution à distance** : le problème est résolu sans déplacement
- **Intervention SAV** : déplacement terrain sans devis préalable
- **Devis SAV** : chiffrage nécessaire avant intervention

**Pièces détachées**
Deux approches selon la fréquence d'utilisation :
- Pièces récurrentes : créées dans le catalogue privé de l'artisan
- Pièces rares ou première occurrence : ligne libre dans le devis SAV

---

## Cycle 4 — Remplacement

```
Installation active dans le parc
  ↓
Fin de vie ou obsolescence détectée
  ↓
Nouveau besoin identifié
  ↓
Projet remplacement créé
  ↓
Devis remplacement
  ↓
Signature
  ↓
Nouvelle installation
  ↓
Ancienne installation archivée
```

Le parc installé génère naturellement de futurs projets commerciaux.

Signaux déclencheurs possibles :
- Appareil en fin de vie (âge > durée de vie estimée) — détection automatique V3
- Panne répétée non économiquement réparable
- Évolution réglementaire (nouvelles normes, exigences MaPrimeRénov')
- Volonté du client de passer à un appareil plus performant
- Projet de rénovation plus large

> Le cycle 4 relie directement le parc installé (Cycle 2 et 3)
> au cycle commercial (Cycle 1).
> C'est lui qui transforme la gestion d'installation en source
> de chiffre d'affaires récurrent et proactif.

**Lien avec les aides à la rénovation**
Un remplacement d'appareil peut ouvrir droit à MaPrimeRénov'
si le nouvel appareil est éligible (base ADEME) et si l'artisan est certifié RGE.
LIGNIA peut pré-qualifier cette éligibilité depuis la fiche installation
lors de la détection de fin de vie.
Statut : vision cible V3.

---

## Liens entre les quatre cycles

```
CYCLE 1 (vente)       → crée l'Installation dans le parc
CYCLE 2 (entretien)   → lit le parc, met à jour les échéances
CYCLE 3 (SAV)         → lit le parc, lit les garanties
CYCLE 4 (remplacement)→ lit le parc, génère un nouveau Cycle 1
```

L'installation est l'objet qui relie les quatre cycles.
Sans installation correctement enregistrée à la clôture du chantier,
les cycles 2, 3 et 4 ne peuvent pas être automatisés.

---

## Acteurs selon le cycle

| Acteur | Cycle 1 | Cycle 2 | Cycle 3 | Cycle 4 |
|---|---|---|---|---|
| Arnaud (patron) | Validation, dashboard | Supervision | Supervision | Détection opportunités |
| Sophie (commerciale) | Devis, relances | — | — | Nouveau devis |
| Amélie (secrétaire) | Planning, facturation | Planning, rappels | Diagnostic, SAV, facturation | Coordination |
| Yohan / Félicien (poseurs) | Pose, clôture | Entretien granulés | Réparation | Nouvelle pose |
| Luc (ramoneur) | — | Ramonage, certificats | — | — |
| Thierry (artisan solo) | Tout | Tout | Tout | Tout |
| Michel (client équipé) | Prospect → client | Abonné entretien | Appelant panne | Futur acheteur |
