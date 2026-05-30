# LIGNIA — Roadmap 6 semaines vers 5 artisans pilotes
> Claude Analytics — Mai 2026
> Basé sur : Audit factuel Read + User Stories v3.4 + Vision produit
> Objectif : 5 artisans pilotes actifs créant de vrais devis en 6 semaines

---

## PRINCIPES D'EXÉCUTION

```
- Aucun refactoring massif
- Aucune réécriture
- Chaque tâche : indépendante, testable, réversible
- Solo founder : max 1-2 Claude Exec / Lovable par session
- Toujours vérifier ce qui est déjà codé avant de créer
- 5 artisans pilotes = seul critère de succès final
```

---

## RÉALITÉ DE DÉPART (audit factuel)

```
Ce qui MARCHE aujourd'hui :
  ✅ QuoteEditor.tsx — devis complet fonctionnel
  ✅ search_quote_items_v2 — recherche catalogue opérationnelle
  ✅ resolve_item_price — pricing 4 niveaux solide
  ✅ 6 270 articles en base (Joncoux + KEMP + LIGNIA + Poujoulat 3 lignes test)
  ✅ 1 516 appareils ADEME en base
  ✅ quote-pdf.ts — PDF devis opérationnel
  ✅ InterventionCreate/Detail — 84 Ko de code, table existe
  ✅ ServiceRequestCreate/Detail — 52 Ko, table prête
  ✅ InstallationDetail — 26 Ko, table prête
  ✅ InvoiceDetail — table avec 3 factures test
  ✅ 47 tables Postgres — architecture V1 + V2 déjà modélisée

Les 3 vrais gaps V1 :
  🚨 Onglet Appareils non branché → Arnaud ne peut pas vendre de poêles
  🚨 Planning.tsx = stub 679 octets → Amélie ne peut pas planifier
  🚨 Mobile PWA offline → Yohan ne peut pas travailler sans réseau
```

---

## CATÉGORIES

```
A — Déjà codé, non branché (ROI maximal — exploiter avant de créer)
B — À développer réellement (nouveau dev nécessaire)
C — Dette technique (bloque ou fragilise)
D — Vision future (V2/V3 — ne pas toucher maintenant)
```

---

## SEMAINE 1 — Débrider ce qui est prêt

**Objectif :** Un devis complet Poujoulat avec un poêle Jotul peut être créé et envoyé.

### S1-T1 — Importer Poujoulat 16 529 articles [C] [S]

```
Objectif métier : Les 16 529 articles Poujoulat disponibles dans la recherche.
Backend : RPC import_supplier_items, JSON poujoulat_import.json prêt
Frontend : Aucun (invisible pour l'artisan, juste de la data)
Dépendances : JSON poujoulat_import.json (070e0e2f) disponible dans Codespaces
Effort : S (30 minutes)
Risque : Faible — RPC testée sur 3 lignes, rollback par batch_id

EXÉCUTION :
  cd Codespaces
  git pull
  python scripts/import_supplier_direct.py \
    poujoulat_import.json Poujoulat dbd5a19f-9d11-4ba8-93f7-046b642192ed

TEST :
  Rechercher "coude inox 150" dans le QuoteEditor → articles Poujoulat apparaissent
RÉVERSIBILITÉ : DELETE FROM catalog.catalog_items WHERE import_batch_id = '{batch}'
```

---

### S1-T2 — Configurer remise Poujoulat 40% [C] [S]

```
Objectif métier : Prix nets Poujoulat calculés automatiquement. Sans ça, marge 0%.
Backend : INSERT dans catalog.tenant_supplier_discounts
Frontend : Aucun
Dépendances : S1-T1 terminé
Effort : S (5 minutes, Claude Exec Supabase)
Risque : Zéro — 1 INSERT réversible

SQL :
  INSERT INTO catalog.tenant_supplier_discounts
    (tenant_id, supplier_name, discount_pct, is_active)
  VALUES
    ('dbd5a19f-9d11-4ba8-93f7-046b642192ed', 'Poujoulat', 40, true);

TEST :
  Ajouter article Poujoulat au devis → net_price_ht < unit_price_ht, discount_pct = 40
```

