# LIGNIA — User Stories Complètes
> Document de référence — v3.3
> Claude Analytics + OpenAI + Analyse ServiceTitan — Mai 2026
> Pour : Claude Exec, Claude Read, Lovable, développeurs

---

## VISION PRODUIT

```
LIGNIA est un OS opérationnel pour entreprises bois énergie.

Pas un CRM générique. Pas un logiciel de devis. Pas un ERP.
Un outil conçu pour les réalités quotidiennes d'une entreprise
qui fait 1 à 5 M€ avec patron, assistante, poseurs et techniciens SAV.
```

**4 PILIERS — dans l'ordre de valeur pour le client :**

```
PILIER 1 — CRM + DEVIS
  C'est ce qui vend LIGNIA.
  Gain de temps devis, catalogue, relances, pipeline commercial.
  70% du CA des clients vient de la vente + installation.

PILIER 2 — PLANNING + CHANTIER + MOBILE
  C'est ce qui fait tourner l'entreprise au quotidien.
  La secrétaire orchestre, les poseurs exécutent sur mobile.
  La douleur principale : "Qui va où, quand, avec quoi ?"

PILIER 3 — CATALOGUE + COMMANDE FOURNISSEUR
  C'est ce qui différencie LIGNIA.
  100 fournisseurs, remises par famille, import industriel,
  bon de commande depuis le devis signé.

PILIER 4 — PARC INSTALLÉ + ENTRETIEN + SAV
  C'est ce qui crée la récurrence.
  Contrats entretien granulés, ramonage annuel, SAV.
  Moteur de long terme, pas argument de vente V1.
```

---

## ICP (IDEAL CUSTOMER PROFILE)

```
ICP PRIORITAIRE — Entreprise bois énergie multi-utilisateurs
  CA : 1 à 5 M€
  Équipe : patron + secrétaire/ADV + 1-2 commerciaux + 2-5 poseurs + SAV
  Répartition CA : 70% pose, 20% entretien granulés, 10% ramonage
  Douleurs principales :
    - Devis lents et mal suivis
    - Planning illisible et verbal
    - Commandes fournisseurs manuelles
    - SAV sans historique

ICP SECONDAIRE — Artisan installateur solo
  CA : 200k-800k€
  Équipe : seul ou avec 1-2 collaborateurs
  Fait : devis + installation + ramonage + entretien

ICP TERTIAIRE — Ramoneur pur
  CA : 50k-300k€
  Équipe : 1-3 personnes
  Fait : ramonage + entretien + commande pièces SAV
  N'utilise pas le module devis installation
```

---

## ACTIFS STRATÉGIQUES DE LIGNIA

```
ACTIF #1 — PARC INSTALLÉ
  30 000 installations historisées = actif impossible à reproduire
  Base de récurrence : ramonage, entretien, SAV, remplacement
  Donnée propriétaire — VALEUR V2/V3

ACTIF #2 — CATALOGUE NORMALISÉ MULTI-FOURNISSEURS
  100 fournisseurs, 4 domaines, pipeline d'import industriel
  Recherche contextualisée par catalog_domain
  Remises par famille configurées par artisan — VALEUR V1

ACTIF #3 — HISTORIQUE SAV & INTERVENTIONS
  Timeline complète par installation sur 10-20 ans
  Preuve légale, diagnostic, recommandations — VALEUR V2/V3
```

---

## CE QUE SERVICETITAN APPREND À LIGNIA — SANS LE COPIER

