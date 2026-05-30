# LIGNIA — User Stories Complètes
> Document de référence — v3.4
> Claude Analytics + OpenAI + ServiceTitan + Evoliz — Mai 2026
> Pour : Claude Exec, Claude Read, Lovable, développeurs

---

## VISION PRODUIT

```
LIGNIA est un OS opérationnel pour entreprises bois énergie.

Pas un CRM générique. Pas un logiciel de devis. Pas un ERP.
Un outil conçu pour les réalités quotidiennes d'une entreprise
qui fait 1 à 5 M€ avec patron, secrétaire/ADV, commerciaux et poseurs.
```

**4 PILIERS — dans l'ordre de valeur pour le client :**

```
PILIER 1 — VENTE ET ORGANISATION COMMERCIALE
  C'est ce qui vend LIGNIA.
  Gain de temps devis, ouvrages pré-remplis, catalogue, relances automatiques.
  70% du CA des clients vient de la vente + installation.

PILIER 2 — PLANNING + CHANTIER + MOBILE
  C'est ce qui fait tourner l'entreprise au quotidien.
  La secrétaire orchestre depuis son bureau, les poseurs exécutent sur mobile.
  La douleur principale : "Qui va où, quand, avec quoi ?"

PILIER 3 — CATALOGUE + COMMANDE FOURNISSEUR
  C'est ce qui différencie LIGNIA.
  Architecture compatible 100+ fournisseurs, remises par famille,
  bon de commande depuis le devis signé, export comptable.

PILIER 4 — PARC INSTALLÉ + ENTRETIEN + SAV
  C'est ce qui crée la récurrence.
  Contrats entretien granulés, ramonage annuel, SAV avec historique.
  Moteur de long terme — valeur V2/V3, pas argument de vente V1.
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
    - Comptabilité qui prend du temps à la clôture

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
ACTIF #1 — CATALOGUE NORMALISÉ MULTI-FOURNISSEURS
  Architecture compatible 100+ fournisseurs, 4 domaines, pipeline d'import industriel
  Recherche contextualisée par catalog_domain — VALEUR V1 (argument de vente immédiat)
  Remises par famille configurées par artisan

ACTIF #2 — PARC INSTALLÉ
  OBJECTIF STRATÉGIQUE : constituer le plus grand parc installé bois énergie indépendant
  Base de récurrence : ramonage, entretien, SAV, remplacement
  Donnée propriétaire — VALEUR V2/V3 (se construit avec chaque installation clôturée)

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

PATTERN 4 — Historique des prix (Pricebook versioning)
  ServiceTitan : ClientSpecificPricing avec rate sheets versionnés
  LIGNIA : import_batch_id = traçabilité du tarif utilisé par devis

PATTERN 5 — AP Bills pour les achats fournisseurs
  ServiceTitan : AP Bills + MarkAsExported vers Sage/Pennylane
  LIGNIA : Bon de commande → export comptable fournisseurs

PATTERN 6 — Le centre n'est pas le client, c'est l'équipement installé
  ServiceTitan : Customer → Location → InstalledEquipment → History
  LIGNIA : Client → Site → Installation → Timeline (V2/V3)
```

---

## CE QU'EVOLIZ APPREND À LIGNIA — COMPATIBILITÉ COMPTABLE FRANÇAISE