---

### S1-T3 — CHECK SQL cost_price IS NULL [C] [S]

```
Objectif métier : Blindage INVARIANT 2 — aucun script ne peut importer un cost_price.
Backend : ALTER TABLE catalog.catalog_items ADD CONSTRAINT chk_cost_price_null
Frontend : Aucun
Dépendances : S1-T1 terminé (sinon la contrainte bloque l'import)
Effort : S (5 minutes)
Risque : Très faible — contrainte CHECK pure

SQL :
  ALTER TABLE catalog.catalog_items
    ADD CONSTRAINT chk_catalog_items_cost_price_null
    CHECK (cost_price IS NULL);

TEST :
  INSERT INTO catalog.catalog_items (supplier_ref, cost_price) VALUES ('test', 10);
  → doit échouer avec violates check constraint
RÉVERSIBILITÉ : ALTER TABLE catalog.catalog_items DROP CONSTRAINT chk_catalog_items_cost_price_null;
```

---

### S1-T4 — Brancher onglet Appareils dans CatalogPopover [A] [M]

```
Objectif métier : Sophie peut ajouter un poêle Jotul à son devis. Gap V1 réel.
Backend : RPC search_heating_appliances existe + 1 516 appareils ADEME en base
Frontend : Lovable — ajouter onglet "Appareils" dans CatalogPopover existant
Dépendances : Aucune (RPC déjà prête)
Effort : M (1-2 jours Lovable)
Risque : Faible — ajout d'onglet dans composant existant, pas de refacto

SPEC LOVABLE :
  Dans CatalogPopover, ajouter un onglet "Appareils" qui :
  - Appelle search_heating_appliances avec la query utilisateur
  - Affiche marque, modèle, puissance_kw, flamme_verte, prix HT
  - Ajoute l'article avec catalog_domain='APPAREIL'
  - Stocke appliance_id dans la ligne de devis
  Ne pas toucher aux onglets existants.

TEST :
  Ouvrir CatalogPopover → onglet "Appareils" visible
  Chercher "Jotul" → résultats apparaissent
  Ajouter → ligne dans le devis avec prix ADEME
```

---

### S1-T5 — Numérotation devis/facture active [A] [S]

```
Objectif métier : Les devis ont un vrai numéro D-2026-0001. Crédibilité client.
Backend : billing.document_sequences (4 rows) existe déjà mais non branché
Frontend : Vérifier que la RPC de création devis appelle la séquence
Dépendances : Aucune
Effort : S (1-2h Claude Exec)
Risque : Faible — séquences déjà créées, juste à brancher à la création

TEST :
  Créer 3 devis → numéros D-2026-0001, D-2026-0002, D-2026-0003
RÉVERSIBILITÉ : UPDATE billing.document_sequences SET last_number = 0;
```

---

### S1-T6 — 5 vrais devis de validation terrain [B] [S]

```
Objectif métier : Validation que le produit est utilisable par un vrai artisan.
Backend : Aucun
Frontend : Aucun
Dépendances : S1-T1, S1-T2, S1-T4
Effort : S (2h de ta part)
Risque : Zéro tech — risque produit uniquement

CRITÈRES :
  Devis 1 : Poêle granulés + fumisterie concentrique + pose (Arnaud / Ambiance Chaleur)
  Devis 2 : Insert bois + tubage flexible + sortie toit + main d'œuvre
  Devis 3 : Ramonage seul (Luc — PER002)
  Devis 4 : SAV pièce détachée simple (ligne libre)
  Devis 5 : Devis estimatif en 3 minutes (stress test vitesse)

RAPPORT ATTENDU :
  Que manque-t-il ? Qu'est-ce qui est lent ? Qu'est-ce qui bloque ?
  → Alimente directement les semaines 2-4
```

