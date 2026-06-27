# LIGNIA_FUNCTIONAL_GAP_ANALYSIS_V1

> Audit de couverture fonctionnelle — LIGNIA vs Evoliz API v1.43
> Lecture seule — aucune migration — aucun ticket — aucune architecture
> Date : 27 juin 2026
> Sources : API Evoliz OpenAPI 3.0 (20 399 lignes) + GitHub LIGNIA + Supabase réel

---

## PÉRIMÈTRE ET MÉTHODE

**Evoliz** est un ERP/CRM généraliste français pour PME. Il couvre toute la chaîne commerciale + comptabilité complète + banque.

**LIGNIA** est un CRM/mini-ERP **vertical** pour artisans bois énergie. Il ne fait pas la comptabilité — il l'exporte vers Evoliz, Pennylane, Sage, EBP.

**Ce document** identifie les capacités métier présentes dans Evoliz qui sont pertinentes pour LIGNIA, et les classe par version.

### Légende

| Symbole | Signification |
|---|---|
| ✅ | Existe et fonctionnel dans LIGNIA |
| ⚠️ | Existe partiellement dans LIGNIA |
| ❌ | Absent de LIGNIA |
| 🚫 | Hors périmètre volontaire (délégué à Evoliz/Pennylane/Sage) |

### Versions

- **V1** = pilote 5 artisans — maintenant
- **V2** = après pilote — prochaine itération
- **V3** = écosystème réseau — horizon 18 mois

---

## 1. CRM — CLIENTS, PROSPECTS, CONTACTS

### 1.1 Clients

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| Créer / modifier un client | ✅ CRUD complet | ✅ ClientCreate + ClientEdit | V1 ✅ | |
| Types client (Particulier / Pro / Admin publique) | ✅ `type: part/pro/gov` | ⚠️ Pas de type formalisé | V2 | Utile pour TVA et CGV |
| Code client unique | ✅ `code` auto-généré | ❌ Absent | V2 | Utile pour export comptable |
| Numéro de TVA intracommunautaire | ✅ `vat_number` | ❌ Absent | V2 | Nécessaire pour B2B professionnel |
| Numéro SIRET / SIREN | ✅ `immat_number` | ❌ Absent | V2 | Nécessaire facturation électronique |
| Forme juridique | ✅ `legalform` | ❌ Absent | V2 | |
| Archivage client (actif/inactif) | ✅ `enabled` | ⚠️ Non exposé dans l'UI | V2 | |
| Filtrage par pays, TVA, code | ✅ Filtres avancés | ❌ Recherche texte uniquement | V2 | |
| Garantie de paiement (safe_amount) | ✅ `safe_amount` | 🚫 | Jamais | Comptabilité déléguée |

### 1.2 Prospects

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| Objet Prospect distinct du Client | ✅ `/prospects` endpoint séparé | ❌ Absent — le projet porte le statut "prospect" | V2 | Dans LIGNIA, un client en statut "Prospect" est le pattern actuel |
| Conversion Prospect → Client | ✅ Action dédiée | ❌ Absent | V2 | Utile pour traçabilité pipeline |
| Pipeline commercial prospects | ✅ Via statuts | ⚠️ Via `core.projects` statuts | V1 ⚠️ | |

### 1.3 Contacts multiples

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| N contacts par client | ✅ `/contact-clients` endpoint | ❌ `core.customer_contacts` absente | V1 ❌ | Bloquant pour entreprises multi-interlocuteurs |
| Contact principal | ✅ | ❌ | V1 | |
| Contact prospect | ✅ `/contact-prospects` | ❌ | V2 | |
| Rôle du contact | ✅ Libre | ❌ | V1 | |
| Email / tél / mobile par contact | ✅ | ❌ | V1 | |

### 1.4 Adresses

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| Adresse principale client | ✅ `address` (addr, addr2, addr3, postcode, town, iso2) | ✅ Dans `core.customers` | V1 ✅ | |
| Adresse de livraison distincte | ✅ `delivery_address` sur documents | ❌ Absent | V2 | Utile si chantier ≠ domicile client |
| Multi-sites client (N adresses) | ✅ Via contact addresses | ⚠️ `core.properties` présent mais non exploité | V2 | |