```
Evoliz est un logiciel comptable français (API v1.43).
Il révèle les patterns de rigueur comptable que LIGNIA doit prévoir
dès V1 dans son modèle de données, même sans faire la comptabilité.

PATTERN EVOLIZ 1 — Classifications comptables par ligne
  Evoliz : sale_classificationid / purchase_classificationid
           chaque ligne de document est liée à un compte comptable
  LIGNIA : catalog_items.accounting_code (706/707/607...)
           Pré-rempli par catalog_domain, overridable sur la ligne de devis

PATTERN EVOLIZ 2 — Axe analytique
  Evoliz : analyticid sur documents et lignes
  LIGNIA : analytic_code sur les interventions et les devis
           "Installation", "Entretien", "SAV", "Ramonage"
           Permet au comptable de sortir le CA par activité sans retraitement

PATTERN EVOLIZ 3 — Conditions de paiement snapshotées
  Evoliz : paytermid sur chaque document (30j fin de mois, comptant, date fixe...)
           paytypeid (virement, chèque, prélèvement...)
  LIGNIA : payment_term_label + payment_due_date snapshotés sur la facture
           Pas de date libre saisie manuellement, mais un terme choisi

PATTERN EVOLIZ 4 — Types de documents de facturation
  Evoliz : typedoc = invoice | retention | situation | advance | benefit
           - advance = facture d'acompte
           - situation = facturation à l'avancement (travaux en plusieurs tranches)
           - retention = retenue de garantie (5% BTP, levée à la fin)
  LIGNIA : invoice_type = ACOMPTE | SITUATION | SOLDE | AVOIR | RETENUE
           Modèle de données à prévoir dès V1, même si la gestion complète est V2

PATTERN EVOLIZ 5 — Numérotation et documents
  Evoliz : document_number avec séquences configurables par type
           CGV (conditions générales de vente) attachées
           Modèles PDF avec logo, mentions légales
  LIGNIA :
           Numérotation devis : D-2026-0001
           Numérotation facture : F-2026-0001
           Numérotation avoir : A-2026-0001
           Toutes les séquences configurables par TENANT_ADMIN

PATTERN EVOLIZ 6 — Achats fournisseurs (Buys)
  Evoliz : /buys avec supplierid, classificationid, status, billable
           external_document_number = numéro de facture fournisseur
  LIGNIA : purchase_order + supplier_invoice_number
           Lier la commande à la facture fournisseur reçue
           Indispensable pour la réconciliation comptable

CE QUE LIGNIA NE FERA PAS (même avec Evoliz comme référence)
  ❌ Grand livre / balance comptable interne
  ❌ Journaux bancaires
  ❌ Rapprochement bancaire
  ❌ Comptabilité complète → déléguer à Evoliz / Pennylane / Sage
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

RÈGLE D — Champs comptables prévus dès V1, utilisés en V2
  accounting_code, analytic_code, payment_term, invoice_type
  Ne jamais obliger une migration destructive pour ajouter la comptabilité
```

---

## PÉRIMÈTRE PRODUIT — 4 domaines catalog_domain

```
FUMISTERIE      Conduits, accessoires, sorties de toit, tubage
                Fournisseurs principaux : Poujoulat, Lorflex, Joncoux, Dinak, Bofill
                Architecture compatible avec 100+ fournisseurs

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
| **PER003d** | **Amélie** | **Secrétaire / ADV** | **Hub opérationnel : planning, relances, facturation, commandes, documents** |
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
| PER011 | Sabrina | Comptable externe |
| PER012 | Claire-Marie | Responsable réseau franchise |

### Admin LIGNIA

| ID | Rôle |
|---|---|
| SUPER_ADMIN | Solopreneur — imports, mapping, maintenance globale |
| TENANT_ADMIN | Gérant artisan — remises, fournisseurs, paramétrage comptable |
| TENANT_USER | Vendeur, poseur, secrétaire — usage quotidien |

**Note sur Amélie (PER003d) :**
Dans les entreprises bois énergie à 1 M€+, la secrétaire est le hub opérationnel.
Elle gère : appels entrants, planning, relances devis, pièces SAV, facturation,
classement documentaire, export comptable.
LIGNIA doit être autant conçu pour elle que pour le patron ou le poseur.

---

## LES 4 CYCLES PRODUIT

```
CYCLE 1 — Vente et installation (70% du CA)
  Lead → Estimatif → Visite → Définitif → Signé → Commande → Chantier → Facture
  Acteurs bureau : Sophie + Amélie
  Acteurs terrain : Yohan/Félicien

CYCLE 2 — Entretien récurrent (20% du CA)
  Installation → Intervention (entretien/ramonage) → Certificat → Facture → Rappel

CYCLE 3 — SAV (10% du CA + fidélisation)
  Panne → Intervention (SAV) → Diagnostic → Pièce → Facture → Timeline installation