---

**Livrable semaine 1 :** Arnaud peut créer un devis complet (poêle + conduit + pose) en moins de 10 minutes et l'envoyer en PDF.

---

## SEMAINE 2 — Ouvrages et expérience devis

**Objectif :** Le devis passe de 10 minutes à moins de 5 minutes grâce aux ouvrages.

### S2-T1 — catalog_domain colonne + migration [C] [M]

```
Objectif métier : La recherche ne mélange plus fumisterie et pièces SAV.
Backend : ALTER TABLE catalog.catalog_items ADD COLUMN catalog_domain
Frontend : Patch search_quote_items_v2 pour accepter p_catalog_domain
Dépendances : S1-T1 terminé (sinon migration UPDATE de masse)
Effort : M (2-3h Claude Exec)
Risque : Moyen — migration + patch RPC, mais réversible

SQL MIGRATION :
  ALTER TABLE catalog.catalog_items
    ADD COLUMN catalog_domain text
    NOT NULL DEFAULT 'FUMISTERIE'
    CHECK (catalog_domain IN ('FUMISTERIE','APPAREIL','PRESTATION','PIECE_DETACHEE'));

  CREATE INDEX idx_catalog_items_domain
    ON catalog.catalog_items (catalog_domain, supplier_name, is_active);

  -- Appareils ADEME → déjà dans heating_appliances, pas dans catalog_items
  -- Tous les articles actuels = FUMISTERIE par défaut : correct

PATCH map_supplier.py :
  Ajouter catalog_domain = 'FUMISTERIE' dans tous les SUPPLIER_CONFIGS

TEST :
  SELECT catalog_domain, COUNT(*) FROM catalog.catalog_items GROUP BY 1;
  → FUMISTERIE = 6270+
RÉVERSIBILITÉ : ALTER TABLE catalog.catalog_items DROP COLUMN catalog_domain;
```

---

### S2-T2 — Ouvrages / Kits [B] [L]

```
Objectif métier : Argument de vente #1. "Raccordement granulés Ø80/130" = 2 clics.
Backend : Nouvelle table catalog.quote_kits + catalog.quote_kit_lines
          RPC create_kit_from_lines, insert_kit_to_quote
Frontend : Lovable — bouton "Sauvegarder en ouvrage" dans QuoteEditor
           Dropdown "Insérer un ouvrage" au-dessus de la liste d'articles
Dépendances : S1-T1 (données Poujoulat)
Effort : L (5-7 jours total — la feature la plus haute valeur du PILIER 1)
Risque : Moyen — nouvelle table, mais zéro impact sur l'existant

MODÈLE :
  catalog.quote_kits :
    id, tenant_id, name, catalog_domain, description, created_by
  catalog.quote_kit_lines :
    id, kit_id, catalog_item_id, quantity, position, notes

TEST :
  Créer ouvrage "Raccordement granulés Ø80/130" depuis un devis
  Nouveau devis → insérer l'ouvrage → 8 lignes apparaissent avec prix calculés
RÉVERSIBILITÉ : DROP TABLE cascade (nouvelles tables seulement)
```

---

### S2-T3 — Relance automatique devis J+7/J+15 [B] [M]

```
Objectif métier : Amélie ne perd plus de devis silencieusement.
Backend : Supabase Edge Function relance-devis (cron daily)
          Table billing.quote_followups (devis_id, sent_at, type)
Frontend : Badge "À relancer" dans liste devis + dashboard Amélie
Dépendances : Numérotation S1-T5
Effort : M (2-3 jours)
Risque : Faible — Edge Function isolée, n'affecte pas le QuoteEditor

LOGIQUE :
  Quotidien 8h : SELECT quotes WHERE status='sent' AND updated_at < now()-interval '7 days'
  → Notification interne + email optionnel

TEST :
  Envoyer un devis, attendre (ou simuler date) → notification apparaît dans le dashboard
```

---

