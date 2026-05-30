# LIGNIA — Roadmap 6 semaines vers 5 artisans pilotes
> Claude Analytics — Mai 2026
> Basé sur : Audit factuel Read + User Stories v3.4 + Vision produit
> Objectif : 5 artisans pilotes actifs créant de vrais devis en 6 semaines

---

## ⛔ VÉRITÉ DU MOMENT — À LIRE EN PREMIER

```
SELECT COUNT(*) FROM catalog.catalog_items WHERE supplier_name='Poujoulat';
→ RÉSULTAT ACTUEL : 3 articles (pas 16 529)

S1-T1 N'EST PAS TERMINÉ.
Toute la roadmap ci-dessous est conditionnelle à cet import.
Aucune autre tâche ne vaut d'être lancée avant que ce COUNT = 16 529.
```

---

## PRINCIPES D'EXÉCUTION

```
- Aucun refactoring massif
- Aucune réécriture
- Chaque tâche : indépendante, testable, réversible
- Solo founder : max 1-2 Claude Exec / Lovable par session
- Toujours vérifier ce qui est déjà codé avant de créer
- 5 artisans pilotes = seul critère de succès final
- RÈGLE D'OR : ne pas produire de nouvelles analyses tant que S1-T1
  n'affiche pas COUNT(*) = 16 529 dans Supabase
```

---

## RÉSERVE OFFLINE — DÉCISION VALIDÉE

```
DÉCISION : L'offline n'est PAS implémenté pour les 5 premiers pilotes.

RÈGLE pour tous les écrans terrain (Interventions, Installations, Chantier) :
  ✅ NE PAS implémenter le Service Worker offline maintenant
  ✅ NE PAS créer de dépendance qui rendrait l'offline impossible plus tard
  ✅ Concevoir les écrans mobiles pour un futur cache local (offline-compatible)

CONCRÈTEMENT pour chaque écran terrain :
  - Données chargées via des hooks React Query (pas de fetch inline)
  - État local UI séparé des données distantes
  - Pas de localStorage pour les données métier
  → Ces patterns permettront d'injecter un cache offline en V2 sans réécriture

OFFLINE V2 : Service Worker + background sync + IndexedDB
  Déclencheur : retour terrain des pilotes confirmant la douleur "zone blanche"
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
  ✅ billing.invoices + billing.purchase_orders — tables prêtes (0 row)
  ✅ 47 tables Postgres — architecture V1 + V2 déjà modélisée

Les 3 vrais gaps V1 :
  🚨 S1-T1 non terminé → 3 articles Poujoulat au lieu de 16 529
  🚨 Onglet Appareils non branché → Arnaud ne peut pas vendre de poêles
  🚨 Planning.tsx = stub 679 octets → Amélie ne peut pas planifier
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

### S1-T1 — Importer Poujoulat 16 529 articles [C] [S] ⛔ BLOQUANT

```
Objectif métier : Les 16 529 articles Poujoulat disponibles dans la recherche.
ÉTAT ACTUEL : 3 articles en base. Import non terminé.
Backend : RPC import_supplier_items, JSON poujoulat_import.json prêt
Frontend : Aucun
Dépendances : JSON poujoulat_import.json disponible dans Codespaces
Effort : S (30 minutes)
Risque : Faible — rollback par batch_id

EXÉCUTION (depuis Codespaces) :
  git pull
  python scripts/import_supplier_direct.py \
    poujoulat_import.json Poujoulat dbd5a19f-9d11-4ba8-93f7-046b642192ed

VÉRIFICATION OBLIGATOIRE :
  SELECT COUNT(*), MIN(unit_price_ht), MAX(unit_price_ht)
  FROM catalog.catalog_items
  WHERE supplier_name = 'Poujoulat';
  → COUNT = 16 529 (± 50)
  → MIN entre 1€ et 15€
  → MAX entre 5 000€ et 15 000€