CYCLE 4 — Maintenance catalogue (SUPER_ADMIN)
  Import → Vérif → Remises → Monitoring
```

---

## SÉPARATION V1 / V2 / V3

```
V1 — PILIER 1 + PILIER 2 + début PILIER 3
  [Vente et organisation commerciale]
    Import Poujoulat + Lorflex (architecture multi-fournisseurs)
    Devis estimatif et final avec remise globale fournisseur
    Recherche catalogue filtrée par catalog_domain
    Kits / Ouvrages pré-remplis
    Catalogue privé artisan (lignes maison, pièces SAV basiques)
    Contacts multiples par client
    Relance automatique devis (J+7, J+15, J+30)
    Appareils dans devis (heating_appliances → QuoteEditor)
    Numérotation devis/facture configurée (D-AAAA-NNNN)
    CGV attachable au devis
    Champs comptables prévus dans le modèle (accounting_code, analytic_code)

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
  Bon de commande fournisseur + réception + export comptable achats
  Facturation avec types (ACOMPTE / SITUATION / SOLDE / AVOIR)
  Conditions de paiement snapshotées (paytermid)
  Classifications comptables par type de ligne
  Axe analytique (Installation / Entretien / SAV / Ramonage)
  Export vers Pennylane / Evoliz / Sage (factures + achats)
  Comparaison versions tarifaires
  Portail client (signature, suivi)
  Timeline installation complète
  Site/Location comme objet persistant
  Parc installé complet (multi-appareils, multi-sites)
  Permissions multi-utilisateurs + rôles
  Tags métier
  Tarif contrat d'entretien

V3 — RÉCURRENCE + RÉSEAU + IA
  Assistant vocal devis chantier
  Export FEC / Facture-X complet
  Réseau marques / franchises
  LIGNIA Manufacturer
  Parc installé intelligent
  Catalogue SAV fabricants
  Mini-ERP avec comptabilité connectée
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
  Devis, catalogue, planning, facturation : desktop first
  Navigation rapide entre clients, projets, devis

INTÉGRATIONS TIERCES
  Comptabilité : Pennylane / Evoliz / Sage (export V2)
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

MODÈLE
  customer → contacts (N)
  contact : prénom, nom, rôle, is_primary
  contact_method : type (email/tel/sms), préférence (facturation/rdv/info)

CRITÈRES D'ACCEPTATION V1
✅ N contacts par client
✅ Email facturation distinct de l'email de contact RDV
✅ Rôle libre (propriétaire, comptable, locataire, architecte...)
```

---

### US-CRM-02 — Tags métier (V2)

```
EXEMPLES : VIP | RGE requis | Prescripteur | Litige | Contrat entretien
CRITÈRES V2 : Tags configurables par TENANT_ADMIN, filtre dans liste clients
```

---

### US-CRM-03 — Site / Location persistant (V2)

```
CRITÈRES V2
✅ Site persiste après clôture du projet
✅ N sites par client, historique installations par site
```

---

### US-CRM-04 — Relance automatique devis (V1)
**En tant qu'Amélie, je veux ne plus oublier de relancer les devis sans réponse.**

```
SCÉNARIO
  Devis envoyé → J+7 : notification Amélie "Relancer M. Dupont ?"
              → J+15 : email automatique client + notification Amélie
              → J+30 : devis proposé à archiver

CRITÈRES V1
✅ Vue "Devis à relancer" dans le dashboard Amélie
✅ Délais configurables par TENANT_ADMIN
```

---

### US-CRM-05 — Pipeline commercial (V1)

```
CRITÈRES V1 : CA signé/en cours/perdu, taux transformation, pipeline par statut
```

---

## BLOC PLN — PLANNING ET INTERVENTIONS

### US-PLN-01 — Objet Intervention unique (V1 — PILIER 2 CENTRAL)
**En tant qu'Amélie, je veux planifier toutes les interventions depuis un seul endroit.**

```
TYPES : VT | POSE | RAMONAGE | ENTRETIEN | SAV | AUTRE
STATUTS : PLANIFIEE → CONFIRMEE → EN_COURS → TERMINEE | ANNULEE | REPORTEE