### S2-T4 — Contacts multiples par client [B] [M]

```
Objectif métier : Facturer Mme Dupont, appeler M. Dupont. Réalité terrain.
Backend : Nouvelle table core.customer_contacts
          (id, customer_id, tenant_id, prenom, nom, role, email, tel, is_primary, is_billing)
Frontend : Section "Contacts" dans ClientDetail.tsx
Dépendances : Aucune
Effort : M (2-3 jours)
Risque : Faible — table nouvelle, ClientDetail.tsx à enrichir

TEST :
  Client Michel → ajouter contact Mme Dupont (comptable, billing email)
  Devis → email d'envoi = email facturation du contact billing
```

---

**Livrable semaine 2 :** Sophie crée un devis complet en moins de 5 minutes grâce aux ouvrages pré-remplis. Amélie voit les devis à relancer.

---

## SEMAINE 3 — Planning Amélie

**Objectif :** Amélie peut planifier les interventions de son équipe depuis un vrai calendrier.

### S3-T1 — Vue planning bureau [A] [L]

```
Objectif métier : Amélie voit qui va où, quand. Douleur #1 des entreprises 1M€.
Backend : operations.interventions existe (1 row), 84 Ko de code frontend existe
Frontend : Lovable — Planning.tsx (stub 679 octets) → vraie vue calendrier
           Composant semaine avec couleurs par type d'intervention
Dépendances : InterventionCreate.tsx déjà existant (32 Ko)
Effort : L (5-7 jours Lovable — c'est la feature la plus visible)
Risque : Moyen — Planning.tsx à écrire, mais le modèle de données est prêt

SPEC LOVABLE :
  Planning.tsx doit afficher :
  - Vue semaine (lundi→dimanche)
  - Colonnes par technicien (Yohan, Félicien, Luc...)
  - Carte par intervention : client, adresse, type (couleur), durée
  - Clic sur carte → InterventionDetail.tsx
  - Bouton + → InterventionCreate.tsx
  - Navigation semaine précédente/suivante
  Utiliser les données de operations.interventions
  NE PAS réécrire InterventionCreate ni InterventionDetail (déjà 84 Ko)

TEST :
  Créer 3 interventions pour Yohan cette semaine → apparaissent dans le planning
  Cliquer → détail
RÉVERSIBILITÉ : Planning.tsx peut être remis à stub sans affecter les données
```

---

### S3-T2 — Branchement Intervention depuis devis signé [A] [M]

```
Objectif métier : Signature du devis → installation planifiable immédiatement.
Backend : Enrichir la RPC sign_quote pour créer automatiquement
          1 intervention de type POSE liée au projet
Frontend : Après signature → redirection vers Planning avec l'intervention pré-créée
Dépendances : S3-T1, InterventionCreate.tsx (existant)
Effort : M (2-3 jours)
Risque : Faible — enrichissement RPC, pas de réécriture

TEST :
  Signer un devis → intervention POSE apparaît dans le planning
  L'intervention est en statut PLANIFIEE avec le bon client et adresse
```

---

### S3-T3 — analytic_code sur interventions [C] [S]

```
Objectif métier : Comptable peut sortir le CA par activité sans ressaisie.
Backend : ALTER TABLE operations.interventions ADD COLUMN analytic_code text
          DEFAULT dérivé du type (POSE=INSTALLATION, RAMONAGE=RAMONAGE, etc.)
Frontend : Aucun (invisible en V1)
Dépendances : Aucune
Effort : S (30 minutes)
Risque : Zéro — colonne nullable

SQL :
  ALTER TABLE operations.interventions
    ADD COLUMN analytic_code text
    GENERATED ALWAYS AS (
      CASE type
        WHEN 'POSE' THEN 'INSTALLATION'
        WHEN 'RAMONAGE' THEN 'RAMONAGE'
        WHEN 'ENTRETIEN' THEN 'ENTRETIEN'
        WHEN 'SAV' THEN 'SAV'
        WHEN 'VT' THEN 'INSTALLATION'
        ELSE 'AUTRE'
      END
    ) STORED;
```

