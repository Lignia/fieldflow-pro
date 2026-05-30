# LIGNIA — User Stories Complètes
> Document de référence — v3.2
> Claude Analytics + OpenAI + Analyse ServiceTitan (CRM/Pricebook/Equipment/Accounting/JPM) — Mai 2026
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

## ACTIFS STRATÉGIQUES DE LIGNIA

```
ACTIF #1 — PARC INSTALLÉ
  30 000 installations historisées = actif impossible à reproduire
  Base de récurrence : ramonage, entretien, SAV, remplacement
  Donnée propriétaire, non téléchargeable

ACTIF #2 — CATALOGUE NORMALISÉ MULTI-FOURNISSEURS
  100 fournisseurs, 4 domaines, pipeline d'import industriel
  Recherche contextualisée par catalog_domain
  Remises par famille configurées par artisan

ACTIF #3 — HISTORIQUE SAV & INTERVENTIONS
  Timeline complète par installation sur 10-20 ans
  Preuve légale, outil de diagnostic, source de recommandations
  Valeur croissante avec le temps
```

---

## CE QUE SERVICETITAN APPREND À LIGNIA — SANS LE COPIER

**Contexte :** analyse des specs CRM v2, Pricebook v2, Equipment Systems v2, Accounting v2 et JPM v2.

**Les 6 patterns retenus (adaptés au contexte LIGNIA) :**

```
PATTERN 1 — Le centre du système n'est pas le client, c'est l'équipement installé
  ServiceTitan : Customer → Location → InstalledEquipment → History
  LIGNIA :       Client   → Site     → Installation        → Timeline
  Impact : heating_appliances doit devenir un actif, pas seulement un catalogue

PATTERN 2 — Appointment comme objet métier unique
  ServiceTitan : Appointment (Scheduled/Dispatched/Working/Hold/Done/Canceled)
  LIGNIA :       Intervention (Planifiée/Confirmée/En cours/Terminée/Annulée)
  Impact : tous les RDV terrain (VT, pose, ramonage, SAV) partagent le même objet

PATTERN 3 — Contacts multiples par client
  ServiceTitan : Customer → Contacts (email, phone, SMS) + ContactPreferences
  LIGNIA :       Client → Contacts (propriétaire, comptable, gardien, architecte)
  Impact : facturer Mme Dupont, appeler M. Dupont, prévenir le gardien

PATTERN 4 — Garantie fabricant ≠ garantie prestataire
  ServiceTitan : manufacturerWarrantyStart/End + serviceProviderWarrantyStart/End
  LIGNIA :       warranty_manufacturer_end + warranty_provider_end sur l'installation
  Impact : savoir en SAV si la panne est sous garantie avant d'envoyer quelqu'un

PATTERN 5 — Historique des prix (Pricebook history)
  ServiceTitan : ClientSpecificPricing avec rate sheets versionnés
  LIGNIA :       batch_id + import_date = quelle version du tarif a été utilisée
  Impact : audit légal, litige client, comparaison tarifs annuels

PATTERN 6 — AP Bills pour les achats fournisseurs (Accounting)
  ServiceTitan : AP Bills avec purchaseOrderId, batchId, MarkAsExported vers Sage/Pennylane
  LIGNIA :       Bon de commande fournisseur → export vers logiciel comptable
  Impact : clôture le cycle devis → commande → facture fournisseur → comptabilité

CE QUE LIGNIA NE FERA PAS (hors scope)
  ❌ Dispatch GPS des techniciens
  ❌ Gestion de flotte véhicules
  ❌ Payroll / gestion RH
  ❌ Call center
  ❌ Campagnes marketing
  ❌ Comptabilité interne complète (→ déléguer à Pennylane/Sage)
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
```

**RÈGLE D'ARCHITECTURE (non immuable, évolutive) :**

```
RÈGLE A — catalog_domain sépare les univers produit
  Valeurs actuelles : FUMISTERIE | APPAREIL | PRESTATION | PIECE_DETACHEE
  Valeurs futures possibles : CONSOMMABLE | COMBUSTIBLE | EPI | OUTILLAGE
  search_quote_items_v2 filtre toujours par domain selon le contexte
  Ne JAMAIS mélanger les domaines dans une recherche sans contexte explicite

RÈGLE B — Installation = actif central, pas le devis
  L'installation persiste après le devis et la facture
  Elle porte la garantie, l'historique, les interventions
  Le devis est un état transitoire ; l'installation est permanente
```

---

## PÉRIMÈTRE PRODUIT LIGNIA — 4 domaines catalog_domain