```
PATTERN 1 — Appointment comme objet métier unique
  ServiceTitan : Appointment (Scheduled/Dispatched/Working/Hold/Done/Canceled)
  LIGNIA : Intervention = tout RDV terrain (VT, pose, ramonage, SAV, entretien)
  Impact : planning unifié, notification client unifiée, historique complet

PATTERN 2 — Contacts multiples par client
  ServiceTitan : Customer → Contacts + ContactMethods + ContactPreferences
  LIGNIA : Client → Contacts (propriétaire, comptable, gardien, architecte)
  Impact : facturer Mme Dupont, appeler M. Dupont, prévenir le gardien

PATTERN 3 — Garantie fabricant ≠ garantie prestataire
  ServiceTitan : manufacturerWarrantyStart/End + serviceProviderWarrantyStart/End
  LIGNIA : warranty_manufacturer_end + warranty_provider_end sur l'installation
  Impact : savoir immédiatement en SAV si la panne est sous garantie

PATTERN 4 — Historique des prix (Pricebook versioning)
  ServiceTitan : ClientSpecificPricing avec rate sheets versionnés
  LIGNIA : import_batch_id + import_date = traçabilité du tarif utilisé
  Impact : audit légal, litige client, comparaison tarifs annuels

PATTERN 5 — AP Bills pour les achats fournisseurs
  ServiceTitan : AP Bills + purchaseOrderId + MarkAsExported vers Sage/Pennylane
  LIGNIA : Bon de commande → export vers logiciel comptable
  Impact : clôture le cycle devis → commande → facture fournisseur → comptabilité

PATTERN 6 — Le centre n'est pas le client, c'est l'équipement installé
  ServiceTitan : Customer → Location → InstalledEquipment → History
  LIGNIA : Client → Site → Installation → Timeline
  Impact en V2/V3 : parc intelligent, suggestion pièces, alertes remplacement

CE QUE LIGNIA NE FERA PAS
  ❌ Dispatch GPS techniciens   ❌ Flotte véhicules   ❌ Payroll
  ❌ Call center                ❌ Campagnes marketing ❌ Comptabilité interne
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
INVARIANT 9   technology_type ≠ supplier_family_code
```

**RÈGLES D'ARCHITECTURE (évolutives) :**

```
RÈGLE A — catalog_domain sépare les univers produit
  Valeurs : FUMISTERIE | APPAREIL | PRESTATION | PIECE_DETACHEE
  Futures : CONSOMMABLE | COMBUSTIBLE | EPI | OUTILLAGE
  La recherche filtre toujours par domain selon le contexte

RÈGLE B — Installation = actif persistant, le devis est transitoire
  L'installation porte la garantie, l'historique, les interventions
  Elle survit au devis, à la facture, au projet

RÈGLE C — Mobile first pour le terrain, Desktop first pour l'administratif
  Poseurs et ramoneurs : PWA mobile, offline obligatoire
  Secrétaire, patron, commercial : desktop, fonctionnalités complètes
```

---

## PÉRIMÈTRE PRODUIT — 4 domaines catalog_domain

```
FUMISTERIE      Conduits, accessoires, sorties de toit, tubage
                Fournisseurs : Poujoulat, Lorflex, Joncoux, Dinak, Bofill...

APPAREIL        Poêles bois/granulés, inserts, chaudières
                Source : ADEME + catalogues fabricants

PRESTATION      Pose, ramonage, entretien, SAV, main d'œuvre
                Source : catalogue privé artisan

PIECE_DETACHEE  Joints, vitres, bougies, cartes, pressostats, sondes
                V1 : catalogue privé artisan + ligne libre
                V3 : import catalogues fabricants (MCZ, Edilkamin...)
```

---

## PERSONAS

### ICP Prioritaire — Entreprise bois énergie multi-utilisateurs

| ID | Prénom | Rôle | Ce qu'il fait dans LIGNIA |
|---|---|---|---|
| PER003a | Arnaud | Patron | Dashboard, validation devis, planning équipe |
| PER003b | Sophie | Commerciale showroom | Devis estimatifs, suivi prospects, relances |
| **PER003d** | **Amélie** | **Secrétaire / ADV** | **Hub opérationnel : planning, relances, facturation, commandes** |
| PER003c | Yohan/Félicien | Poseurs terrain | Fiche chantier mobile, photos, signature, clôture |

### ICP Secondaire — Artisan solo

| ID | Prénom | Rôle |
|---|---|---|
| PER001 | Thierry | Artisan installateur solo — fait tout |

### ICP Tertiaire — Ramoneur pur

| ID | Prénom | Rôle |
|---|---|---|
| PER002 | Luc | Ramoneur — planning + certificats + pièces SAV |

### Clients particuliers

| ID | Prénom | Rôle |
|---|---|---|
| PER009P | Claire | Prospect particulier |
| PER009C | Michel | Client équipé — suivi installation, garanties |

### Extension réseau (P1/P2)

| ID | Prénom | Rôle |
|---|---|---|
| PER004 | Joris | Franchisé de marque |
| PER011 | Sabrina | Comptable externe |
| PER012 | Claire-Marie | Responsable réseau franchise |

### Admin LIGNIA

| ID | Rôle |
|---|---|
| SUPER_ADMIN | Solopreneur — imports, mapping, maintenance globale |
| TENANT_ADMIN | Gérant artisan — remises, fournisseurs, paramétrage |
| TENANT_USER | Vendeur, poseur, secrétaire — usage quotidien |