---

### S3-T4 — Fiche intervention mobile (lecture seule offline) [B] [M]

```
Objectif métier : Yohan ouvre sa journée sur son téléphone sans réseau.
Backend : Aucun
Frontend : Ajouter Service Worker dans InterventionDetail.tsx
           Cache les interventions du jour au moment de la connexion
           Accessible en offline lecture seule
Dépendances : InterventionDetail.tsx (52 Ko, existant)
Effort : M (2-3 jours)
Risque : Moyen — PWA service worker, à tester sur vrai mobile

SCOPE V1 (lecture seule) :
  InterventionDetail.tsx → cacheable offline
  Client + adresse + notes briefing + type → lisibles sans réseau
  Écriture offline (photos, compte-rendu) → S4

TEST :
  Ouvrir InterventionDetail, passer en mode avion → fiche toujours lisible
```

---

**Livrable semaine 3 :** Amélie a un vrai planning. Yohan peut voir ses interventions du jour sur mobile.

---

## SEMAINE 4 — Parc installé et SAV

**Objectif :** Quand Michel appelle, Amélie voit le poêle + les garanties en 3 secondes.

### S4-T1 — Enregistrement appareil + garanties à la clôture [A] [M]

```
Objectif métier : Chaque installation a un appareil + 2 dates de garantie.
Backend : core.installations table prête (3 rows)
          Ajouter colonnes si absentes :
          warranty_manufacturer_end, warranty_provider_end,
          serial_number, installed_on, diameter_installed_mm
Frontend : InstallationDetail.tsx (26 Ko, existant) — formulaire de clôture chantier
           Accessible depuis l'intervention POSE terminée
Dépendances : S3-T2 (intervention POSE créée)
Effort : M (2-3 jours)
Risque : Faible — InstallationDetail.tsx existe, migration légère

TEST :
  Clôturer une installation → saisir N° série + garantie 24 mois
  → warranty_manufacturer_end = installed_on + 24 mois calculé auto
RÉVERSIBILITÉ : Colonnes nullables, zéro impact si vide
```

---

### S4-T2 — Badge garantie dans fiche installation [A] [S]

```
Objectif métier : Amélie voit en 2 secondes si la panne est sous garantie.
Backend : Aucun (colonnes déjà là après S4-T1)
Frontend : InstallationDetail.tsx — ajouter badge dynamique :
           🟢 "Sous garantie fabricant jusqu'au JJ/MM/AAAA"
           🔴 "Hors garantie depuis JJ/MM/AAAA"
Dépendances : S4-T1
Effort : S (2-4h Lovable)
Risque : Zéro — affichage pur

TEST :
  Installation avec warranty_manufacturer_end demain → badge vert
  Installation avec warranty_manufacturer_end hier → badge rouge
```

---

### S4-T3 — Devis SAV pré-rempli depuis fiche installation [A] [M]

```
Objectif métier : SAV créé en 2 clics. 52 Ko de code ServiceRequest existe déjà.
Backend : ServiceRequestCreate.tsx existe (32 Ko)
          Ajouter paramètre installation_id au flow de création
Frontend : InstallationDetail.tsx → bouton "Créer devis SAV"
           → ServiceRequestCreate pré-rempli (client, adresse, appareil, type=SAV)
Dépendances : S4-T1, ServiceRequestCreate.tsx (existant)
Effort : M (2-3 jours)
Risque : Faible — branchement entre pages existantes

TEST :
  Fiche installation → clic "Créer devis SAV" → formulaire pré-rempli
  Ajouter pièce (ligne libre) → devis envoyable
```

---

### S4-T4 — Catalogue privé pièces détachées (TENANT_PRIVATE) [A] [S]