DONNÉES D'UNE INTERVENTION
  type, statut, technicien(s), client, adresse
  date_heure_debut, date_heure_fin
  notes_avant (briefing), notes_apres + photos (compte-rendu)
  installation_id (nullable)
  analytic_code (pour export comptable : INSTALLATION/ENTRETIEN/SAV/RAMONAGE)

CRITÈRES V1
✅ Créer une intervention en 30 secondes (bureau ou mobile)
✅ Vue planning semaine par technicien (desktop Amélie)
✅ Alerte double-booking
✅ Fiche intervention accessible OFFLINE (PWA technicien)
✅ Compte-rendu post-intervention (notes + photos)
```

---

### US-PLN-02 — Vue planning bureau (V1 — Amélie)

```
CRITÈRES V1 : Vue calendrier semaine/mois, par technicien, couleurs par type, glisser-déposer
```

---

### US-PLN-03 — Fiche intervention mobile (V1 — Yohan, Luc)
**En tant que Poseur (Yohan), je veux avoir ma journée sur mon téléphone sans réseau.**

```
CONTENU (mobile simplifié)
  Client + adresse + accès (code portail, digicode...)
  Notes briefing d'Amélie + matériel à apporter
  Photos avant/après + compte-rendu + signature client

CRITÈRES V1 — MOBILE FIRST
✅ Accessible OFFLINE (PWA service worker)
✅ Interface simplifiée, photos en 2 clics
✅ Signature client sur écran tactile
✅ Sync automatique à la reconnexion
```

---

## BLOC APP — APPAREILS ET PARC INSTALLÉ

### US-APP-01 — Ajouter un appareil au devis (V1 — PRIORITÉ HAUTE)

```
CRITÈRES V1
✅ heating_appliances branché au CatalogPopover (onglet "Appareils")
✅ catalog_domain='APPAREIL', prix via resolve_item_price
```

---

### US-APP-02 — Suggestion fumisterie compatible (V2)

```
CRITÈRES V2 : Filtre auto sur diamètre, warning si incompatibilité
```

---

### US-APP-03 — Enregistrement appareil + garanties à la clôture (V1)

```
DONNÉES (mobile offline)
  Marque, modèle, N° série, diamètre buse, date mise en service
  Garantie fabricant : X mois | Garantie artisan : X mois | Photos finales

CALCULS AUTO
  warranty_manufacturer_end | warranty_provider_end | next_sweep_date

CRITÈRES V1
✅ Saisie < 2 min (PWA offline)
✅ Badge "SOUS GARANTIE" / "HORS GARANTIE" visible
✅ Alerte en SAV si sous garantie
```

---

### US-APP-04 — Parc installé et timeline (V1/V2)

```
FICHE INSTALLATION V1
  Appareil, garanties, dernier ramonage, actions rapides

TIMELINE V2
  Toutes interventions/devis/commandes sur 10-20 ans

CRITÈRES V1 : Fiche lisible depuis client, garanties visibles, lien vers intervention
CRITÈRES V2 : Timeline complète, multi-appareils par site
```

---

### US-APP-05 — Fin de vie estimée (V3)

```
CRITÈRES V3 : Alerte âge > durée de vie, vue "Appareils à remplacer dans 12 mois"
```

---

## BLOC SAV — SERVICE APRÈS-VENTE

### US-SAV-01 — Devis SAV depuis la fiche installation (V1)

```
SCÉNARIO : Michel appelle → Amélie voit le MCZ Ego + statut garantie → crée devis SAV
           pré-rempli en 2 clics → programme intervention SAV pour Yohan

CRITÈRES V1
✅ Devis SAV en < 3 min, statut garantie visible, intervention planifiée dans la foulée
```

---

### US-SAV-02 — Catalogue privé pièces détachées (V1)

```
MODÈLE : catalog_items (supplier_name='TENANT_PRIVATE', catalog_domain='PIECE_DETACHEE')
CRITÈRES V1 : Pièce créée en 30s, invisible dans la recherche fumisterie
```

---

### US-SAV-03 — Catalogue SAV fabricants (V3)

```
CRITÈRES V3 : Import pièces MCZ/Edilkamin/Jotul, recherche par modèle
```

---

## BLOC D — DEVIS

### US-D01 — Créer un devis estimatif (V1)

```
DEVIS RÉEL LIGNIA :
  Poêle Jotul F163 (APPAREIL)
  + Ouvrage "Raccordement étanche Ø80/130" (8 lignes, 2 clics)
  + Conduit concentrique Poujoulat (FUMISTERIE)
  + Main d'œuvre pose (PRESTATION)