**Note sur Amélie (PER003d) :**
Dans les entreprises bois énergie à 1 M€+, la secrétaire est le hub opérationnel.
Elle gère : appels entrants, planning, relances devis, pièces SAV, facturation,
classement. LIGNIA doit être conçu pour elle autant que pour le patron ou le poseur.

---

## LES 4 CYCLES PRODUIT

```
CYCLE 1 — Vente et installation (70% du CA)
  Lead → Qualification → Estimatif → Visite → Définitif → Signé → Chantier → Facture
  Acteurs bureau : Sophie + Amélie
  Acteurs terrain : Yohan/Félicien

CYCLE 2 — Entretien récurrent (20% du CA)
  Installation → Appointment (entretien/ramonage) → Certificat → Rappel → Facturation
  Acteurs : Luc + Amélie

CYCLE 3 — SAV (10% du CA + fidélisation)
  Panne → Appointment (SAV) → Diagnostic → Pièce → Facture → Timeline installation
  Acteurs : Thierry/Yohan + Amélie

CYCLE 4 — Maintenance catalogue (SUPER_ADMIN)
  Import → Vérif → Remises → Monitoring
```

---

## SÉPARATION V1 / V2 / V3

```
V1 — PILIER 1 + PILIER 2 + début PILIER 3
  [CRM + Devis]
    Import Poujoulat + Lorflex (fumisterie)
    Devis estimatif et final avec remise globale fournisseur
    Recherche catalogue filtrée par catalog_domain
    Kits / Ouvrages pré-remplis
    Catalogue privé artisan (lignes maison, pièces SAV basiques)
    Contacts multiples par client
    Relance automatique devis (J+7, J+15, J+30)
    Appareils dans devis (heating_appliances → QuoteEditor)

  [Planning + Chantier + Mobile]
    Intervention (Appointment) comme objet unique — VT/Pose/Ramonage/SAV/Entretien
    Vue planning semaine/mois par technicien
    Fiche chantier mobile offline (PWA)
    Enregistrement appareil + garanties à la clôture

  [Catalogue + Ramonage]
    Fournisseurs actifs/inactifs par tenant
    Import base ADEME → heating_appliances
    Cycle ramonage simple (planning + certificat mobile)

V2 — PILIER 4 + fin PILIER 2 + fin PILIER 3
  Remises par famille (supplier_family_code)
  Bon de commande fournisseur + export AP Bills vers Pennylane/Sage
  Comparaison versions tarifaires
  Facturation et relances automatiques
  Portail client (signature, suivi)
  Timeline installation complète
  Site/Location comme objet persistant
  Parc installé complet (multi-appareils, multi-sites)
  Permissions multi-utilisateurs + rôles
  Compatibilité appareil ↔ fumisterie
  Tags métier
  Tarif contrat d'entretien (MemberPrice)
  Contrat entretien granulés récurrent

V3 — RÉCURRENCE + RÉSEAU + IA
  Assistant vocal devis chantier
  Export FEC / Facture-X
  Réseau marques / franchises
  LIGNIA Manufacturer
  Parc installé intelligent (suggestion pièces, alertes remplacement)
  Catalogue SAV fabricants (MCZ, Edilkamin, Jotul...)
  Mini-ERP complet
```

---

## EXIGENCES NON-FONCTIONNELLES

```
PERFORMANCE
  Recherche catalogue       < 500ms (filtré par domain)
  Ajout article au devis    < 300ms
  Chargement fiche chantier < 1s (mode offline)

MOBILE / PWA — terrain
  Fiche intervention : accessible OFFLINE obligatoire
  Formulaire clôture chantier : fonctionnel sans réseau
  Signature client : offline
  Synchronisation à la reconnexion

DESKTOP — bureau
  CRM, devis, catalogue, planning, facturation : desktop first
  Navigation rapide entre clients, projets, devis

INTÉGRATIONS TIERCES
  Comptabilité : Pennylane / Sage (export AP Bills)
  Email / SMS : relances et rappels
  Signature électronique : portail client V2
  ADEME : import mensuel
```

---

## BLOC CRM — CLIENTS, CONTACTS, LEADS, PIPELINE

### US-CRM-01 — Contacts multiples par client (V1)
**En tant que Secrétaire (Amélie), je veux gérer plusieurs interlocuteurs par client.**