RÉVERSIBILITÉ : DELETE FROM catalog.catalog_items WHERE import_batch_id = '{batch}';
```

---

### S1-T2 — Configurer remise Poujoulat 40% [C] [S]

```
Objectif métier : Prix nets Poujoulat calculés automatiquement. Sans ça, marge 0%.
Dépendances : S1-T1 terminé
Effort : S (5 minutes)

SQL :
  INSERT INTO catalog.tenant_supplier_discounts
    (tenant_id, supplier_name, discount_pct, is_active)
  VALUES
    ('dbd5a19f-9d11-4ba8-93f7-046b642192ed', 'Poujoulat', 40, true)
  ON CONFLICT (tenant_id, supplier_name) DO UPDATE
    SET discount_pct = 40, is_active = true;

TEST : article Poujoulat → net_price_ht < unit_price_ht, discount_pct = 40
```

---

### S1-T3 — CHECK SQL cost_price IS NULL [C] [S]

```
Objectif métier : Blindage INVARIANT 2.
Dépendances : S1-T1 terminé
Effort : S (5 minutes)

SQL :
  ALTER TABLE catalog.catalog_items
    ADD CONSTRAINT chk_catalog_items_cost_price_null
    CHECK (cost_price IS NULL);

TEST : INSERT avec cost_price > 0 → doit échouer
RÉVERSIBILITÉ : DROP CONSTRAINT chk_catalog_items_cost_price_null;
```

---

### S1-T4 — Brancher onglet Appareils dans CatalogPopover [A] [M]

```
Objectif métier : Sophie peut ajouter un poêle Jotul à son devis. Gap V1 réel.
Backend : RPC search_heating_appliances + 1 516 appareils ADEME = déjà en base
Frontend : Lovable — ajout onglet "Appareils" dans CatalogPopover existant
Dépendances : Aucune (RPC déjà prête)
Effort : M (1-2 jours Lovable)

SPEC LOVABLE :
  Onglet "Appareils" dans CatalogPopover :
  - Appelle search_heating_appliances avec la query
  - Affiche marque, modèle, puissance_kw, flamme_verte, prix HT
  - Ajoute l'article avec catalog_domain='APPAREIL'
  - Stocke appliance_id dans la ligne de devis
  NE PAS toucher aux onglets existants.

TEST : Chercher "Jotul" → résultats → ajouter → ligne dans le devis
```

---

### S1-T5 — Ouvrages / Kits [B] [L] ← remonté de S2

```
Objectif métier : Argument de vente #1. "Raccordement granulés Ø80/130" = 2 clics.
Sans ouvrage : Sophie cherche 8 articles un par un. Avec ouvrage : 2 clics.
Les artisans achètent du temps — c'est la première chose qu'ils veulent voir.

Backend : Nouvelles tables catalog.quote_kits + catalog.quote_kit_lines
          RPC create_kit_from_lines, insert_kit_to_quote
Frontend : Lovable — bouton "Sauvegarder en ouvrage" dans QuoteEditor
           Dropdown "Insérer un ouvrage" dans CatalogPopover
Dépendances : S1-T1 (données Poujoulat pour créer les premiers ouvrages réels)
Effort : L (5-7 jours)
Risque : Moyen — nouvelles tables, zéro impact sur l'existant

MODÈLE :
  catalog.quote_kits : id, tenant_id, name, catalog_domain, description, created_by
  catalog.quote_kit_lines : id, kit_id, catalog_item_id, quantity, position

TEST :
  Créer ouvrage "Raccordement granulés Ø80/130" depuis un devis
  Nouveau devis → insérer l'ouvrage → 8 lignes avec prix calculés
RÉVERSIBILITÉ : DROP TABLE cascade (nouvelles tables seulement)
```

---

### S1-T6 — Numérotation devis/facture active [A] [S]

```
Objectif métier : Devis avec vrai numéro D-2026-0001. Crédibilité client.
Backend : billing.document_sequences (4 rows) — non branché
Effort : S (1-2h Claude Exec)