### 1.5 Communication

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| Envoi devis par email depuis le logiciel | ✅ `/quotes/{id}/send` avec champs dynamiques | ❌ PDF généré mais envoi email absent | V2 | |
| Envoi facture par email | ✅ `/invoices/{id}/send` | ❌ | V2 | |
| Relances automatiques (Recovery) | ✅ Module complet `/recovery` | ❌ `quote_followups` absente | V1 ❌ | Douleur forte d'Amélie |
| Webdoc (lien web vers document) | ✅ `webdoc` URL sur tous les docs | ❌ | V3 | Portail client |
| Templates email dynamiques | ✅ Champs `{DOCNUM}`, `{CLIENT}`, etc. | ❌ | V2 | |

---

## 2. CATALOGUE

### 2.1 Articles / Produits

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| Catalogue articles (référence, désignation, prix, TVA, unité) | ✅ `/articles` CRUD | ✅ `catalog.catalog_items` — 22 796 articles | V1 ✅ | |
| Référence article | ✅ `reference` | ✅ `supplier_ref` | V1 ✅ | |
| Désignation article | ✅ `designation` | ✅ `name` / `normalized_name` | V1 ✅ | |
| Prix unitaire HT | ✅ `unit_price` | ✅ `unit_price_ht` | V1 ✅ | |
| Taux TVA par article | ✅ `vatid` lié à un référentiel TVA | ✅ `vat_rate` — doctrine D-25 | V1 ✅ | Doctrine TVA en cours de validation |
| Unité (u, h, m, m²...) | ✅ `unit_code` référentiel | ⚠️ `unit` TEXT libre — pas de référentiel | V2 | |
| Archivage article (actif/inactif) | ✅ `enabled` | ⚠️ `is_active` existe, DELETE physique à corriger (BUG-02) | V1 ⚠️ | |
| Familles / catégories article | ✅ Classification vente/achat | ✅ `item_family`, `catalog_domain` | V1 ✅ | `catalog_domain` à migrer |
| Description longue | ✅ `description` HTML | ⚠️ `technical_description` présent, non affiché | V2 | |
| Compte comptable par article | ✅ `sale_classificationid` → compte 706/707 | ⚠️ `accounting_code` prévu, non rempli | V2 | |
| Coût d'achat / prix de revient | ✅ `purchase_price` | 🚫 `cost_price = NULL` INVARIANT 2 | 🚫 | Délégué à resolve_item_price |
| Variantes / options | ❌ Non dans l'API v1.43 | ❌ | Jamais | Hors périmètre fumisterie |
| Stock | ✅ Partiel (quantités) | 🚫 | Jamais | Pas de gestion de stock artisan |
| Import catalogue en masse | ✅ Via interface | ✅ Pipeline staging multi-fournisseurs | V1 ✅ | |

### 2.2 Prestations

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| Article de type service | ✅ `type: service` | ✅ `product_type = 'service'` | V1 ✅ | |
| Catalogue privé artisan (prestations maison) | ✅ Articles propres à la société | ✅ `supplier_name = 'LIGNIA'` | V1 ✅ | |
| Prestation créée depuis le devis | ⚠️ Ligne libre seulement | ✅ Ligne libre + save_lines_as_bundle | V1 ✅ | |

### 2.3 Appareils

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| Référentiel appareils spécialisé | 🚫 Généraliste | ✅ `catalog.heating_appliances` — 1 516 appareils ADEME | V1 ✅ | Différenciant LIGNIA |
| Ajout appareil dans le devis | 🚫 | ✅ ApplianceSearchTab branché | V1 ✅ | TVA à corriger (BUG-01 ✅ fait) |
| Fiche technique appareil (Flamme Verte, rendement) | 🚫 | ⚠️ Données ADEME présentes, non affichées dans PDF | V2 | |

### 2.4 Pièces SAV

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| Catalogue pièces détachées | ✅ Articles standards | ⚠️ Supporté via `catalog_domain = 'PIECE_DETACHEE'`, UI absente | V1 ⚠️ | |