CRITÈRES V1
✅ Devis en < 5 min grâce aux ouvrages pré-remplis
✅ TVA correcte (5.5% rénovation / 20% neuf)
✅ Numéro de devis automatique (D-2026-NNNN)
✅ CGV attachable en PDF
```

---

### US-D02 — Convertir estimatif en devis final (V1)

```
CRITÈRES V1 : Duplication, prix recalculés, numérotation distincte
```

---

### US-D03 — Recherche catalogue contextualisée (V1)

```
CRITÈRES V1
✅ Recherche fulltext < 500ms, filtrage domain + fournisseurs actifs
✅ Onglets : Appareils | Fumisterie | Prestations | SAV/Pièces | Maison
```

---

### US-D04 — Remise fournisseur automatique (V1)

```
CRITÈRES V1 : Remise à l'ajout, marge interne visible, jamais dans PDF client
```

---

### US-D05 — Signer un devis (V1)

```
CE QUI SE PASSE
  1. quote_status → signed
  2. Facture acompte créée (invoice_type=ACOMPTE)
  3. Installation créée dans le parc installé (status=draft)
  4. quote_lines = snapshot immuable (INVARIANT 4)
```

---

### US-D06 — Créer un ouvrage / kit (V1)
**Argument de vente #1 : gain de temps devis.**

```
CRITÈRES V1
✅ Créer ouvrage depuis devis existant (1 clic)
✅ Insérer ouvrage = toutes ses lignes avec prix recalculés
✅ Catalogue d'ouvrages partagé dans le tenant
```

---

### US-D07 — Fiche technique ADEME dans le PDF (V2)

```
CRITÈRES V2 : Puissance, rendement, Flamme Verte générés automatiquement dans le PDF
```

---

## BLOC C — CATALOGUE ET IMPORTS

### US-C01 à C05 — Pipeline import fournisseurs (V1)

```
Architecture compatible 100+ fournisseurs (Poujoulat, Lorflex, Joncoux, Dinak, Bofill...)
RÈGLES : supplier_ref brut, cost_price jamais importé, catalog_domain par fournisseur
ROLLBACK : par batch_id, devis signés non affectés
```

---

### US-C06 — Import base ADEME (V1)

```
SOURCE : xlsx mensuel ADEME — catalog_domain='APPAREIL', is_central=true
CRITÈRES V1 : Appareils dans CatalogPopover onglet "Appareils", import reproductible
```

---

## BLOC P — PROJET ET CHANTIER (V1)

```
US-P01 Créer un projet  → client + site, statuts prospect→completed
US-P02 Visite technique → Intervention VT, mobile offline, photos
US-P03 Suivre projets   → Pipeline, montant HT par stade
US-P04 Clôturer         → Attestation, N° série + garanties, facturation solde
```

---

## BLOC R — RAMONAGE (V1)

```
US-R01 Tournée    → Liste retards, interventions RAMONAGE, SMS client
US-R02 Certifier  → Formulaire < 2 min, signature, PDF, échéance MAJ
US-R03 Rappels    → Notif 2 mois avant, email client 1 mois (configurable)
```

---

## BLOC O — COMMANDE FOURNISSEUR (V2)

### US-O01 — Bon de commande depuis devis signé (V2)

```
RÈGLE CRITIQUE : BC utilise supplier_ref_snapshot (INVARIANT 4)