```
DOMAINE A — FUMISTERIE          (catalog_domain = 'FUMISTERIE')
  Conduits (simple paroi, double paroi, concentrique, flexible)
  Accessoires (coudes, tés, raccords, collerettes)
  Sorties de toit, terminaux, tubage flexible
  Fournisseurs : Poujoulat, Lorflex, Joncoux, Dinak, Bofill, Jeremias, Tubest...

DOMAINE B — APPAREILS           (catalog_domain = 'APPAREIL')
  Poêles bois / granulés, inserts, chaudières biomasse
  (V2) PAC, chauffe-eau, solutions hybrides
  Source : base ADEME (éligibles MaPrimeRénov') + catalogues fabricants

DOMAINE C — PRESTATIONS         (catalog_domain = 'PRESTATION')
  Pose, ramonage, entretien annuel, SAV, visites techniques, main d'œuvre

DOMAINE D — PIÈCES DÉTACHÉES    (catalog_domain = 'PIECE_DETACHEE')
  Joints, vitres, bougies, cartes électroniques, pressostats, sondes
  Vis sans fin, moteurs, ventilateurs, télécommandes, modules WiFi
  NE PAS IMPORTER MASSIVEMENT EN V1
  Approche V1 : catalogue privé artisan + ligne libre pour SAV exceptionnel
```

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
| PER012 | Claire-Marie | Responsable réseau / franchise | Jotul France |

### Écosystème fabricants — P2

| ID | Prénom | Rôle | Entreprise |
|---|---|---|---|
| PER006 | Marc | Fabricant poêles | Turbo Fonte |
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
  Lead → Qualification → Estimatif → Visite → Définitif → Signé → Chantier → Facture
  Objets : Lead → Customer → Location → Appointment → Quote → Installation

CYCLE 2 — Entretien récurrent
  Installation → Appointment (ramonage) → Certificat → Rappel → Renouvellement
  Objet central : Installation (actif persistant)

CYCLE 3 — SAV
  Panne → Appointment (SAV) → Diagnostic → Pièce → Intervention → Facture → Timeline
  Objet central : Installation (garantie + historique)

CYCLE 4 — Maintenance catalogue (SUPER_ADMIN)
  Import → Dry-run → Vérif → Remises → Monitoring → Comparaison versions
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
  Intervention (Appointment) comme objet unique — VT/Pose/Ramonage/SAV
  Fiche chantier mobile basique
  Cycle ramonage simple
  Appareils dans devis (branchement heating_appliances → QuoteEditor)
  Enregistrement appareil + garanties à la clôture chantier
  Import base ADEME → heating_appliances
  Contacts multiples par client
  Relance automatique devis (J+7, J+15, J+30)

V2 — Après validation terrain (1-3 mois)
  Remises par famille (supplier_family_code importé)
  Bon de commande fournisseur avec export comptable (AP Bills)
  Monitoring imports + comparaison versions tarifaires (historique prix)
  Archivage articles disparus automatique
  Facturation et relances automatiques
  Portail client (signature, suivi)
  Timeline installation complète
  Parc installé complet (multi-appareils, multi-sites, location)
  Permissions multi-utilisateurs (rôles)
  Compatibilité appareil ↔ fumisterie (suggestion automatique)
  Gouvernance normalisation catalogue
  Déclenchement SAV depuis fiche installation
  Tags métier sur clients/installations
  Tarif contrat d'entretien (MemberPrice distinct du tarif public)

V3 — Après terrain artisans (3-12 mois)
  Assistant vocal devis chantier
  Variantes produits
  Export comptable FEC / Facture-X
  Réseau marques / franchises (PER012 Claire-Marie)
  LIGNIA Manufacturer (portail fabricants)
  Parc installé intelligent (suggestion pièces compatibles, predictedReplacement)
  Catalogue SAV fabricants (MCZ, Edilkamin, Jotul...)
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
  Fiche chantier / Appointment : accessible hors connexion
  Devis en brouillon : consultable hors connexion
  Synchronisation à la reconnexion

FIABILITÉ
  0 perte de données sur devis signés
  Rollback import possible par batch_id
  Idempotence : réimporter = safe

INTÉGRATIONS TIERCES
  Comptabilité : Pennylane / Sage (export via AP Bills)
  Email / SMS : notifications relances et rappels
  Signature électronique : portail client (V2)
  ADEME : import mensuel appareils éligibles
```

---

## BLOC CRM — CLIENTS, CONTACTS, LEADS

### US-CRM-01 — Contacts multiples par client (V1)
**En tant que Vendeuse (Sophie), je veux gérer plusieurs interlocuteurs pour un même client.**

```
BESOIN MÉTIER (appris de ServiceTitan CRM v2 — Contacts + ContactMethods)
  M. Dupont est le propriétaire → RDV techniques
  Mme Dupont gère la comptabilité → factures
  Le gardien doit être prévenu → SMS avant intervention
  L'architecte référent → copie des devis

  Un client peut avoir N contacts avec des rôles différents.
  Chaque contact a ses propres méthodes de contact (email, téléphone, SMS)
  et ses préférences de communication.