```
BESOIN MÉTIER
  M. Dupont : propriétaire → appeler pour RDV terrain
  Mme Dupont : comptable → envoyer les factures
  Le gardien : prévenir par SMS avant intervention
  L'architecte : copier sur les devis de travaux

  C'est la réalité des chantiers. Un seul contact = erreurs et oublis.

MODÈLE
  customer → contacts (N)
  contact : prénom, nom, rôle, is_primary
  contact_method : type (email/tel/sms), préférence (facturation/rdv/info)

CRITÈRES D'ACCEPTATION V1
✅ N contacts par client (minimum 2)
✅ Contact principal identifié
✅ Email facturation distinct de l'email de contact RDV
✅ Rôle libre (propriétaire, comptable, locataire, architecte...)
```

---

### US-CRM-02 — Tags métier sur clients et installations (V2)
**En tant qu'Amélie, je veux filtrer rapidement mes clients par tag.**

```
EXEMPLES DE TAGS
  VIP — client premium, priorité intervention
  RGE requis — installation éligible aux aides
  Prescripteur — architecte, agent immo
  Litige — contentieux en cours
  Contrat entretien — abonné au contrat annuel

CRITÈRES D'ACCEPTATION V2
✅ Tags configurables par TENANT_ADMIN (pas hardcodés)
✅ Filtre par tag dans la liste clients
```

---

### US-CRM-03 — Site / Location persistant (V2)

```
BESOIN MÉTIER
  M. Dupont a une maison principale et un chalet.
  Le chalet a sa propre installation, son historique, ses échéances.
  Si M. Dupont vend la maison, le chalet reste.

CRITÈRES D'ACCEPTATION V2
✅ Site persiste après clôture du projet
✅ N sites par client
✅ Historique installations par site
```

---

### US-CRM-04 — Relance automatique devis (V1)
**En tant qu'Amélie, je veux ne plus oublier de relancer les devis sans réponse.**

```
BESOIN MÉTIER
  Amélie gère 30-50 devis en cours. Elle ne peut pas tout suivre manuellement.
  Un devis sans réponse depuis 2 semaines = opportunité en train de mourir.

SCÉNARIO
  Devis envoyé → J+7 : notification Amélie "Relancer M. Dupont ?"
              → J+15 : email automatique client + notification Amélie
              → J+30 : devis proposé à archiver

CRITÈRES D'ACCEPTATION V1
✅ Vue "Devis à relancer" dans le dashboard Amélie
✅ Notification interne à J+7
✅ Email client automatique à J+15 (configurable)
✅ Délais configurables par TENANT_ADMIN
```

---

### US-CRM-05 — Pipeline commercial (V1)
**En tant qu'Arnaud, je veux voir l'état de mon activité commerciale.**

```
CRITÈRES D'ACCEPTATION V1
✅ CA signé / en cours / perdu ce mois
✅ Taux de transformation devis
✅ Pipeline par statut (Prospect / Qualifié / Devis envoyé / Signé)
✅ Top articles et fournisseurs
```

---

## BLOC PLN — PLANNING ET INTERVENTIONS

### US-PLN-01 — Objet Intervention unique (V1 — PILIER 2 CENTRAL)
**En tant qu'Amélie, je veux planifier toutes les interventions depuis un seul endroit.**

```
BESOIN MÉTIER
  Aujourd'hui Amélie gère le planning à la voix ou sur un agenda papier.
  Elle ne sait pas qui est libre, ni si Yohan a le bon matériel.
  La douleur quotidienne des entreprises 1M€ : "Qui va où, quand, avec quoi ?"

  ServiceTitan a résolu ça avec un seul objet : Appointment.
  Pour LIGNIA : une Intervention = tout RDV terrain, quel que soit son type.

TYPES D'INTERVENTION
  VT        → Visite Technique (avant devis)
  POSE      → Installation (après devis signé)
  RAMONAGE  → Ramonage annuel
  ENTRETIEN → Entretien préventif granulés
  SAV       → Dépannage / réparation
  AUTRE     → Déplacement divers

STATUTS
  PLANIFIEE → CONFIRMEE → EN_COURS → TERMINEE
  ANNULEE (avec motif) | REPORTEE (avec nouvelle date)

DONNÉES D'UNE INTERVENTION
  type, statut, technicien(s), client, adresse
  date_heure_debut, date_heure_fin
  notes_avant (briefing pour le technicien)
  notes_apres + photos (compte-rendu terrain)
  installation_id (nullable — lié au parc installé si SAV/entretien)

CRITÈRES D'ACCEPTATION V1
✅ Créer une intervention en 30 secondes (bureau ou mobile)
✅ Vue planning semaine par technicien (desktop Amélie)
✅ Alerte double-booking
✅ Fiche intervention accessible OFFLINE (PWA technicien)
✅ Compte-rendu post-intervention (notes + photos)
```