TEST : Créer 3 devis → D-2026-0001, D-2026-0002, D-2026-0003
RÉVERSIBILITÉ : UPDATE billing.document_sequences SET last_number = 0;
```

---

### S1-T7 — 5 vrais devis de validation terrain [B] [S]

```
Dépendances : S1-T1, S1-T2, S1-T4
Effort : S (2h)

CRITÈRES :
  Devis 1 : Poêle granulés + fumisterie concentrique + pose
  Devis 2 : Insert bois + tubage flexible + sortie toit
  Devis 3 : Ramonage seul
  Devis 4 : SAV ligne libre
  Devis 5 : Estimatif en 3 minutes (stress test)

RAPPORT : Que manque-t-il ? Qu'est-ce qui est lent ? → Alimente S2-S4
```

---

**Livrable semaine 1 :** Arnaud crée un devis complet (poêle + conduit + ouvrage + pose) en moins de 5 minutes.

---

## SEMAINE 2 — Qualité devis et CRM de base

**Objectif :** Amélie ne perd plus de devis. Sophie a des contacts multiples par client.

### S2-T1 — catalog_domain colonne + migration [C] [M]

```
Dépendances : S1-T1 terminé
Effort : M (2-3h Claude Exec)

SQL :
  ALTER TABLE catalog.catalog_items
    ADD COLUMN catalog_domain text NOT NULL DEFAULT 'FUMISTERIE'
    CHECK (catalog_domain IN ('FUMISTERIE','APPAREIL','PRESTATION','PIECE_DETACHEE'));

  CREATE INDEX idx_catalog_items_domain
    ON catalog.catalog_items (catalog_domain, supplier_name, is_active);

PATCH map_supplier.py : catalog_domain = 'FUMISTERIE' dans tous les SUPPLIER_CONFIGS
TEST : SELECT catalog_domain, COUNT(*) FROM catalog.catalog_items GROUP BY 1;
RÉVERSIBILITÉ : DROP COLUMN catalog_domain;
```

---

### S2-T2 — Relance automatique devis J+7/J+15 [B] [M]

```
Objectif métier : Amélie ne perd plus de devis silencieusement.
Backend : Edge Function relance-devis (cron daily)
          Table billing.quote_followups (devis_id, sent_at, type)
Frontend : Badge "À relancer" + dashboard Amélie
Effort : M (2-3 jours)

TEST : Devis envoyé → simuler J+7 → notification apparaît
```

---

### S2-T3 — Contacts multiples par client [B] [M]

```
Objectif métier : Facturer Mme Dupont, appeler M. Dupont.
Backend : Table core.customer_contacts
          (id, customer_id, tenant_id, prenom, nom, role, email, tel, is_primary, is_billing)
Frontend : Section "Contacts" dans ClientDetail.tsx
Effort : M (2-3 jours)

TEST : Client Michel → ajouter Mme Dupont → email facturation séparé
```

---

**Livrable semaine 2 :** Amélie voit les devis à relancer. Contacts multiples par client.

---

## SEMAINE 3 — Planning Amélie

**Objectif :** Amélie planifie les interventions depuis un vrai calendrier.

### S3-T1 — Vue planning bureau [A] [L]

```
Objectif métier : "Qui va où, quand ?" — douleur #1 des entreprises 1M€.
Backend : operations.interventions existe, 84 Ko de code frontend existe
Frontend : Lovable — Planning.tsx (stub 679 octets) → vraie vue calendrier
Effort : L (5-7 jours Lovable)

SPEC LOVABLE :
  - Vue semaine lundi→dimanche
  - Colonnes par technicien
  - Carte par intervention : client, adresse, type (couleur), durée
  - Clic → InterventionDetail.tsx
  - Bouton + → InterventionCreate.tsx
  - Navigation semaine précédente/suivante
  NE PAS réécrire InterventionCreate ni InterventionDetail (déjà 84 Ko)

TEST : 3 interventions Yohan → planning, clic → détail
```

---

### S3-T2 — Branchement Intervention depuis devis signé [A] [M]

```
Objectif métier : Signature → intervention POSE créée automatiquement.
Backend : Enrichir sign_quote → crée 1 intervention POSE liée au projet
Frontend : Redirection vers Planning après signature
Dépendances : S3-T1
Effort : M (2-3 jours)