### 2.5 Remises

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| Remise globale fournisseur | ✅ `discount_term` par client | ✅ `tenant_supplier_discounts` + `resolve_item_price` | V1 ✅ | |
| Remise par famille de produit | ✅ Via classifications | ❌ Colonnes présentes (D-22), logique non implémentée | V2 | |
| Remise par ligne dans le devis | ✅ `discount` par ligne | ✅ `discount_pct` dans `quote_lines` | V1 ✅ | |
| Conditions d'achat par fournisseur | 🚫 Côté achat uniquement | ✅ SupplierDiscounts.tsx complet | V1 ✅ | |

---

## 3. DEVIS

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| Créer un devis | ✅ | ✅ QuoteEditor.tsx | V1 ✅ | |
| Numérotation automatique | ✅ `document_numbers` configurable (modes a/r/m/n) | ✅ Trigger `t1_set_quote_number` | V1 ✅ | |
| Lignes article avec qté, prix, TVA, unité | ✅ `items` | ✅ `billing.quote_lines` | V1 ✅ | |
| Sections visuelles dans le devis | ✅ Items de type "section" | ✅ `billing.quote_sections` | V1 ✅ | |
| Ligne libre (texte sans référence) | ✅ `type: freetext` | ✅ Bouton "Ligne libre" dans QuoteEditor | V1 ✅ | |
| Remise globale sur le devis | ✅ `discount` sur l'ensemble | ❌ Absent — remise par ligne uniquement | V2 | |
| Acompte lié au devis | ✅ `advance` endpoint + `advance_deduction_mode` | ✅ Créé automatiquement à la signature | V1 ✅ | |
| Validité du devis en jours | ✅ `validity` | ❌ Absent | V2 | |
| Objet / intitulé du devis | ✅ `object` | ⚠️ Non exposé dans l'UI | V2 | |
| Conditions de paiement sur le devis | ✅ `paytermid` | ❌ `payment_term` prévu (LEDGER) non implémenté | V2 | |
| Mode de paiement | ✅ `paytypeid` (virement, chèque, CB...) | ❌ | V2 | |
| Signature client | ✅ Via webdoc | ✅ `sign_quote_and_initialize` | V1 ✅ | |
| Statuts devis complets | ✅ filled/create/sent/wait/accept/reject/invoice/close | ⚠️ Statuts partiels (draft/sent/signed) | V2 | |
| Envoi par email | ✅ `/quotes/{id}/send` | ❌ | V2 | |
| Conversion devis → facture | ✅ `/quotes/{id}/invoice` | ✅ Via signature → invoice créée auto | V1 ✅ | |
| Facturation à l'avancement (situation) | ✅ `/quotes/{id}/progress-invoice` | ❌ `invoice_type` prévu, non implémenté | V2 | |
| Avoir sur devis | ✅ `/credits` endpoint | ❌ | V2 | |
| Devis → bon de commande client (sale order) | ✅ `/quotes/{id}/sale-order` | ❌ `billing.sale_orders` vide | V2 | |
| Retenue de garantie BTP | ✅ `retention` sur devis et facture | ❌ | V3 | Rare en bois énergie |
| Primes CEE / MaPrimeRénov dans le devis | ✅ `bonuses` post-TVA sur Quote | ❌ | V2 | Fort levier commercial LIGNIA |
| Ouvrages / Kits réutilisables | 🚫 Ligne libre uniquement | ✅ `save_lines_as_bundle` + réinsertion (à connecter) | V1 ⚠️ | Différenciant LIGNIA |
| Duplication devis | ✅ | ⚠️ `duplicate_quote` RPC existe, front NON VÉRIFIÉ | V1 | |
| Analytique par document | ✅ `analyticid` | ⚠️ `analytic_code` prévu (LEDGER), non implémenté | V2 | |
| Compte comptable par ligne | ✅ `sale_classificationid` | ⚠️ `accounting_code` dans `quote_lines` prévu, vide | V2 | |
| Devise étrangère | ✅ `document_currency` | 🚫 | Jamais | Artisans France uniquement |

---