MODÈLE
  customer → contacts (N)
  contact : prénom, nom, rôle, is_primary
  contact_method : type (email/tel/sms), valeur, préférence (marketing/facturation/rdv)

CRITÈRES D'ACCEPTATION V1
✅ Au moins 2 contacts par client
✅ Contact principal identifié
✅ Rôle du contact (propriétaire, comptable, locataire, architecte...)
✅ Email de facturation distinct de l'email de contact
```

---

### US-CRM-02 — Tags métier sur clients et installations (V2)
**En tant que Vendeuse (Sophie), je veux étiqueter les clients pour filtrer facilement.**

```
BESOIN MÉTIER (appris de ServiceTitan CRM v2 — BulkTags)
  VIP (client premium, priorité intervention)
  RGE requis (installation nécessite certification)
  Prescripteur (architecte, agence immo qui recommande)
  Litige (client avec contentieux en cours)
  Contrat entretien (abonné au contrat annuel)

MODÈLE
  tags : liste libre configurable par le TENANT_ADMIN
  Attachables à : Customer, Installation, Lead

CRITÈRES D'ACCEPTATION V2
✅ Tags configurables par le TENANT_ADMIN (pas hardcodés)
✅ Filtre sur les tags dans la liste clients
✅ Tags visibles sur la fiche client
```

---

### US-CRM-03 — Site / Location comme objet persistant (V2)
**En tant qu'Artisan, je veux qu'une adresse d'installation persiste indépendamment des projets.**

```
BESOIN MÉTIER (appris de ServiceTitan Equipment Systems — locationId)
  M. Dupont a une maison principale et un chalet.
  Chaque site a ses propres équipements et son historique.
  Si M. Dupont vend sa maison, le chalet reste dans LIGNIA
  avec tout son historique.

  Aujourd'hui LIGNIA lie les installations à un projet.
  Un projet peut se terminer mais le site reste.

MODÈLE
  customer → sites (N)
  site : adresse, type (principal/secondaire), actif
  installation → site (N installations par site possible)

CRITÈRES D'ACCEPTATION V2
✅ Site persiste après clôture du projet
✅ Un client peut avoir plusieurs sites
✅ Historique des installations par site
```

---

### US-CRM-04 — Relance automatique des devis (V1)
**En tant que Secrétaire (Amélie), je veux que LIGNIA relance automatiquement les devis sans réponse.**

```
BESOIN MÉTIER (appris de ServiceTitan CRM v2 — Leads + follow-up)
  Un devis envoyé sans réponse = opportunité perdue silencieusement.
  ServiceTitan a un module Lead distinct avec suivi des follow-ups.
  Pour LIGNIA V1 : relance simple sur les devis envoyés.

SCÉNARIO
  Devis envoyé le 01/06
  → J+7 (08/06)  : notification Amélie "Relancer M. Dupont ?"
  → J+15 (16/06) : si toujours pas de réponse, notification + email automatique client
  → J+30 (01/07) : si toujours pas de réponse, devis proposé comme "à archiver"

RÈGLE
  Les délais sont configurables par TENANT_ADMIN
  L'email de relance est paramétrable (template)
  L'artisan peut désactiver la relance manuellement

CRITÈRES D'ACCEPTATION V1
✅ Notification interne à J+7 et J+15
✅ Email client automatique à J+15 (configurable)
✅ Statut devis "En attente de réponse" visible
✅ Vue "Devis à relancer" dans le dashboard Amélie
```

---

### US-CRM-05 — Tableau de bord commercial et pipeline (V1)
**En tant que Gérant (Arnaud), je veux voir les KPIs et le pipeline commercial.**

```
CRITÈRES D'ACCEPTATION
✅ CA signé / en cours / perdu ce mois
✅ Taux de transformation devis (envoyés → signés)
✅ Pipeline par statut (Prospect/Qualifié/Devis envoyé/Signé)
✅ Top articles et fournisseurs
✅ Marge moyenne (si costs renseignés)
```

---

## BLOC PLN — INTERVENTIONS (APPOINTMENT)

### US-PLN-01 — Objet Intervention unique (V1 — IMPORTANT)
**En tant qu'Artisan, tous mes rendez-vous terrain partagent le même objet.**

```
BESOIN MÉTIER (appris de ServiceTitan JPM v2 — Appointments)
  Aujourd'hui dans LIGNIA :
    Visite technique = formulaire projet
    Pose            = clôture chantier
    Ramonage        = module séparé
    SAV             = demande SAV
    Entretien       = module séparé

  ServiceTitan a résolu ça avec un seul objet : Appointment.

  Pour LIGNIA : une "Intervention" est un RDV terrain,
  quel que soit son type. Ça simplifie le planning,
  la notification client, et l'historique.