---

### US-PLN-02 — Vue planning bureau (V1 — Amélie)
**En tant qu'Amélie, je veux voir et gérer le planning de toute l'équipe.**

```
CRITÈRES D'ACCEPTATION V1
✅ Vue calendrier semaine / mois
✅ Par technicien (filtre individuel ou vue globale)
✅ Couleurs par type d'intervention
✅ Glisser-déposer pour replanifier
✅ Accès desktop principal
```

---

### US-PLN-03 — Fiche intervention mobile (V1 — Yohan, Luc)
**En tant que Poseur (Yohan), je veux avoir ma journée sur mon téléphone.**

```
BESOIN MÉTIER
  Yohan n'ouvre pas un CRM complet.
  Il ouvre : sa journée, son chantier, ses photos, son bon d'intervention.
  Il doit pouvoir travailler sans réseau (chantier en zone blanche).

CONTENU DE LA FICHE (sur mobile)
  Client + adresse + accès (code portail, digicode...)
  Type d'intervention + notes du briefing (Amélie a rempli)
  Matériel à apporter (issu du devis ou de la commande)
  Photos avant/après
  Compte-rendu post-intervention
  Signature client

CRITÈRES D'ACCEPTATION V1 — MOBILE FIRST
✅ Accessible OFFLINE (PWA, service worker)
✅ Interface simplifiée — pas de menus complexes
✅ Photos en 2 clics
✅ Signature client sur écran tactile
✅ Sync automatique à la reconnexion
```

---

## BLOC APP — APPAREILS ET PARC INSTALLÉ

### US-APP-01 — Ajouter un appareil au devis (V1 — PRIORITÉ HAUTE)
**En tant que Sophie, je veux ajouter un poêle au devis et voir la fumisterie compatible.**

```
CRITÈRES D'ACCEPTATION V1
✅ heating_appliances branché au CatalogPopover (onglet "Appareils")
✅ Appareil ajouté avec catalog_domain='APPAREIL'
✅ Prix via resolve_item_price
✅ Diamètre sortie stocké dans le snapshot
```

---

### US-APP-02 — Suggestion fumisterie compatible (V2)

```
CRITÈRES D'ACCEPTATION V2
✅ Filtre automatique sur diamètre après ajout appareil
✅ Warning non bloquant si incompatibilité
```

---

### US-APP-03 — Enregistrement appareil + garanties à la clôture (V1)
**En tant que Yohan, je ferme le chantier et enregistre les garanties.**

```
BESOIN MÉTIER (ServiceTitan Equipment Systems — warranty fields)
  Quand Michel appellera dans 18 mois pour une panne,
  Amélie doit voir en 2 secondes : "sous garantie fabricant ? oui/non ?"
  Sans cette info, elle envoie un technicien pour rien — coût direct.

DONNÉES SAISIES (sur mobile, offline possible)
  Marque + modèle, numéro de série
  Diamètre buse réel installé
  Date mise en service
  Garantie fabricant : X mois (ex: 24)
  Garantie artisan/pose : X mois (ex: 12)
  Photos finales

CALCULS AUTOMATIQUES
  warranty_manufacturer_end = mise_en_service + garantie_fabricant_mois
  warranty_provider_end = mise_en_service + garantie_artisan_mois
  next_sweep_date = mise_en_service + 12 mois

CRITÈRES D'ACCEPTATION V1
✅ Saisie terrain < 2 minutes (PWA offline)
✅ Badge "SOUS GARANTIE" / "HORS GARANTIE" sur la fiche installation
✅ Alerte automatique en SAV si sous garantie
```

---

### US-APP-04 — Parc installé et timeline (V1/V2)
**En tant qu'Amélie, quand Michel appelle, je vois son installation en 3 secondes.**

```
CONTENU DE LA FICHE INSTALLATION
  Appareil : marque, modèle, N° série, date pose
  Garanties : fabricant (expire le...) + artisan (expire le...)
  Dernier ramonage + prochaine échéance
  Actions rapides : [Créer intervention] [Créer devis SAV] [Voir timeline]

TIMELINE V2
  Toutes les interventions, devis, commandes, SAV liés
  sur 10-20 ans = actif inestimable pour le SAV et la fidélisation

CRITÈRES D'ACCEPTATION V1
✅ Fiche installation en lecture depuis la fiche client
✅ Garanties visibles immédiatement
✅ Lien direct vers création d'une intervention

CRITÈRES D'ACCEPTATION V2
✅ Timeline chronologique complète
✅ Multi-appareils par site
```