CRITÈRES V2
✅ Regroupement par fournisseur, quantités agrégées
✅ Export PDF ou email commercial
```

---

### US-O02 — Réception et facture fournisseur (V2)
**En tant qu'Amélie, je veux lier la facture fournisseur à ma commande.**

```
BESOIN MÉTIER (appris de Evoliz — /buys avec external_document_number)
  Quand Poujoulat envoie sa facture, Amélie doit pouvoir la lier
  à la commande passée et l'enregistrer avec son numéro de document.
  C'est ce qui permet la réconciliation comptable sans ressaisie.

DONNÉES
  purchase_order_id (lié au devis signé)
  supplier_invoice_number (numéro externe Poujoulat)
  supplier_invoice_date
  montant_ht + TVA (vérification vs commande)
  statut : RECU | PARTIEL | LITIGE

CRITÈRES V2
✅ Facture fournisseur liée à la commande en 1 clic
✅ Numéro de facture fournisseur enregistré
✅ Alerte si montant facture ≠ commande
✅ Export vers Pennylane / Evoliz / Sage
```

---

## BLOC FAC — FACTURATION (V2)

### US-FAC-01 — Types de factures (V2)
**En tant qu'Amélie, je veux créer des factures adaptées au BTP.**

```
BESOIN MÉTIER (appris de Evoliz — typedoc : advance | situation | retention | invoice)
  Dans le BTP, la facturation suit des étapes :
  1. Facture d'acompte (30% à la commande) — ACOMPTE
  2. Facture de situation (facturation à l'avancement) — SITUATION
  3. Facture de solde (fin de chantier) — SOLDE
  4. Retenue de garantie (5% libérée après délai) — RETENUE
  5. Avoir si annulation partielle — AVOIR

CRITÈRES V2
✅ Types de factures : ACOMPTE | SITUATION | SOLDE | AVOIR | RETENUE
✅ Numérotation automatique par type (F-2026-NNNN, A-2026-NNNN...)
✅ Ventilation TVA par taux (5.5% rénovation / 20% neuf)
✅ PDF propre avec logo + CGV + mentions légales
```

---

### US-FAC-02 — Export comptable (V2)
**En tant que Sabrina, je veux exporter vers mon logiciel comptable.**

```
BESOIN MÉTIER (appris de Evoliz — classifications + analytique + paytermid)
  Pour que l'export soit exploitable sans ressaisie, chaque ligne de facture
  doit porter : compte comptable, TVA, axe analytique, conditions de paiement.

  Ces champs sont préparés dès V1 dans le modèle.

DONNÉES EXPORTÉES
  N° document, date, client, montant HT, TVA, TTC
  accounting_code par ligne (706 pose / 707 fumisterie / 607 achat...)
  analytic_code par intervention (INSTALLATION / ENTRETIEN / SAV / RAMONAGE)
  payment_term (30j fin de mois, comptant...)
  statut paiement

COMPATIBILITÉ
  Export CSV / JSON compatible Pennylane, Evoliz, Sage
  Statut "exporté" anti-doublons

CRITÈRES V2
✅ Export factures ventes + factures achats fournisseurs
✅ Champs comptables remplis sans ressaisie
✅ Statut export traçable
```

---

### US-FAC-03 — Paramétrage comptable par TENANT_ADMIN (V2)
**En tant que Sabrina (ou Arnaud), je veux paramétrer les comptes comptables de l'entreprise.**

```
BESOIN MÉTIER (appris de Evoliz — sale-classifications + purchase-classifications)
  Chaque type de ligne a son compte comptable.
  Le TENANT_ADMIN configure une fois, toutes les factures suivent.

PARAMÈTRES À CONFIGURER
  Compte vente pose : 706 (valeur par défaut pour PRESTATION)
  Compte vente fumisterie : 707 (valeur par défaut pour FUMISTERIE)
  Compte vente ramonage : 706
  Compte achat fournisseur : 607
  Taux TVA par défaut : 20% (neuf) / 5.5% (rénovation)
  Conditions de paiement par défaut : 30j fin de mois

CRITÈRES V2
✅ Configuration en 10 minutes par le comptable
✅ Compte comptable visible sur chaque ligne de facture
✅ Override possible ligne par ligne
```

---

### US-FAC-04 — Numérotation et modèles de documents (V1)
**En tant que TENANT_ADMIN, je veux paramétrer la numérotation et le PDF des documents.**

```
BESOIN MÉTIER (appris de Evoliz — admin_docs + admin_perso)
  Un document professionnel doit avoir :
  Numérotation cohérente, logo, CGV, mentions légales.
  Un artisan qui envoie un devis sans CGV ou avec numérotation incohérente
  perd en crédibilité.

PARAMÈTRES V1
  Format numérotation devis : D-{ANNEE}-{NNNN} (configurable)
  Format numérotation facture : F-{ANNEE}-{NNNN}
  Logo entreprise
  CGV PDF attachable
  Mentions légales (SIRET, TVA intracommunautaire, RCS)

CRITÈRES V1
✅ Numérotation auto sans doublon garanti
✅ Logo visible sur PDF devis et facture
✅ CGV attachables au devis
```

---

## BLOC DOC — GESTION DOCUMENTAIRE (V1/V2)

### US-DOC-01 — Documents liés à une intervention ou un projet (V1)
**En tant qu'Amélie, je veux retrouver tous les documents d'un dossier au même endroit.**

```
BESOIN MÉTIER
  Sur un chantier de 50 000€, les documents s'accumulent :
  Devis signé, bon de commande, bon de livraison, photos de pose,
  attestation de fin de travaux, facture acompte, facture solde,
  certificat de ramonage, facture SAV...

  Aujourd'hui dans les PME : email + drive + classeur papier.
  Douleur réelle quand un client réclame un document 2 ans après.

DOCUMENTS GÉRÉS V1
  Devis (PDF généré)
  Factures (PDF généré)
  Certificat de ramonage (PDF généré)
  Attestation de fin de travaux (PDF généré)
  Photos chantier (uploadées par Yohan)

DOCUMENTS GÉRÉS V2
  Bon de commande fournisseur (PDF généré)
  Facture fournisseur (uploadée ou liée)
  Notice technique appareil
  Bon de livraison

CRITÈRES V1
✅ Tous les documents d'un projet accessibles depuis la fiche projet
✅ Recherche par client ou par date
✅ Téléchargement en 1 clic

CRITÈRES V2
✅ Upload de documents externes (factures fournisseurs, notices)
✅ Historique documentaire lié à l'installation
```

---

## BLOC TEAM — GESTION ÉQUIPE (V2)

### US-TEAM-01 — Profils techniciens et habilitations (V2)
**En tant qu'Arnaud, je veux affecter les bonnes personnes aux bons chantiers.**

```
BESOIN MÉTIER
  Yohan est qualifié RGE + ramonage. Félicien est en formation ramonage.
  Certains chantiers requièrent une habilitation spécifique.
  Arnaud doit pouvoir voir la charge de travail de chacun.

DONNÉES D'UN TECHNICIEN
  Nom, prénom, rôle (poseur / ramoneur / SAV / polyvalent)
  Habilitations : RGE | QUALIBOIS | Ramonage certifié
  Charge : nombre d'interventions cette semaine
  Historique des chantiers réalisés

CRITÈRES V2
✅ Profil technicien avec habilitations
✅ Vue "Charge par technicien" (semaine en cours)
✅ Historique des interventions par technicien
✅ Alerte si affectation sans habilitation requise
```

---

## BLOC MAIN — MAINTENANCE SUPER_ADMIN

```
US-MAIN-01 (V2) : import_runs, status, counts, répartition par domain
US-MAIN-02 (V1) : Rollback par batch_id, devis signés non affectés
```

---

## BLOC NORM — GOUVERNANCE NORMALISATION (V2)

```
US-NORM-01 : normalization_status='needs_review' par domain
US-NORM-02 : Familles canoniques LIGNIA (conduit_double_paroi, tubage_flexible...)
```

---

## BLOC V — VOIX ET IA (V3)

```
US-V01 : "Coude 45° inox 150 Poujoulat" → extraction → search domain='FUMISTERIE' → < 2s
         Prérequis : angle_deg + diameter_inner_mm remplis (V2)
```

---

## BLOC RÉSEAU — FRANCHISE (V3)

```
US-RESEAU-01 : Vue agrégée multi-tenants pour PER012, données anonymisées
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
| accounting_code | Compte comptable (706/707/607...) — RÈGLE D | ❌ À créer V1 |
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
| serial_number | N° série — obligatoire pour garantie | Saisie technicien |
| installed_on | Date mise en service | Saisie technicien |
| warranty_manufacturer_end | Fin garantie fabricant | Calculé auto |
| warranty_provider_end | Fin garantie artisan | Calculé auto |
| next_sweep_date | Prochaine échéance ramonage | Calculé auto |
| diameter_installed_mm | Diamètre réel posé | Saisie technicien |

### Champs facture / document (comptabilité)

| Champ | Usage | Source Evoliz |
|---|---|---|
| invoice_type | ACOMPTE / SITUATION / SOLDE / AVOIR / RETENUE | typedoc |
| document_number | Numérotation auto sans doublon | admin_docs |
| payment_term | 30j fin de mois, comptant, date fixe... | paytermid |
| payment_type | Virement, chèque, prélèvement... | paytypeid |
| analytic_code | INSTALLATION / ENTRETIEN / SAV / RAMONAGE | analyticid |
| accounting_code | 706 / 707 / 607 par ligne | sale_classificationid |
| export_status | NULL / PENDING / EXPORTED | MarkAsExported |
| synced_at | Date d'export vers logiciel comptable | — |

### Valeurs catalog_domain

| Valeur | Compte comptable défaut | Usage |
|---|---|---|
| FUMISTERIE | 707 | Conduits, accessoires |
| APPAREIL | 707 | Poêles, inserts |
| PRESTATION | 706 | Pose, ramonage, entretien |
| PIECE_DETACHEE | 607 (achat) / 707 (revente) | SAV |

### Champs quote_lines (snapshots INVARIANT 4)

| Champ | Rôle | Statut |
|---|---|---|
| supplier_ref_snapshot | Code fournisseur figé | ✅ |
| supplier_name_snapshot | Fournisseur figé | ✅ |
| unit_cost_price | Coût net figé (marge) | ✅ |
| metadata.pricing | Pricing complet figé | ✅ |
| vat_rate | TVA figée | ✅ |
| accounting_code | Compte comptable figé | ❌ À ajouter V1 |

---

## DETTE TECHNIQUE — PAR PRIORITÉ

### CRITIQUE — Avant import Lorflex

| Dette | Action |
|---|---|
| catalog_domain absent de catalog_items | Migration SQL + DEFAULT 'FUMISTERIE' |
| catalog_domain absent de map_supplier.py | Patch + tous les SUPPLIER_CONFIGS |

### PILIER 1 — V1 imminent

| Dette | Action |
|---|---|
| heating_appliances non branché au QuoteEditor | Lovable — CatalogPopover onglet Appareils |
| Numérotation documents non configurée | TENANT_ADMIN settings |
| CGV non attachable au devis | Upload PDF + lien devis |
| accounting_code absent de catalog_items | Champ nullable — DEFAULT par catalog_domain |
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
| Types de factures (ACOMPTE/SITUATION/SOLDE) | invoice_type + facturation V2 |
| Classifications comptables par ligne | sale_classificationid → accounting_code |
| Axe analytique | analytic_code sur interventions + factures |
| Conditions de paiement snapshotées | paytermid → payment_term |
| Facture fournisseur liée à commande | purchase_order + supplier_invoice_number |
| Export Evoliz / Pennylane / Sage | CSV/JSON normalisé + statut export |
| technology_type null Poujoulat | Normalization job |
| supplier_family_code absent | Avant remises par famille |
| Timeline installation | V2 |
| Site/Location persistant | V2 |
| Gestion documentaire complète | Upload factures fournisseurs + notices |
| Profils techniciens + habilitations | V2 |
| Tests E2E Playwright | Avant terrain |
| Wrap RLS (SELECT auth.jwt()) | Avant 50k articles |

### V3

| Dette | Action |
|---|---|
| Export FEC / Facture-X complet | V3 |
| Catalogue SAV fabricants | V3 |
| Predicted replacement date | V3 |
| Réseau / franchise | V3 |