TYPES D'INTERVENTION
  VT           → Visite Technique
  POSE         → Installation
  RAMONAGE     → Ramonage annuel
  ENTRETIEN    → Entretien préventif
  SAV          → Dépannage / réparation
  AUTRE        → Déplacement non catégorisé

STATUTS (inspirés de ServiceTitan JPM)
  PLANIFIEE    → date fixée, pas encore confirmée
  CONFIRMEE    → client a confirmé le RDV
  EN_COURS     → technicien sur place
  TERMINEE     → intervention clôturée
  ANNULEE      → annulée (avec motif)
  REPORTEE     → replanifiée (avec nouvelle date)

DONNÉES D'UNE INTERVENTION
  type, statut, date_heure_debut, date_heure_fin
  technicien_id, client_id, installation_id (nullable)
  notes_avant (briefing), notes_apres (compte-rendu)
  photos_avant[], photos_apres[]

AVANTAGES
  Planning unifié : Arnaud voit TOUS les RDV de son équipe
  Notification client unifiée : 1 système pour tous les types
  Historique installation : timeline complète par appareil

CRITÈRES D'ACCEPTATION V1
✅ Créer une intervention de n'importe quel type en 30 secondes
✅ Vue planning semaine/mois pour le gérant
✅ Fiche intervention accessible offline (PWA)
✅ Compte-rendu post-intervention (notes + photos)
```

---

### US-PLN-02 — Planning techniciens (V1)
**En tant que Gérant (Arnaud), je veux voir toutes les interventions de mon équipe.**

```
CRITÈRES D'ACCEPTATION V1
✅ Vue calendrier semaine par technicien
✅ Glisser-déposer pour replanifier
✅ Couleurs par type d'intervention
✅ Alerte si double-booking
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

CRITÈRES D'ACCEPTATION
✅ heating_appliances branché au CatalogPopover (onglet "Appareils")
✅ Appareil ajouté avec catalog_domain='APPAREIL'
✅ Prix via resolve_item_price
✅ Diamètre sortie stocké dans le snapshot (pour suggestion fumisterie)
```

---

### US-APP-02 — Suggestion fumisterie compatible (V2)
**En tant qu'Artisan, après avoir ajouté un appareil, je veux voir les conduits compatibles.**

```
CRITÈRES D'ACCEPTATION V2
✅ Filtre automatique sur diamètre après ajout appareil
✅ Warning non bloquant si incompatibilité détectée
```

---

### US-APP-03 — Enregistrement appareil + garanties à la clôture (V1)
**En tant que Poseur (Yohan), je veux enregistrer l'appareil ET ses garanties à la fin du chantier.**

```
BESOIN MÉTIER (appris de ServiceTitan Equipment Systems — warranty fields)
  ServiceTitan trace 4 dates de garantie :
    manufacturerWarrantyStart + manufacturerWarrantyEnd
    serviceProviderWarrantyStart + serviceProviderWarrantyEnd

  Pour LIGNIA :
    Garantie fabricant appareil : généralement 2-5 ans
    Garantie main d'œuvre artisan : généralement 1-2 ans

  Quand un client appelle pour un SAV, l'artisan doit savoir
  immédiatement si la réparation est sous garantie ou facturée.

DONNÉES SAISIES À LA CLÔTURE
  Marque + modèle (depuis heating_appliances ou saisie libre)
  Numéro de série (obligatoire pour la garantie fabricant)
  Diamètre buse réel installé
  Date de mise en service (= début garanties)
  Garantie fabricant : durée en mois (ex: 24)
  Garantie artisan (pose) : durée en mois (ex: 12)
  Photos finales

CALCULS AUTOMATIQUES
  warranty_manufacturer_end = date_mise_en_service + garantie_fabricant_mois
  warranty_provider_end = date_mise_en_service + garantie_artisan_mois
  Prochaine date ramonage = date_mise_en_service + 12 mois

CRITÈRES D'ACCEPTATION
✅ Saisie terrain < 2 minutes sur mobile (PWA offline)
✅ Garanties calculées et stockées automatiquement
✅ Badge "SOUS GARANTIE" visible sur la fiche installation
✅ Alerte en SAV : "Appareil sous garantie fabricant jusqu'au JJ/MM/AAAA"
```

---

### US-APP-04 — Parc installé et timeline (V1/V2)
**En tant qu'Artisan (Thierry), je veux voir l'historique complet d'une installation.**

```
BESOIN MÉTIER (appris de ServiceTitan Equipment Systems + JPM Export_JobHistory)
  ServiceTitan exporte une timeline complète par équipement.
  Pour LIGNIA : chaque installation a une timeline chronologique.