---

### US-APP-05 — Fin de vie estimée (V3)

```
CRITÈRES V3
✅ Alerte si âge appareil > durée de vie estimée
✅ Vue "Appareils à remplacer dans 12 mois" pour Sophie
```

---

## BLOC SAV — SERVICE APRÈS-VENTE

### US-SAV-01 — Créer un devis SAV depuis la fiche installation (V1)
**En tant qu'Amélie, quand un client appelle en panne, je crée le devis SAV en 2 clics.**

```
SCÉNARIO RÉEL
  Michel appelle : "Mon poêle MCZ fait une erreur A05."
  Amélie ouvre la fiche Michel.
  Elle voit : MCZ Ego, installé 06/02/2024, garantie fabricant ✅ jusqu'au 06/02/2026.
  Elle crée un devis SAV : tout est pré-rempli (client, adresse, appareil).
  Elle ajoute la pièce depuis le catalogue privé ou en ligne libre.
  Elle programme une intervention SAV pour Yohan.

RÈGLE V1
  Catalogue privé artisan pour les pièces récurrentes
  Ligne libre pour les pièces rares
  Pas d'import massif de pièces détachées

CRITÈRES D'ACCEPTATION V1
✅ Devis SAV créé en < 3 minutes depuis la fiche client
✅ Statut garantie affiché AVANT de créer le devis
✅ Intervention SAV créée et planifiée dans la foulée
```

---

### US-SAV-02 — Catalogue privé pièces détachées (V1)

```
EXEMPLES
  "Joint porte MCZ Ego" → 18€
  "Vitre Edilkamin 40x25" → 45€

MODÈLE : catalog_items (supplier_name='TENANT_PRIVATE', catalog_domain='PIECE_DETACHEE')

CRITÈRES V1
✅ Pièce créée en 30 secondes
✅ catalog_domain='PIECE_DETACHEE' → invisible dans la recherche fumisterie
```

---

### US-SAV-03 — Catalogue SAV fabricants (V3)

```
CRITÈRES V3 : Import pièces MCZ, Edilkamin, Jotul → recherche "MCZ Ego" → pièces compatibles
```

---

## BLOC D — DEVIS

### US-D01 — Créer un devis estimatif (V1)
**En tant que Sophie, je crée un devis complet en < 5 minutes.**

```
DEVIS RÉEL LIGNIA :
  Poêle Jotul F163 (APPAREIL)
  + Ouvrage "Raccordement étanche Ø80/130" (8 lignes insérées en 1 clic)
  + Conduit concentrique Poujoulat (FUMISTERIE)
  + Main d'œuvre pose (PRESTATION)

CRITÈRES V1
✅ Devis en < 5 min grâce aux ouvrages pré-remplis
✅ Appareils + fumisterie + prestations dans le même devis
✅ Prix correct (resolve_item_price)
✅ TVA correcte (5.5% rénovation / 20% neuf)
```

---

### US-D02 — Convertir estimatif en devis final (V1)

```
CRITÈRES V1 : Duplication, lignes modifiables, prix recalculés, numérotation distincte
```

---

### US-D03 — Recherche catalogue contextualisée (V1)

```
CRITÈRES V1
✅ Recherche fulltext < 500ms
✅ Filtrage par fournisseurs actifs + catalog_domain
✅ Onglets : Appareils | Fumisterie | Prestations | SAV/Pièces | Maison
```

---

### US-D04 — Remise fournisseur automatique (V1)

```
CRITÈRES V1 : Remise appliquée à l'ajout, marge interne visible (jamais dans PDF)
```

---

### US-D05 — Signer un devis (V1)

```
CE QUI SE PASSE
  1. quote_status → signed
  2. Facture acompte créée automatiquement
  3. Installation créée dans le parc installé (status=draft)
  4. quote_lines = snapshot immuable (INVARIANT 4)
```

---

### US-D06 — Créer un ouvrage / kit (V1)
**En tant que Sophie, je veux réutiliser mes configurations types.**

```
BESOIN MÉTIER — PILIER 1 CRITIQUE
  "Raccordement granulés étanche Ø80/130" : ouvrage de 8 lignes.
  Sans ouvrage : Sophie cherche 8 fois. Avec ouvrage : 2 clics.
  C'est l'argument de vente #1 pour le gain de temps devis.

CRITÈRES V1
✅ Créer ouvrage depuis devis existant (1 clic)
✅ Insérer ouvrage = insérer toutes ses lignes avec prix recalculés
✅ Catalogue d'ouvrages partagé dans le tenant
```