## 4. COMMANDES FOURNISSEURS

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| Bon de commande fournisseur | ✅ `/buys` endpoint complet | ⚠️ `billing.purchase_orders` existe (0 lignes), front absent | V2 | |
| Regroupement lignes par fournisseur depuis devis | 🚫 Manuel dans Evoliz | ❌ | V2 | Différenciant LIGNIA — auto depuis devis signé |
| Numéro de facture fournisseur externe | ✅ `external_document_number` | ❌ `supplier_invoice_number` prévu | V2 | |
| Réception / livraison | ✅ `/deliveries` endpoint | ❌ `billing.delivery_notes` vide | V2 | |
| Fiche fournisseur | ✅ `/suppliers` endpoint CRUD | ❌ `supplier_name` TEXT dans catalog_items — pas d'entité Supplier | V2 | |
| Avoir fournisseur | ✅ `/supplier-credits` | ❌ | V2 | |
| Bintray (OCR factures fournisseurs) | ✅ Upload PDF → extraction auto | 🚫 | Jamais | Comptabilité déléguée |
| Paiement fournisseur | ✅ | 🚫 | Jamais | Comptabilité déléguée |

---

## 5. FACTURATION

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| Facture d'acompte | ✅ `/advances` endpoint | ✅ Créée auto à la signature | V1 ✅ | |
| Facture solde | ✅ Invoice type standard | ⚠️ `invoice_kind` prévu, non exposé dans l'UI | V2 | |
| Facture de situation (avancement %) | ✅ `progress-invoice` | ❌ | V2 | |
| Avoir client | ✅ `/credits` endpoint | ❌ | V2 | |
| Numérotation automatique factures | ✅ Configurable | ✅ Trigger `t2_set_invoice_number` | V1 ✅ | |
| Statuts facture | ✅ create/inpayment/paid/match | ⚠️ Partiels dans InvoiceDetail | V2 | |
| PDF facture | ✅ Via webdoc | ⚠️ Bouton existant mais désactivé (BUG-04 à faire) | V1 ⚠️ | |
| Envoi facture par email | ✅ `/invoices/{id}/send` | ❌ | V2 | |
| Conditions de paiement snapshotées | ✅ `paytermid` sur la facture | ❌ `payment_term` prévu, non implémenté | V2 | |
| Retenue de garantie BTP | ✅ `retention` | ❌ | V3 | |
| Multi-devises | ✅ | 🚫 | Jamais | |
| Pénalités de retard | ✅ `penalty` par client | ❌ | V2 | |
| Escompte / discount terme | ✅ `discount_term` | ❌ | V2 | |

---

## 6. FACTURATION ÉLECTRONIQUE

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| Factur-X (norme française) | ✅ Export Factur-X | ❌ | V3 | Obligatoire 2026+ pour grandes entreprises, 2027 pour PME |
| Export FEC | ✅ `/accounting/fec` endpoint | ❌ | V2 | Requis pour contrôle fiscal |
| Numéro SIRET sur facture | ✅ Via fiche client | ❌ Champ `immat_number` absent de `core.customers` | V2 | Obligatoire facturation électronique |
| Numéro TVA intracommunautaire | ✅ | ❌ | V2 | |
| Mentions légales obligatoires | ✅ Via templates | ⚠️ CGV attachables au devis, mentions non configurables | V2 | |
| Pénalités de retard sur facture | ✅ | ❌ | V2 | Mention légale obligatoire France |

---

## 7. EXPORTS COMPTABLES

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| Export FEC | ✅ `/accounting/fec` | ❌ | V2 | Priorité haute — requis pour bilan |
| Grand livre | ✅ `/accounting/general-ledger` | 🚫 | Jamais | Comptabilité déléguée |
| Balance des comptes | ✅ `/accounting/trial-balance` | 🚫 | Jamais | Comptabilité déléguée |
| Export ventes | ✅ `/accounting/sale` | ⚠️ Non structuré — via CSV manuel | V2 | |
| Export achats | ✅ `/accounting/purchase` | ❌ | V2 | |
| Axes analytiques configurables | ✅ `/analytics` endpoint | ⚠️ `analytic_code` prévu (LEDGER), non implémenté | V2 | |
| Classifications comptables ventes | ✅ `/sale-classifications` | ⚠️ `accounting_code` dans catalog_items, non rempli | V2 | |
| Classifications comptables achats | ✅ `/purchase-classifications` | 🚫 | Jamais | Côté achat = Evoliz |
| Comptes de Grand Livre (706/707/607) | ✅ `/accounts` endpoint | ⚠️ Valeurs par défaut prévues par `catalog_domain`, non peuplées | V2 | |
| Opening balance | ✅ `/accounting/opening-balance` | 🚫 | Jamais | |
| Export Pennylane / Sage / EBP | 🚫 (Evoliz = le logiciel cible) | ❌ Prévu V2 — format CSV normalisé | V2 | |