TIMELINE D'UNE INSTALLATION (exemple)
  14/01/2026 → Devis estimatif envoyé
  18/01/2026 → Devis définitif signé
  20/01/2026 → Commande Poujoulat passée
  05/02/2026 → Pose (Yohan) — 6h
  06/02/2026 → Mise en service — garantie jusqu'au 06/02/2028 (fabricant)
  10/02/2026 → Certificat de conformité remis
  15/10/2026 → Ramonage annuel (Luc)
  03/03/2027 → SAV : joint porte remplacé (sous garantie artisan)
  01/11/2027 → Ramonage annuel (Luc)

ACTIONS DEPUIS LE PARC
  → Créer intervention (ramonage / SAV / entretien)
  → Voir timeline complète
  → Vérifier statut garanties
  → Créer devis SAV

CRITÈRES D'ACCEPTATION V1
✅ Fiche installation avec appareil + garanties + dernier ramonage
✅ Lien direct vers création d'une intervention
CRITÈRES D'ACCEPTATION V2
✅ Timeline chronologique complète et exportable
✅ Multi-appareils par site (maison avec 2 poêles)
```

---

### US-APP-05 — Fin de vie estimée et remplacement (V3)
**En tant que LIGNIA, je veux alerter proactivement quand un appareil approche de sa fin de vie.**

```
BESOIN MÉTIER (appris de ServiceTitan Equipment Systems — predictedReplacementDate)
  ServiceTitan calcule : predictedReplacementMonths / predictedReplacementDate
  Pour LIGNIA : poêle installé en 2012, 14 ans d'âge → recommander remplacement

  C'est exactement le type de signalement qui génère une vente proactive.
  L'artisan peut contacter le client avant que la panne survienne.

CRITÈRES D'ACCEPTATION V3
✅ Calcul automatique : âge_appareil = today - date_mise_en_service
✅ Alerte si âge > durée_de_vie_estimée_par_type (configurable)
✅ Vue "Appareils à remplacer dans les 12 mois" pour le commercial
✅ Déclenchement campagne de renouvellement (email client)
```

---

## BLOC SAV — SERVICE APRÈS-VENTE

### US-SAV-01 — Créer un devis SAV depuis la fiche installation (V1)
**En tant qu'Artisan (Thierry), je veux créer un devis SAV en 2 clics avec le contexte pré-rempli.**

```
SCÉNARIO
1. Michel appelle : "Mon poêle MCZ Ego affiche l'erreur A05."
2. Thierry ouvre la fiche client → voit le poêle MCZ Ego
3. Badge : "Garantie fabricant : expire 06/02/2028 ✅" ou "Hors garantie ⚠️"
4. Crée devis SAV : client + adresse + appareil + type=SAV pré-remplis
5. Ajoute les pièces (catalogue privé ou ligne libre)

RÈGLE V1
  Pas d'import massif de pièces détachées
  Catalogue privé artisan pour pièces récurrentes
  Ligne libre pour pièces rares

CRITÈRES D'ACCEPTATION
✅ Devis SAV créé en < 3 minutes
✅ Statut garantie visible avant création du devis
✅ catalog_domain='PIECE_DETACHEE' pour les pièces catalogue
```

---

### US-SAV-02 — Catalogue privé pièces détachées (V1)
**En tant qu'Artisan, je veux créer mes pièces récurrentes dans mon catalogue.**

```
EXEMPLES
  "Joint porte MCZ Ego" → 18€
  "Vitre Edilkamin 40x25" → 45€
  "Pressostat MCZ 0-5 mbar" → 35€

MODÈLE
  catalog_items : supplier_name='TENANT_PRIVATE', catalog_domain='PIECE_DETACHEE'

CRITÈRES D'ACCEPTATION
✅ Pièce créée en 30 secondes
✅ Visible dans onglet "SAV / Pièces" uniquement
✅ catalog_domain = 'PIECE_DETACHEE' → pas de pollution fumisterie
```

---

### US-SAV-03 — Catalogue SAV fabricants (V3)
**En tant que SUPER_ADMIN, je veux importer les catalogues pièces détachées des fabricants.**

```
CRITÈRES D'ACCEPTATION V3
✅ Import pièces MCZ, Edilkamin, Jotul disponible
✅ Recherche "MCZ Ego" → pièces compatibles uniquement
✅ Suggestion automatique depuis le parc installé
```

---

## BLOC D — DEVIS (CORE FLOW)

### US-D01 — Créer un devis estimatif (V1)
**En tant que Vendeuse (Sophie), je veux créer un devis rapide pour un prospect.**

```
UN DEVIS RÉEL RESSEMBLE À :
  Poêle Jotul F163 (APPAREIL)
  + Kit raccordement étanche Ø80/130 (ouvrage = PRESTATION)
  + Conduit concentrique Poujoulat 1m (FUMISTERIE)
  + Sortie toiture (FUMISTERIE)
  + Main d'œuvre pose (PRESTATION)