---

### US-D07 — Fiche technique ADEME dans le PDF (V2)

```
CRITÈRES V2 : Données ADEME (puissance, rendement, Flamme Verte) dans le PDF devis
```

---

## BLOC C — CATALOGUE ET IMPORTS

### US-C01 à C03 — Import fournisseurs (V1)

```
RÈGLES : supplier_ref brut, cost_price jamais importé, catalog_domain par fournisseur
CRITÈRES : taux ignorés < 10%, 0 cost_price, mapping réutilisable
```

---

### US-C04 — Comparer versions tarifaires (V2)

```
CRITÈRES V2 : Rapport écarts 2 batch_id, alerte > 15%, GO/NO GO avant import
```

---

### US-C05 — Fournisseurs actifs par tenant (V1)

```
CRITÈRES V1 : Activation/désactivation, recherche filtrée sur actifs uniquement
```

---

### US-C06 — Import base ADEME (V1)

```
SOURCE : xlsx mensuel ADEME — catalog_domain='APPAREIL', is_central=true
CRITÈRES V1 : Appareils dans CatalogPopover onglet "Appareils"
```

---

## BLOC P — PROJET ET CHANTIER

### US-P01 à P04 — Cycle projet (V1)

```
US-P01 Créer un projet  → lié à un client + site, statuts prospect→completed
US-P02 Visite technique → Intervention VT, formulaire mobile offline, photos
US-P03 Suivre projets   → Vue pipeline, montant HT par stade
US-P04 Clôturer         → Attestation, numéro série + garanties (→ US-APP-03), facturation
```

---

## BLOC R — RAMONAGE

### US-R01 à R03 — Cycle ramonage (V1)

```
US-R01 Tournée → Liste clients en retard, interventions RAMONAGE créées, SMS client
US-R02 Certifier → Formulaire < 2 min, signature, PDF, prochaine échéance MAJ
US-R03 Rappels  → Notif 2 mois avant, email client 1 mois avant (configurable)
```

---

## BLOC O — COMMANDE FOURNISSEUR (V2)

### US-O01 — Bon de commande depuis devis signé (V2)

```
RÈGLE CRITIQUE : BC utilise supplier_ref_snapshot (pas catalog_items)

CRITÈRES V2
✅ Regroupement par fournisseur depuis les lignes du devis
✅ Quantités agrégées si même référence
✅ Export PDF ou email commercial
```

---

### US-O02 — Export AP Bills comptabilité (V2)
**En tant que Sabrina, je veux exporter les achats fournisseurs vers Pennylane.**

```
BESOIN MÉTIER : fermer le cycle achat → paiement fournisseur → comptabilité

CRITÈRES V2
✅ Export CSV compatible Pennylane / Sage
✅ Statut "exporté" anti-doublons
✅ N° facture fournisseur enregistrable
```

---

## BLOC FAC — FACTURATION

### US-FAC-01 — Conversion devis → facture (V2)

```
CRITÈRES V2 : 1 clic, numérotation auto, TVA 5.5%/20%, PDF propre
```

---

### US-FAC-02 — Export FEC / Facture-X (V3)

```
CRITÈRES V3 : FEC compatible logiciels comptables, format Facture-X, séparation installation/SAV
```

---

## BLOC MAIN — MAINTENANCE SUPER_ADMIN

### US-MAIN-01 — Monitoring imports (V2)

```
CRITÈRES V2 : import_runs avec status, counts, timestamps, répartition par domain
```

---

### US-MAIN-02 — Rollback import (V1)

```
CRITÈRES V1 : Rollback par batch_id, devis signés non affectés
```

---

## BLOC NORM — GOUVERNANCE NORMALISATION (V2)

```
US-NORM-01 : Vue normalization_status='needs_review' par domain
US-NORM-02 : Familles canoniques LIGNIA (conduit_double_paroi, tubage_flexible...)
```

---

## BLOC V — VOIX ET IA (V3)

```
US-V01 : "Coude 45° inox 150 Poujoulat" → extraction entités → search → ajout < 2s
         Prérequis : angle_deg + diameter_inner_mm remplis (V2 normalization job)
```

---

## BLOC RÉSEAU — FRANCHISE (V3)

```
US-RESEAU-01 : Vue agrégée multi-tenants pour PER012 (Jotul France)
               Appareils vendus, taux entretien, données anonymisées
```