```
Objectif métier : Yohan crée une fois "Joint porte MCZ Ego 18€", réutilisable.
Backend : catalog.catalog_items supporte déjà supplier_name='TENANT_PRIVATE'
Frontend : UI dans Catalog.tsx — section "Mes articles" avec formulaire de création
Dépendances : S2-T1 (catalog_domain)
Effort : S (1-2h Lovable)
Risque : Faible — pas de nouveau modèle, juste UI création

TEST :
  Créer "Joint porte MCZ Ego" → 18€ → PIECE_DETACHEE
  Ouvrir CatalogPopover → onglet "SAV/Pièces" → article visible
```

---

### S4-T5 — Prochain ramonage calculé automatiquement [A] [S]

```
Objectif métier : Luc voit automatiquement les clients à ramoner.
Backend : core.installations — vérifier/ajouter next_sweep_date
          TRIGGER : next_sweep_date = installed_on + 12 mois
          Mise à jour après chaque ramonage
Frontend : Onglet dans Installations.tsx : "Ramonages à planifier"
Dépendances : S4-T1
Effort : S (2-4h)
Risque : Faible

TEST :
  Installation du 01/02/2025 → next_sweep_date = 01/02/2026
  Enregistrer ramonage 01/11/2025 → next_sweep_date recalculé = 01/11/2026
```

---

**Livrable semaine 4 :** Amélie voit les garanties. Quand Michel appelle, devis SAV créé en 2 clics. Luc voit les ramonages à planifier.

---

## SEMAINE 5 — Facturation et commande fournisseur

**Objectif :** Le cycle devis → facture → commande fournisseur est fermé.

### S5-T1 — Génération facture depuis devis signé [A] [M]

```
Objectif métier : Sabrina convertit un devis signé en facture en 1 clic.
Backend : billing.invoices existe (3 rows)
          billing.invoice_lines existe (3 rows)
          RPC create_invoice_from_quote (à créer)
Frontend : InvoiceDetail.tsx (11 Ko, existant) à enrichir
           Bouton "Générer facture" sur QuoteDetail (devis signé)
Dépendances : S1-T5 (numérotation)
Effort : M (2-3 jours)
Risque : Moyen — nouvelle RPC, mais modèle de données prêt

INVOICE_TYPE V1 :
  ACOMPTE = facture d'acompte à la signature
  SOLDE = facture de solde à la clôture
  (SITUATION et RETENUE reportées en V2)

TEST :
  Signer devis → bouton "Facture acompte" → F-2026-0001 générée
  Clôturer installation → bouton "Facture solde" → F-2026-0002
```

---

### S5-T2 — accounting_code + analytic_code sur quote_lines/invoice_lines [C] [S]

```
Objectif métier : Export comptable sans ressaisie. Prévu RÈGLE D.
Backend :
  ALTER TABLE billing.quote_lines ADD COLUMN accounting_code text;
  ALTER TABLE billing.invoice_lines ADD COLUMN accounting_code text;
  DEFAULT dérivé de catalog_domain :
    FUMISTERIE → '707'
    APPAREIL → '707'
    PRESTATION → '706'
    PIECE_DETACHEE → '607'
Frontend : Aucun (V1 invisible)
Dépendances : S2-T1 (catalog_domain doit être rempli)
Effort : S (30 minutes)
Risque : Faible — colonnes nullables
```

---

### S5-T3 — Bon de commande fournisseur (génération depuis devis) [B] [L]

```
Objectif métier : Après signature, Amélie passe la commande Poujoulat en 2 clics.
Backend : billing.purchase_orders et purchase_order_lines existent (0 row)
          RPC create_purchase_orders_from_quote
          Règle : utiliser supplier_ref_snapshot, regrouper par supplier_name_snapshot
Frontend : Page PurchaseOrders.tsx (à créer)
           Bouton "Créer commandes fournisseurs" sur QuoteDetail signé
Dépendances : S1-T1 (articles Poujoulat), S5-T1 (facture)
Effort : L (5-7 jours)
Risque : Moyen — RPC à écrire, page à créer, mais tables prêtes

SUPPLIER_REF_SNAPSHOT RÈGLE :
  Le BC utilise TOUJOURS supplier_ref_snapshot de quote_lines
  JAMAIS supplier_ref de catalog_items (peut avoir changé)

TEST :
  Devis avec 5 articles Poujoulat + 2 articles KEMP
  → 2 BCs générés : 1 Poujoulat, 1 KEMP
  → export PDF avec refs + quantités
```