CRITÈRES D'ACCEPTATION
✅ Devis créé en < 5 min
✅ Appareils + fumisterie + prestations dans le même devis
✅ Prix correct (remise appliquée via resolve_item_price)
✅ TVA correcte (5.5% rénovation / 20% neuf)
```

---

### US-D02 — Convertir un estimatif en devis final (V1)

```
CRITÈRES D'ACCEPTATION
✅ Duplication estimatif → devis final (kind=final)
✅ Prix recalculés à la sauvegarde
✅ Numérotation distincte
```

---

### US-D03 — Rechercher un article dans le catalogue (V1)

```
CRITÈRES D'ACCEPTATION
✅ Recherche fulltext < 500ms
✅ Filtrage par fournisseurs actifs + catalog_domain
✅ Onglets : Appareils | Fumisterie | Prestations | SAV/Pièces | Maison
```

---

### US-D04 — Remise fournisseur automatique (V1)

```
CRITÈRES D'ACCEPTATION
✅ Remise appliquée automatiquement à l'ajout
✅ Marge visible en interne (jamais dans le PDF client)
```

---

### US-D05 — Signer un devis (V1)

```
CE QUI SE PASSE À LA SIGNATURE
  1. quote_status → signed
  2. Facture d'acompte créée automatiquement
  3. Installation créée dans le parc installé (status=draft)
  4. Client converti de prospect → actif
  5. quote_lines = snapshot immuable (INVARIANT 4)
```

---

### US-D06 — Créer un kit / ouvrage (V1)

```
BESOIN MÉTIER
  "Raccordement granulés étanche Ø80/130" = ouvrage de 8 lignes.
  Inséré en 2 clics, prix recalculés au moment de l'ajout.

CRITÈRES D'ACCEPTATION
✅ Créer ouvrage depuis devis existant
✅ Insérer ouvrage = insérer toutes ses lignes en 1 clic
✅ Prix recalculé (resolve_item_price)
```

---

### US-D07 — Fiche technique ADEME dans le PDF (V2)

```
CRITÈRES D'ACCEPTATION V2
✅ Données ADEME dans le PDF devis (puissance, rendement, Flamme Verte)
✅ Génération automatique depuis heating_appliances
```

---

## BLOC C — CATALOGUE ET IMPORTS (SUPER_ADMIN)

### US-C01 — Importer un nouveau catalogue fournisseur (V1)

```
RÈGLES MÉTIER
  supplier_ref brut (INVARIANT 1), cost_price jamais importé (INVARIANT 2)
  catalog_domain défini par fournisseur (RÈGLE A)
  import_batch_id UUID unique, devis signés non affectés (INVARIANT 4)
```

---

### US-C02 — Mettre à jour les tarifs annuels (V1)

```
COMPORTEMENT
  Articles existants → UPDATE (via supplier_ref)
  Nouveaux → INSERT, disparus → archivés (is_active=false)
  Devis signés → inchangés (snapshots immuables)
```

---

### US-C03 — Paramétrer le mapping d'une nouvelle marque (V1)

```
CRITÈRES D'ACCEPTATION
✅ catalog_domain renseigné sur 100% des articles
✅ 0 article avec cost_price
✅ Mapping réutilisable pour les prochains imports
```

---

### US-C04 — Comparer deux versions d'un tarif (V2)

```
BESOIN MÉTIER (appris de ServiceTitan Pricebook — versioning des tarifs)
  LIGNIA sait déjà QUEL tarif a été utilisé via import_batch_id.
  La V2 ajoute la comparaison visuelle : +8%, -3%, articles disparus.
  Audit légal possible : "ce devis utilisait le tarif Poujoulat de janvier 2026."

CRITÈRES D'ACCEPTATION V2
✅ Rapport écarts entre 2 batch_id du même fournisseur
✅ Alerte si hausse > 15% sur un article stratégique
✅ GO/NO GO avant import
```

---

### US-C05 — Gérer les fournisseurs actifs par tenant (V1)

```
CRITÈRES D'ACCEPTATION
✅ Activation / désactivation sans perte de données
✅ Recherche filtrée sur fournisseurs actifs uniquement
```

---

### US-C06 — Importer la base ADEME (V1)

```
SOURCE : fichier ADEME mensuel (xlsx)
DONNÉES : marque, modèle, puissance, rendement, Flamme Verte, diamètre buse
RÈGLES : catalog_domain='APPAREIL', is_central=true, pas de cost_price