---

## RÉFÉRENCES TECHNIQUES

### Champs catalog_items

| Champ | Usage | Statut |
|---|---|---|
| supplier_ref | Code fournisseur brut (INVARIANT 1) | ✅ |
| catalog_domain | Domaine produit (RÈGLE A) | ⚠️ À migrer V1 |
| supplier_name | Distributeur (INVARIANT 8) | ✅ |
| manufacturer_name | Fabricant réel (INVARIANT 8) | ✅ |
| unit_price_ht | Prix public (INVARIANT 3) | ✅ |
| cost_price | TOUJOURS NULL + CHECK SQL (INVARIANT 2) | ✅ |
| technology_type | Techno construction (INVARIANT 9) | ⚠️ Null Poujoulat V1 |
| supplier_family_code | Famille commerciale | ❌ À créer V2 |
| diameter_inner_mm | Diamètre → compatibilité | ⚠️ Null Poujoulat V1 |
| angle_deg | Angle → voix | ⚠️ Null Poujoulat V1 |
| unit | Unité (u/m/m²/forfait/h) | ⚠️ Null Poujoulat V1 |
| is_active | Archivage | ✅ |
| import_batch_id | Traçabilité / rollback / historique prix | ✅ |

### Champs installation (parc installé)

| Champ | Usage | Source |
|---|---|---|
| appliance_id | Lien vers heating_appliances | Clôture chantier |
| serial_number | N° série — obligatoire pour garantie | Saisie technicien mobile |
| installed_on | Date mise en service | Saisie technicien mobile |
| warranty_manufacturer_end | Fin garantie fabricant | Calculé auto |
| warranty_provider_end | Fin garantie artisan | Calculé auto |
| next_sweep_date | Prochaine échéance ramonage | Calculé auto |
| diameter_installed_mm | Diamètre réel posé | Saisie technicien mobile |

### Valeurs catalog_domain

| Valeur | Usage | Recherche |
|---|---|---|
| FUMISTERIE | Conduits, accessoires, tubage | Mode devis installation |
| APPAREIL | Poêles, inserts, chaudières | Mode devis installation |
| PRESTATION | Pose, ramonage, entretien | Mode devis (tous) |
| PIECE_DETACHEE | Joints, vitres, cartes électroniques | Mode SAV uniquement |

### Champs quote_lines (snapshots INVARIANT 4)

| Champ | Rôle | Statut |
|---|---|---|
| supplier_ref_snapshot | Code fournisseur figé | ✅ |
| supplier_name_snapshot | Fournisseur figé | ✅ |
| unit_cost_price | Coût net figé (marge) | ✅ |
| metadata.pricing | Pricing complet figé | ✅ |
| vat_rate | TVA figée | ✅ |

---

## DETTE TECHNIQUE — PAR PRIORITÉ

### CRITIQUE — Avant import Lorflex

| Dette | Action |
|---|---|
| catalog_domain absent de catalog_items | Migration SQL + DEFAULT 'FUMISTERIE' |
| catalog_domain absent de map_supplier.py | Patch script + tous les SUPPLIER_CONFIGS |

### PILIER 1 — V1 imminent

| Dette | Action |
|---|---|
| heating_appliances non branché au QuoteEditor | Lovable — CatalogPopover onglet Appareils |
| Relance devis automatique manquante | Backend + dashboard Amélie |
| Contacts multiples par client manquants | Modèle + UI fiche client |

### PILIER 2 — V1 planning/terrain

| Dette | Action |
|---|---|
| Objet Intervention non formalisé | Table appointments, types, statuts |
| Fiche intervention mobile offline | PWA service worker obligatoire |
| Garanties non stockées sur l'installation | Champs warranty à la clôture chantier |

### V2

| Dette | Action |
|---|---|
| technology_type null Poujoulat | Normalization job |
| diameter_inner_mm null | Normalization job |
| supplier_family_code absent | Avant remises par famille |
| Timeline installation | V2 |
| Site/Location persistant | V2 |
| AP Bills / export comptable | V2 |
| Tests E2E Playwright | Avant terrain |
| Wrap RLS (SELECT auth.jwt()) | Avant 50k articles |
| Index tenant_supplier_discounts | Avant 200 remises |

### V3

| Dette | Action |
|---|---|
| Export FEC / Facture-X | V3 |
| Catalogue SAV fabricants | V3 |
| Predicted replacement date | V3 |
| Réseau / franchise | V3 |