---

### S5-T4 — Export comptable CSV basique (Pennylane/Sage) [B] [M]

```
Objectif métier : Sabrina exporte les factures sans ressaisie.
Backend : Edge Function export-invoices-csv
          Colonnes : N° facture, date, client, HT, TVA, TTC, accounting_code, analytic_code
Frontend : Bouton "Export comptable" dans Invoices.tsx
Dépendances : S5-T1, S5-T2
Effort : M (2-3 jours)
Risque : Faible — Edge Function isolée, lecture seule

FORMAT CSV :
  Compatible import manuel Pennylane
  Statut export_status = 'EXPORTED' après téléchargement

TEST :
  3 factures → export CSV → ouvrir dans Excel → colonnes correctes
```

---

**Livrable semaine 5 :** Devis → facture → commande fournisseur → export comptable. Le cycle est fermé.

---

## SEMAINE 6 — Onboarding 5 artisans pilotes

**Objectif :** 5 artisans pilotes actifs. Pas de nouveau dev — correction terrain uniquement.

### S6-T1 — Préparer l'onboarding de chaque pilote [B] [S]

```
Objectif métier : Chaque pilote peut démarrer en moins de 2h.
Pour chaque artisan pilote :
  1. Créer son tenant Supabase (5 tenants)
  2. Importer ses fournisseurs actifs (Poujoulat minimum)
  3. Configurer ses remises
  4. Créer son premier ouvrage type (Raccordement granulés Ø80/130)
  5. Lui faire créer son premier vrai devis client
Effort : S par pilote (2h/artisan)
```

---

### S6-T2 — Session terrain avec chaque pilote (2h) [B] [S]

```
Objectif métier : Identifier les frictions réelles vs les frictions imaginées.
Format :
  30 min : créer un devis sur son vrai chantier en cours
  30 min : planifier les 3 prochaines interventions
  30 min : enregistrer une installation existante
  30 min : debriefing — qu'est-ce qui manque ?

CRITÈRES D'UN PILOTE ACTIF :
  ✅ A créé au moins 1 devis réel envoyé à un client
  ✅ A planifié au moins 1 intervention
  ✅ Revient seul dans LIGNIA sans aide
```

---

### S6-T3 — Corrections terrain (budget 3 jours) [B] [M]

```
Objectif métier : Corriger les 3 frictions les plus courantes identifiées en S6-T2.
Backend/Frontend : À définir après S6-T2
Règle : Aucune feature nouvelle. Seulement corrections UX et bugs.
Effort : M (3 jours max)
```

---

### S6-T4 — Tests E2E Playwright 5 flows critiques [C] [L]

```
Objectif métier : Filet anti-régression Lovable. Sans ça, chaque session Lovable peut casser.
Flows à couvrir :
  1. Créer devis → ajouter appareil + fumisterie → signer → PDF
  2. Import fournisseur → vérifier COUNT + cost_price=NULL
  3. Créer intervention → apparaît dans planning
  4. Clôturer installation → garanties calculées
  5. Login multi-tenant → isolation RLS
Effort : L (5-7 jours)
Risque de NE PAS le faire : Très élevé — Lovable casse silencieusement
```

---

**Livrable semaine 6 :** 5 artisans pilotes actifs. Tests E2E qui protègent le produit.

---

## TABLEAU RÉCAPITULATIF