TEST : Signer devis → intervention POSE en statut PLANIFIEE dans le planning
```

---

### S3-T3 — analytic_code sur interventions [C] [S]

```
Objectif métier : Export comptable par activité sans ressaisie.
Backend : GENERATED COLUMN analytic_code dérivé du type
Effort : S (30 minutes)

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

### S3-T4 — Fiche intervention mobile (online, offline-compatible) [A] [M]

```
Objectif métier : Yohan ouvre sa journée sur son téléphone.
Frontend : InterventionDetail.tsx → responsive 390px + React Query hooks
Effort : M (2-3 jours)

RÈGLE ARCHITECTURE MOBILE (voir RÉSERVE OFFLINE) :
  Données via React Query uniquement — pas de fetch() inline
  → Prêt pour cache offline V2 sans réécriture

TEST : InterventionDetail lisible sur iPhone/Android + photos uploadables
```

---

**Livrable semaine 3 :** Amélie a un vrai planning. Yohan utilise ses fiches sur mobile.

---

## SEMAINE 4 — Commande fournisseur + Parc installé + SAV

**Objectif :** Le cycle commercial est complet. Quand Michel appelle, Amélie a l'historique.

> Note : Commande fournisseur remontée en S4 (vs S5 précédemment).
> Le cycle artisan est : chiffre → signe → commande → pose → facture.
> La commande est plus critique que la facture pour le quotidien terrain.

### S4-T1 — Bon de commande fournisseur depuis devis signé [B] [L]

```
Objectif métier : Amélie passe la commande Poujoulat en 2 clics après signature.
Backend : billing.purchase_orders + purchase_order_lines (tables prêtes, 0 row)
          RPC create_purchase_orders_from_quote
          RÈGLE : supplier_ref_snapshot (INVARIANT 4) — jamais supplier_ref live
Frontend : Page PurchaseOrders.tsx (à créer)
           Bouton "Créer commandes fournisseurs" sur QuoteDetail signé
Effort : L (5-7 jours)

TEST :
  Devis avec 5 articles Poujoulat + 2 KEMP
  → 2 BCs : 1 Poujoulat, 1 KEMP
  → PDF avec refs + quantités
```

---

### S4-T2 — Garanties à la clôture chantier [A] [M]

```
Objectif métier : warranty_manufacturer_end + warranty_provider_end sur chaque installation.
Backend : Colonnes à ajouter sur core.installations si absentes
Frontend : InstallationDetail.tsx — formulaire clôture, React Query, mobile responsive
Effort : M (2-3 jours)

TEST : Clôturer → N° série + garantie 24 mois → date fin calculée auto
```

---

### S4-T3 — Badge garantie + SAV en 2 clics [A] [S+M]

```
Objectif métier : Amélie voit la garantie en 2 secondes. SAV créé sans ressaisie.
Frontend :
  InstallationDetail → badge 🟢/🔴 SOUS GARANTIE/HORS GARANTIE
  InstallationDetail → bouton "Créer devis SAV" → ServiceRequestCreate pré-rempli
Effort : S badge + M branchement SAV

TEST :
  warranty_end = demain → badge vert
  warranty_end = hier → badge rouge
  Clic SAV → formulaire pré-rempli client + appareil
```

---

### S4-T4 — Catalogue privé pièces détachées [A] [S]

```
Objectif métier : Yohan crée une fois "Joint MCZ Ego 18€", réutilisable partout.
Backend : catalog_items supporte supplier_name='TENANT_PRIVATE' — déjà là
Frontend : UI "Mes articles" dans Catalog.tsx
Dépendances : S2-T1 (catalog_domain)
Effort : S (1-2h Lovable)

TEST : Créer pièce → PIECE_DETACHEE → visible dans onglet SAV/Pièces
```

---

### S4-T5 — Next sweep date auto + génération facture [A+B] [S+M]