---

## 8. PAIEMENTS

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| Enregistrement paiement client | ✅ `/payments` CRUD | ⚠️ `billing.payments` existe (0 lignes), front absent | V2 | |
| Types de paiement (virement, chèque, CB, prélèvement) | ✅ `/payment-types` référentiel | ❌ `payment_type` prévu (LEDGER), non implémenté | V2 | |
| Rapprochement bancaire | ✅ `/bank-items` | 🚫 | Jamais | Comptabilité déléguée |
| Caisse | ✅ `/cash` + `/cash-entries` | 🚫 | Jamais | |
| Rapport impayés | ✅ `/reports/overdue-payment` | ❌ | V2 | Utile pour Amélie — relances |
| Echéancier de paiement | ✅ `paytermid` (30j fin de mois, etc.) | ❌ | V2 | |
| Paiement partiel | ✅ Statut `inpayment` | ❌ | V2 | |

---

## 9. DOCUMENTS PDF

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| PDF devis | ✅ Auto + templates configurables | ✅ jsPDF branché dans QuoteDetail | V1 ✅ | |
| PDF facture | ✅ | ⚠️ Bouton désactivé — BUG-04 | V1 ⚠️ | |
| Logo entreprise sur les documents | ✅ Header/footer configurable | ⚠️ Non configuré via UI | V2 | |
| Modèles de documents (templates) | ✅ 9 types de templates | ❌ Pas de template configurateur | V2 | |
| Mentions légales / CGV | ✅ Via templates | ⚠️ CGV attachables en PDF | V1 ⚠️ | |
| Certificat de ramonage | 🚫 | ❌ Prévu, absent | V1 | Différenciant LIGNIA |
| Attestation fin de travaux | 🚫 | ❌ | V1 | Différenciant LIGNIA |
| Numéro de document sur PDF | ✅ | ✅ Via trigger numérotation | V1 ✅ | |
| Webdoc (URL de partage du document) | ✅ Lien web unique par document | ❌ | V3 | Portail client |
| QR Code / signature électronique | ✅ Via webdoc | ❌ | V3 | |

---

## 10. ARCHITECTURE SAAS MULTI-TENANT

| Fonctionnalité | Evoliz | LIGNIA | Version | Commentaire |
|---|---|---|---|---|
| Isolation données par entreprise | ✅ `companyid` sur tous les endpoints | ✅ RLS Supabase + `tenant_id` JWT | V1 ✅ | |
| Multi-utilisateurs par entreprise | ✅ Scopes détaillés (admin, sell_user, etc.) | ⚠️ Rôles basiques (admin/user/super_admin) | V2 | |
| Visibilité par utilisateur (user view vs company view) | ✅ Scope `sell_user`, `client_user`, etc. | ❌ Tout le tenant voit tout | V2 | |
| Droits par menu / fonctionnalité | ✅ 36 scopes listés | ❌ Binaire admin/user | V2 | |
| Numérotation documents configurable | ✅ Modes a/r/m/n par type de document | ✅ `billing.document_sequences` — triggers actifs | V1 ✅ | |
| Paramétrage entreprise (logo, mentions) | ✅ `/company-settings` | ⚠️ `core.tenants` présent, UI de paramétrage absente | V2 | |
| API publique | ✅ REST complète | ❌ | V3 | |
| Webhooks / événements | ✅ `/events` endpoint | ⚠️ `core.activities` log immuable, pas de webhook | V3 | |
| Abonnement / subscription | ✅ `/subscription` | ❌ Billing LIGNIA non implémenté | V3 | |

---

## FONCTIONNALITÉS EVOLIZ HORS PÉRIMÈTRE LIGNIA

Ces fonctionnalités existent dans Evoliz et sont **délibérément exclues** de LIGNIA (déléguées aux logiciels comptables).