CRITÈRES D'ACCEPTATION
✅ Appareils visibles dans CatalogPopover onglet "Appareils"
✅ Import mensuel reproductible en une commande
```

---

## BLOC P — PROJET ET CHANTIER

### US-P01 — Créer un projet (V1)

```
CRITÈRES D'ACCEPTATION
✅ Projet lié à un client et une adresse (site/location)
✅ Statuts : prospect → qualified → signed → in_progress → completed
✅ Un projet peut avoir plusieurs devis + plusieurs interventions
```

---

### US-P02 — Visite technique sur mobile (V1)

```
CRITÈRES D'ACCEPTATION
✅ Intervention de type VT créée et accessible offline
✅ Photos + notes + scénario fumisterie (diamètre, longueur)
✅ Sync automatique à la reconnexion
```

---

### US-P03 — Suivre l'avancement des projets (V1)

```
CRITÈRES D'ACCEPTATION
✅ Vue pipeline par statut
✅ Montant HT par stade
```

---

### US-P04 — Clôturer une installation (V1)

```
CRITÈRES D'ACCEPTATION
✅ Attestation de fin de travaux
✅ Numéro de série + garanties enregistrés (→ US-APP-03)
✅ Déclenchement facturation solde
```

---

## BLOC R — RAMONAGE (V1)

### US-R01 — Planifier une tournée de ramonage (V1)

```
CRITÈRES D'ACCEPTATION
✅ Liste clients en retard → création interventions de type RAMONAGE
✅ Notification client (SMS ou email)
```

---

### US-R02 — Enregistrer un ramonage sur mobile (V1)

```
CRITÈRES D'ACCEPTATION
✅ Formulaire < 2 min
✅ Signature client + certificat PDF
✅ Prochaine échéance mise à jour automatiquement
```

---

### US-R03 — Rappels automatiques d'échéances (V1)

```
CRITÈRES D'ACCEPTATION
✅ Notification 2 mois avant
✅ Email client 1 mois avant (configurable)
```

---

## BLOC O — COMMANDE FOURNISSEUR (V2)

### US-O01 — Générer un bon de commande depuis un devis signé (V2)

```
RÈGLE CRITIQUE
  Le BC utilise supplier_ref_snapshot (figé à la création du devis)
  et NON supplier_ref de catalog_items.

CRITÈRES D'ACCEPTATION
✅ BC utilise supplier_ref_snapshot
✅ Regroupement par supplier_name_snapshot
✅ Quantités agrégées si même ref sur plusieurs lignes
✅ Export PDF ou email commercial
```

---

### US-O02 — Export AP Bills vers logiciel comptable (V2)
**En tant que Comptable (Sabrina), je veux exporter les achats fournisseurs vers Pennylane.**

```
BESOIN MÉTIER (appris de ServiceTitan Accounting v2 — AP Bills + MarkAsExported)
  ServiceTitan synchronise les achats fournisseurs vers les logiciels comptables
  via un mécanisme AP Bills avec statut d'export (MarkAsExported).

  Pour LIGNIA : les bons de commande fournisseurs doivent être exportables
  vers Pennylane, Sage ou tout logiciel compatible.

MODÈLE
  purchase_order → ap_bill (quand la commande est reçue et facturée)
  ap_bill : numero_facture_fournisseur, montant_ht, TVA, statut_export
  Export : CSV/JSON compatible Pennylane ou FEC

CRITÈRES D'ACCEPTATION V2
✅ Export bons de commande fournisseurs vers CSV comptable
✅ Statut "exporté" pour éviter les doubles exports
✅ Numéro de facture fournisseur enregistrable
```

---

## BLOC FAC — FACTURATION

### US-FAC-01 — Conversion devis en facture (V2)

```
CRITÈRES D'ACCEPTATION
✅ Conversion en 1 clic
✅ Numérotation automatique
✅ Ventilation TVA par taux (5.5% rénovation / 20% neuf)
```

---

### US-FAC-02 — Export comptable FEC / Facture-X (V3)

```
CRITÈRES D'ACCEPTATION V3
✅ Export FEC compatible logiciels comptables
✅ Format Facture-X (norme française e-facture)
✅ Séparation installation / maintenance / SAV
```

---

## BLOC PLN-RÉSEAU — FRANCHISE / RÉSEAU (V3)

### US-RESEAU-01 — Vue agrégée réseau (V3)
**En tant que Responsable réseau (PER012 — Claire-Marie), je veux voir les KPIs consolidés.**

```
BESOIN MÉTIER
  Jotul France veut voir combien de Jotul ont été vendus sur son réseau,
  quelles installations sont actives, quel est le taux d'entretien.