```
S4-T5a — Ramonage :
  next_sweep_date = installed_on + 12 mois (TRIGGER)
  Onglet "Ramonages à planifier" dans Installations.tsx
  Effort : S

S4-T5b — Facture depuis devis signé :
  billing.invoices + RPC create_invoice_from_quote
  INVOICE_TYPE V1 : ACOMPTE (signature) + SOLDE (clôture)
  Bouton "Générer facture" sur QuoteDetail signé
  Effort : M (2-3 jours)
```

---

**Livrable semaine 4 :** Devis → commande fournisseur → facture. Garanties visibles. SAV en 2 clics.

---

## SEMAINE 5 — Export comptable + 5 pilotes

**Objectif :** Sabrina peut exporter. 5 pilotes actifs.

### S5-T1 — accounting_code + analytic_code [C] [S]

```
Backend :
  ALTER TABLE billing.quote_lines ADD COLUMN accounting_code text;
  ALTER TABLE billing.invoice_lines ADD COLUMN accounting_code text;
  DEFAULT : FUMISTERIE→'707', APPAREIL→'707', PRESTATION→'706', PIECE_DETACHEE→'607'
Dépendances : S2-T1 (catalog_domain)
Effort : S (30 minutes)
```

---

### S5-T2 — Export CSV comptable basique [B] [M]

```
Backend : Edge Function export-invoices-csv
Frontend : Bouton "Export comptable" dans Invoices.tsx
Colonnes : N° facture, date, client, HT, TVA, TTC, accounting_code, analytic_code
Compatible : import manuel Pennylane / Sage
Effort : M (2-3 jours)

TEST : 3 factures → CSV → colonnes correctes dans Excel
```

---

### S5-T3 — Onboarding 5 pilotes [B] [S×5]

```
Pour chaque pilote :
  1. Créer son tenant
  2. Importer ses fournisseurs
  3. Configurer ses remises
  4. Créer son premier ouvrage type
  5. Créer son premier vrai devis client
Effort : S par pilote (2h/artisan)
```

---

### S5-T4 — Sessions terrain 2h × 5 pilotes [B] [S×5]

```
Format par session :
  30 min : vrai devis sur vrai chantier
  30 min : planifier 3 interventions
  30 min : enregistrer une installation existante
  30 min : debriefing frictions

CRITÈRES PILOTE ACTIF :
  ✅ 1 devis réel envoyé à un client
  ✅ 1 intervention planifiée
  ✅ Revient seul dans LIGNIA

NOTE OFFLINE :
  Si 2+ pilotes mentionnent "zone blanche" spontanément
  → offline V2 passe en priorité haute
```

---

## SEMAINE 6 — Corrections terrain + Tests E2E

**Objectif :** Corrections des frictions réelles. Protection Lovable.

### S6-T1 — Corrections terrain (budget 3 jours) [B] [M]

```
Règle : Aucune feature nouvelle. Corrections UX et bugs uniquement.
À définir après les sessions terrain S5-T4.
```

---

### S6-T2 — Tests E2E Playwright 5 flows critiques [C] [L]

```
Flows :
  1. Créer devis → ajouter appareil + fumisterie → signer → PDF
  2. Import fournisseur → COUNT + cost_price=NULL
  3. Créer intervention → apparaît dans planning
  4. Clôturer installation → garanties calculées
  5. Login multi-tenant → isolation RLS
Effort : L (5-7 jours)
Risque de NE PAS le faire : Lovable casse silencieusement
```

---

## VERSIONS TARIFAIRES — DETTE V2 IDENTIFIÉE

```
Contexte : identifié par OpenAI comme angle mort important.

Dans 6-12 mois, LIGNIA recevra :
  Poujoulat 2027, Lorflex 2027, Joncoux 2027, Dinak 2027...

La gestion de versions tarifaires (US-C04) est absente de la roadmap V1.
À implémenter en V2, après validation des 5 pilotes.

ÉPIC V2 — VERSIONS TARIFAIRES :
  1. Comparer batch_id N vs N+1 (nouveaux, modifiés, supprimés)
  2. Rapport diff : +8%, -3%, 127 articles disparus
  3. Alerte si hausse > 15% sur article stratégique
  4. GO/NO GO avant activation
  5. Archivage articles disparus (is_active=false) au lieu de DELETE
  6. Historique devis : "ce devis utilisait le tarif Poujoulat du 15/01/2026"

DÉPENDANCES :
  import_batch_id existe déjà sur catalog_items ✅
  is_active existe déjà ✅
  Reste à créer : catalog.import_runs (log des imports) + UI comparaison
```