| Module Evoliz | Raison exclusion LIGNIA |
|---|---|
| Grand livre / Balance / FEC interne | Comptabilité complète = Evoliz/Pennylane/Sage |
| Rapprochement bancaire | Banque = logiciel comptable |
| Caisse | Logiciel comptable |
| Bintray (OCR factures fournisseurs) | Logiciel comptable |
| Journaux comptables (OD, AN) | Logiciel comptable |
| Paiements fournisseurs | Logiciel comptable |
| Multi-devises | Artisans France uniquement |
| Stock / inventaire | Pas de gestion stock artisan |
| Variantes produits | Hors fumisterie |

---

## FONCTIONNALITÉS LIGNIA SANS ÉQUIVALENT EVOLIZ

Ces fonctionnalités sont des **différenciants LIGNIA** — Evoliz ne les a pas.

| Fonctionnalité LIGNIA | Valeur métier |
|---|---|
| Catalogue fumisterie central (22 796 articles, 4 fournisseurs) | Recherche "coude 150" en 2 secondes |
| Moteur de remises fournisseurs par barème | Calcul automatique prix achat par famille |
| Appareils ADEME (1 516 références, Flamme Verte, MaPrimeRénov) | Devis avec appareil éligible aux aides |
| Ouvrages / kits réutilisables | "Raccordement granulés" en 1 clic |
| Parc installé (core.installations) | Historique 15 ans par appareil |
| Interventions terrain avec types métier | VT / Pose / Ramonage / SAV en 1 objet |
| Commissioning (mise en service) | Cloture chantier + garanties auto-calculées |
| SAV depuis la fiche installation | Accès historique au moment de l'appel |
| Fournisseurs actifs par tenant (tenant_suppliers) | Sophie ne voit que Poujoulat et Joncoux |
| Doctrine TVA bois énergie (D-25) | 5.5% par défaut pour 80% des chantiers |
| Certificat de ramonage (prévu) | Document métier inexistant dans les ERP |

---

## SYNTHÈSE PAR VERSION

### V1 — Pilote 5 artisans (maintenant)

**Manques bloquants à corriger :**
- Contacts multiples par client (`core.customer_contacts`)
- PDF facture (BUG-04 — bouton désactivé)
- Relances devis automatiques (douleur Amélie)

**Manques importants mais contournables :**
- Envoi email depuis le logiciel (PDF téléchargé + envoi manuel)
- Validité du devis en jours
- Numéro SIRET / code client

### V2 — Après pilote

**Priorité haute :**
- Export FEC (requis pour comptabilité)
- Types de factures (ACOMPTE / SITUATION / SOLDE / AVOIR)
- Bon de commande fournisseur depuis devis signé
- Conditions de paiement snapshotées
- SIRET + TVA intracommunautaire sur fiche client
- Envoi email devis et facture
- Primes CEE / MaPrimeRénov dans le devis

**Priorité moyenne :**
- Remises par famille
- Analytique par document
- Multi-utilisateurs avec scopes
- Rapport impayés

### V3 — Écosystème

- Factur-X (facturation électronique obligatoire)
- API publique LIGNIA
- Portail client (webdoc)
- Webhook / événements

---

## CONCLUSION

**LIGNIA V1 couvre les fonctionnalités commerciales de base suffisantes pour un pilote :**
devis, signature, acompte, numérotation, PDF devis, remises fournisseurs, interventions.

**Les 3 manques les plus critiques pour le pilote** (impact quotidien Amélie) :
1. Contacts multiples par client — une secrétaire jongle entre propriétaire, comptable, gardien
2. Relances devis — Amélie relance manuellement chaque devis sans réponse
3. PDF facture — impossible d'envoyer une facture sans l'exporter manuellement

**Le différenciant LIGNIA sur Evoliz** n'est pas la comptabilité — c'est le catalogue fumisterie, les appareils ADEME, le parc installé et les ouvrages réutilisables. Aucun ERP généraliste ne les a.

---

*LIGNIA_FUNCTIONAL_GAP_ANALYSIS_V1.md*
*Audit Claude Analytics — 27 juin 2026*
*Sources : Evoliz API v1.43 (OpenAPI 3.0) + GitHub Lignia/fieldflow-pro + Supabase hejxvqghsyaauwzkfikg*
*Aucune migration — aucun ticket — aucune architecture nouvelle*