CRITÈRES D'ACCEPTATION V3
✅ Vue agrégée multi-tenants (franchisés autorisés)
✅ Appareils vendus par marque par période
✅ Taux de contrat d'entretien
✅ Données anonymisées (pas d'infos client exposées)
```

---

## BLOC AUTH — MULTI-TENANT

### US-AUTH01 — Isolation multi-tenant (V1)

```
CRITÈRES D'ACCEPTATION
✅ RLS activée sur toutes les tables (INVARIANT 6)
✅ Catalogue central partagé (is_central=true, tenant_id=NULL)
✅ JWT contient tenant_id (non forgeable)
```

---

## BLOC MAIN — MAINTENANCE SUPER_ADMIN

### US-MAIN-01 — Monitoring imports (V2)

```
CRITÈRES D'ACCEPTATION V2
✅ Table import_runs avec status, counts, timestamps
✅ Répartition par catalog_domain
✅ Alerte si import partiel ou en échec
```

---

### US-MAIN-02 — Rollback import (V1)

```
CRITÈRES D'ACCEPTATION
✅ Rollback par batch_id, devis signés non affectés
```

---

## BLOC NORM — GOUVERNANCE NORMALISATION (V2)

### US-NORM-01 — Articles non normalisés

```
CRITÈRES D'ACCEPTATION V2
✅ Vue par domain, normalization_status='needs_review'
✅ SUPER_ADMIN peut valider ou marquer 'ai_normalized'
```

---

### US-NORM-02 — Familles canoniques LIGNIA

```
FAMILLES : conduit_double_paroi | conduit_simple_paroi | conduit_concentrique
           tubage_flexible | sortie_de_toit | raccordement | accessoire

CRITÈRES D'ACCEPTATION V2
✅ Table famille_fournisseur → famille_canonique_LIGNIA
```

---

## BLOC V — VOIX ET IA (V3)

### US-V01 — Ligne devis par la voix (V3)

```
PRÉREQUIS (non satisfaits en V1)
  angle_deg, diameter_inner_mm, technology_type = null pour Poujoulat V1
  → Remplir en V2 (normalization job)

CRITÈRES V3
✅ Extraction entités → search filtré sur catalog_domain='FUMISTERIE' → ajout < 2s
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
| discount_allowed | Remise interdite | ✅ |
| normalization_status | needs_review / ai_normalized | ✅ |
| import_batch_id | Traçabilité / rollback + historique prix | ✅ |

### Champs installation (parc installé)

| Champ | Usage | Source |
|---|---|---|
| appliance_id | Lien vers heating_appliances | Clôture chantier |
| serial_number | N° série pour garantie fabricant | Saisie technicien |
| installed_on | Date mise en service | Saisie technicien |
| warranty_manufacturer_end | Fin garantie fabricant | Calculé auto |
| warranty_provider_end | Fin garantie artisan | Calculé auto |
| next_sweep_date | Prochaine échéance ramonage | Calculé auto |
| diameter_installed_mm | Diamètre réel posé | Saisie technicien |

### Valeurs catalog_domain (RÈGLE A)

| Valeur | Usage |
|---|---|
| FUMISTERIE | Conduits, accessoires, tubage |
| APPAREIL | Poêles, inserts, chaudières |
| PRESTATION | Pose, ramonage, entretien, SAV |
| PIECE_DETACHEE | Joints, vitres, cartes électroniques |

### Champs quote_lines (snapshots INVARIANT 4)

| Champ | Rôle | Statut |
|---|---|---|
| supplier_ref_snapshot | Code fournisseur figé | ✅ |
| supplier_name_snapshot | Fournisseur figé | ✅ |
| unit_cost_price | Coût net figé (marge) | ✅ |
| metadata.pricing | Pricing complet figé | ✅ |
| vat_rate | TVA figée | ✅ |

---

## DETTE TECHNIQUE CONNUE

| Dette | Gravité | Résoudre en |
|---|---|---|
| catalog_domain absent de catalog_items | CRITIQUE | V1 — avant import Lorflex |
| catalog_domain absent de map_supplier.py | CRITIQUE | V1 — avant import Lorflex |
| heating_appliances non branché au QuoteEditor | Critique | V1 après import Poujoulat |
| Objet Intervention (Appointment) non formalisé | Important | V1 |
| Garanties non stockées sur l'installation | Important | V1 clôture chantier |
| Contacts multiples par client non implémentés | Important | V1 |
| Relance devis automatique non implémentée | Important | V1 |
| technology_type null (Poujoulat) | Moyen | V2 |
| diameter_inner_mm null | Moyen | V2 |
| supplier_family_code absent | Fort | V2 avant remises famille |
| Table import_runs absente | Faible | V2 |
| Timeline installation complète | Important | V2 |
| Location/Site comme objet persistant | Important | V2 |
| Tags métier | Faible | V2 |
| AP Bills / export comptable achats | Moyen | V2 |
| Wrap RLS (SELECT auth.jwt()) | Moyen | V2 avant 50k articles |
| Index tenant_supplier_discounts | Moyen | V2 avant 200 remises |
| Tests E2E Playwright | Critique | V2 avant terrain |
| Export FEC / Facture-X | Moyen | V3 |
| Catalogue SAV fabricants | Fort | V3 |
| Predicted replacement date | Faible | V3 |
| Réseau / franchise (PER012) | Faible | V3 |