---

## TABLEAU RÉCAPITULATIF

| Sem | Tâche | Cat | Effort | Valeur |
|---|---|---|---|---|
| S1 | ⛔ Import Poujoulat 16529 | C | S | 🔥🔥🔥 |
| S1 | Remise Poujoulat 40% | C | S | 🔥🔥🔥 |
| S1 | CHECK cost_price IS NULL | C | S | 🔥 |
| S1 | Onglet Appareils CatalogPopover | A | M | 🔥🔥🔥 |
| S1 | **Ouvrages / Kits** ← remonté | B | L | 🔥🔥🔥 |
| S1 | Numérotation documents | A | S | 🔥🔥 |
| S1 | 5 vrais devis validation | B | S | 🔥🔥🔥 |
| S2 | catalog_domain migration | C | M | 🔥🔥 |
| S2 | Relance auto devis | B | M | 🔥🔥 |
| S2 | Contacts multiples | B | M | 🔥🔥 |
| S3 | Vue planning bureau | A | L | 🔥🔥🔥 |
| S3 | Intervention depuis devis signé | A | M | 🔥🔥 |
| S3 | analytic_code interventions | C | S | 🔥 |
| S3 | Fiche mobile (online, offline-compatible) | A | M | 🔥🔥 |
| S4 | **Bon de commande** ← remonté | B | L | 🔥🔥🔥 |
| S4 | Garanties à la clôture | A | M | 🔥🔥🔥 |
| S4 | Badge garantie + SAV 2 clics | A | S+M | 🔥🔥🔥 |
| S4 | Catalogue privé TENANT_PRIVATE | A | S | 🔥🔥 |
| S4 | Next sweep date + Facture | A+B | S+M | 🔥🔥 |
| S5 | accounting_code / analytic_code | C | S | 🔥 |
| S5 | Export CSV comptable | B | M | 🔥🔥 |
| S5 | Onboarding 5 pilotes | B | S×5 | 🔥🔥🔥 |
| S5 | Sessions terrain | B | S×5 | 🔥🔥🔥 |
| S6 | Corrections terrain | B | M | 🔥🔥🔥 |
| S6 | Tests E2E Playwright | C | L | 🔥🔥 |

---

## CE QUI N'EST PAS DANS CE PLAN

```
V2 — Après validation 5 pilotes :
  Versions tarifaires fournisseurs (Epic complète ci-dessus)
  Offline complet (Service Worker + IndexedDB)
  Remises par famille
  Portail client signature
  Timeline installation complète
  Site/Location persistant
  Tags métier
  Habilitations techniciens

V3 :
  Export FEC / Facture-X
  Catalogue SAV fabricants
  Assistant vocal
  Réseau / franchise
  Prédiction fin de vie
```

---

## RÈGLE D'OR SOLO FOUNDER

```
Avant de demander à Claude Exec ou Lovable de créer quelque chose :
  1. Vérifier Section 2 de l'audit — est-ce déjà codé ?
  2. Si oui → brancher (A) avant de développer (B)
  3. Chaque session Claude Exec / Lovable = 1 tâche, 1 test, 1 commit
  4. Jamais 2 tâches en parallèle
  5. Après chaque semaine → 1 session terrain (même 30 minutes)
     Le feedback terrain > 10 heures de spécification

RÈGLE MOBILE (RÉSERVE OFFLINE) :
  Tout hook de données sur écran terrain = React Query
  Pas de fetch() inline dans les composants mobiles
  → Cache offline V2 injectable sans réécriture
```