| Sem | Tâche | Cat | Effort | Valeur | Objectif pilotes |
|---|---|---|---|---|---|
| S1 | Import Poujoulat 16529 articles | C | S | 🔥🔥🔥 | Débloque devis fumisterie |
| S1 | Remise Poujoulat 40% | C | S | 🔥🔥🔥 | Prix nets corrects |
| S1 | CHECK cost_price IS NULL | C | S | 🔥 | Sécurité invariant |
| S1 | Onglet Appareils CatalogPopover | A | M | 🔥🔥🔥 | Vente de poêles |
| S1 | Numérotation documents | A | S | 🔥🔥 | Crédibilité client |
| S1 | 5 vrais devis validation | B | S | 🔥🔥🔥 | Validation terrain |
| S2 | catalog_domain migration | C | M | 🔥🔥 | Recherche propre |
| S2 | Ouvrages / Kits | B | L | 🔥🔥🔥 | Argument vente #1 |
| S2 | Relance auto devis | B | M | 🔥🔥 | Amélie ne perd plus |
| S2 | Contacts multiples | B | M | 🔥🔥 | Réalité terrain |
| S3 | Vue planning bureau | A | L | 🔥🔥🔥 | Douleur #1 entreprise |
| S3 | Intervention depuis devis signé | A | M | 🔥🔥 | Flow complet |
| S3 | analytic_code interventions | C | S | 🔥 | Comptabilité V2 |
| S3 | Fiche mobile offline (lecture) | B | M | 🔥🔥 | Yohan terrain |
| S4 | Garanties à la clôture | A | M | 🔥🔥🔥 | SAV intelligent |
| S4 | Badge garantie | A | S | 🔥🔥🔥 | Amélie en SAV |
| S4 | Devis SAV depuis installation | A | M | 🔥🔥🔥 | SAV en 2 clics |
| S4 | Catalogue privé TENANT_PRIVATE | A | S | 🔥🔥 | Pièces récurrentes |
| S4 | Next sweep date auto | A | S | 🔥🔥 | Luc ramonage |
| S5 | Facture depuis devis signé | A | M | 🔥🔥 | Cycle fermé |
| S5 | accounting_code / analytic_code | C | S | 🔥 | Export comptable V2 |
| S5 | Bon de commande fournisseur | B | L | 🔥🔥 | Commande Poujoulat |
| S5 | Export CSV comptable | B | M | 🔥🔥 | Sabrina sans ressaisie |
| S6 | Onboarding 5 pilotes | B | S×5 | 🔥🔥🔥 | OBJECTIF FINAL |
| S6 | Sessions terrain 2h chacun | B | S×5 | 🔥🔥🔥 | Validation réelle |
| S6 | Corrections terrain | B | M | 🔥🔥🔥 | Frictions réelles |
| S6 | Tests E2E Playwright | C | L | 🔥🔥 | Protection Lovable |

---

## CE QUI N'EST PAS DANS CE PLAN (D — Vision future)

```
RESPECTER LE PÉRIMÈTRE V1 — Ces features attendent validation pilotes :

  Remises par famille (supplier_family_code) → V2
  Portail client signature électronique → V2
  Timeline installation complète → V2
  Site/Location persistant → V2
  Tags métier → V2
  Comparaison versions tarifaires → V2
  Export FEC / Facture-X complet → V3
  Catalogue SAV fabricants (MCZ...) → V3
  Assistant vocal → V3
  Réseau / franchise → V3
  Prédiction fin de vie appareils → V3
  Habilitations techniciens → V2
  IA interactions → V3
  DTU rules → V3
```

---

## RÈGLE D'OR SOLO FOUNDER

```
Avant de demander à Claude Exec ou Lovable de créer quelque chose :
  1. Vérifier Section 2 de l'audit — est-ce déjà codé ?
  2. Si oui → brancher (A) avant de développer (B)
  3. Chaque session Lovable = 1 feature, 1 test, 1 commit
  4. Jamais 2 features en parallèle
  5. Après chaque semaine → 1 vraie session terrain (même 30 minutes)
     Le feedback terrain > 10 heures de spécification
```
