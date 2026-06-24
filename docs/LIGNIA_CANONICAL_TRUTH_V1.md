# LIGNIA_CANONICAL_TRUTH_V1

> Document de référence officielle — état réel du projet au 23 juin 2026
> Méthode : chaque affirmation est liée à une preuve (fichier GitHub SHA, table Supabase, ou RPC).
> Sans preuve = marqué NON VÉRIFIÉ.
> Ce document remplace tout audit précédent sur les sujets couverts.
> À mettre à jour après chaque sprint par Claude Read.

---

## ÉTAPE 1 — INVENTAIRE DES SOURCES

| Source | Existe | Consultée | Date approx. | Encore valide | Remplacée par | Contradictoire |
|---|---|---|---|---|---|---|
| LIGNIA_USER_STORIES_V3.md | ✅ | ✅ | Juin 2026 (v3.5) | ✅ | — | ⚠️ Partiellement — certaines US décrivent un état inexistant en base |
| LIGNIA_V1_MASTER.md | ✅ | ✅ | Juin 2026 | ✅ | — | ⚠️ Backlog P0/P1 partiellement obsolète (certains items déjà faits) |
| MASTER_RESTITUTION_CATALOGUE_V1.md | ✅ | ✅ | Juin 2026 | ✅ | — | Non |
| DECISION_LOG.md (D-01 à D-32) | ✅ | ✅ | Juin 2026 | ✅ SOURCE PRINCIPALE | — | Non |
| ENGINEERING_PRINCIPLES.md | ✅ | ✅ | Juin 2026 | ✅ | — | Non |
| CATALOG_ITEMS_V1_FINAL.md | ✅ | ✅ | Juin 2026 | ✅ | — | Non |
| CATALOG_ITEMS_V1_CANONICAL.md | ✅ | ✅ | Juin 2026 | ❌ SUPERSEDED | CATALOG_ITEMS_V1_FINAL.md | ⚠️ Coexiste — risque confusion |
| ROADMAP_6_SEMAINES.md | ✅ | ✅ | Mai 2026 | ❌ | LIGNIA_V1_MASTER.md | ✅ Contient tâches déjà faites (Poujoulat = 22796 articles) |
| ROADMAP_EXECUTABLES_8S.md | ✅ | ✅ | Mai 2026 | ❌ | LIGNIA_V1_MASTER.md | ✅ Contient tâches déjà faites |
| HEATING_APPLIANCE_EXECUTION_PLAN.md | ✅ | ✅ | Juin 2026 | ⚠️ PARTIEL | — | ⚠️ ApplianceSearchTab décrit comme "à faire" — déjà fait |
| DEVELOPER_HANDOFF_LIGNIA_V1.md | ✅ | ✅ | Juin 2026 | ✅ | — | Non |
| D-25_TVA_catalogue_doctrine.md | ✅ | ✅ | Juin 2026 | ✅ | — | ⚠️ Complément de D-24 — risque divergence si mis à jour séparément |
| LIGNIA_US_IMPLEMENTATION_TRACKER.md | ✅ | ✅ | 23 Juin 2026 | ⚠️ INCOMPLET | Ce document (CANONICAL_TRUTH_V1) | Non |
| Audits OpenAI (transcripts) | ✅ | ✅ | Juin 2026 | ⚠️ PARTIEL | — | ⚠️ Plusieurs points corrigés dans ce document |
| Audits Claude Analytics précédents | ✅ | ✅ | Juin 2026 | ⚠️ PARTIEL | — | ⚠️ 4 erreurs factuelles identifiées (voir section ERREURS) |
| Audits Claude Read (sessions) | ✅ | ✅ | Juin 2026 | ⚠️ PARTIEL | — | Non |
| CATALOG_EXECUTION_PLAN_V1_FINAL.md | ✅ | NON VÉRIFIÉ | Juin 2026 | NON VÉRIFIÉ | — | NON VÉRIFIÉ |
| docs/audit/ (7 fichiers CSV + md) | ✅ | Partiel | Inconnu | ❌ | LIGNIA_USER_STORIES_V3.md (dette) + LIGNIA_V1_MASTER.md (P0) | ✅ CSV obsolètes |
| docs/business/, docs/ops/, docs/runtime/ | ✅ | ❌ | Inconnu | NON VÉRIFIÉ | — | NON VÉRIFIÉ |
| ESTIMATE_TO_INSTALLATION_WORKFLOW.md | ✅ | NON VÉRIFIÉ | Inconnu | NON VÉRIFIÉ | — | NON VÉRIFIÉ |

---

## ÉTAPE 2 — AUDIT DE LA BASE SUPABASE

### Tables par schéma — état réel (23 juin 2026)

#### billing (14 tables)

| Table | Colonnes | Utilisée front | Utilisée RPC | Documentée | Dette |
|---|---|---|---|---|---|
| quotes | 45 | ✅ v_quotes_with_customer | ✅ sign_quote_and_initialize, replace_quote_lines | ✅ | quote_number trigger t1_set_quote_number — FONCTIONNEL |
| quote_lines | 34 | ✅ useQuoteDetail | ✅ replace_quote_lines | ✅ | — |
| quote_sections | 6 | ✅ useQuoteDetail | — | ✅ | — |
| quote_system_sections | 16 | NON VÉRIFIÉ | — | NON VÉRIFIÉ | — |
| invoices | 33 | ✅ v_invoices_with_context | ✅ sign_quote_and_initialize | ✅ | invoice_number trigger t2_set_invoice_number — FONCTIONNEL |
| invoice_lines | 19 | ✅ InvoiceDetail | — | ✅ | — |
| document_sequences | 8 | ❌ (utilisée par trigger uniquement) | ✅ generate_document_number | ✅ | Absent dans src/ — FONCTIONNEL via trigger |
| payments | 15 | NON VÉRIFIÉ | — | NON VÉRIFIÉ | — |
| purchase_orders | 22 | NON VÉRIFIÉ | ✅ create_purchase_order | ⚠️ | NON VÉRIFIÉ si utilisé front |
| purchase_order_lines | 13 | NON VÉRIFIÉ | — | — | — |
| sale_orders | 20 | NON VÉRIFIÉ | ✅ create_sale_order | — | — |
| sale_order_lines | 12 | NON VÉRIFIÉ | — | — | — |
| delivery_notes | 14 | NON VÉRIFIÉ | ✅ create_delivery_note, receive_delivery | — | — |
| delivery_note_lines | 11 | NON VÉRIFIÉ | — | — | — |

#### catalog (17 tables)

| Table | Colonnes | Utilisée front | Utilisée RPC | Documentée | Dette |
|---|---|---|---|---|---|
| catalog_items | 131 | ✅ useCatalog, useCatalogSearch | ✅ search_quote_items_v2, resolve_item_price | ✅ | catalog_domain NULL sur 22796 articles |
| catalogs | 10 | ✅ useCatalog | ✅ save_lines_as_bundle | ✅ | — |
| heating_appliances | 102 | ✅ ApplianceSearchTab | ✅ search_heating_appliances | ✅ | — |
| tenant_supplier_discounts | 16 | ✅ SupplierDiscounts.tsx | ✅ resolve_item_price | ✅ | — |
| tenant_suppliers | 5 | ❌ | ❌ | ✅ (ajouté 23/06) | Table dormante — non utilisée front |
| family_search_profiles | 13 | ❌ | ✅ search_quote_items_v2 | ⚠️ | NON VÉRIFIÉ si peuplée |
| search_synonyms | 10 | ❌ | ✅ search_quote_items_v2 | ⚠️ | NON VÉRIFIÉ si peuplée |
| device_types | 8 | ✅ ServiceRequestCreate (dropdown) | — | NON VÉRIFIÉ | — |
| compatibility_rules | 14 | ❌ | NON VÉRIFIÉ | — | Table non utilisée front |
| product_terms | 7 | ❌ | NON VÉRIFIÉ | — | trigger t10_refresh_term_search_vector |
| supplier_brands | 7 | ❌ | — | — | — |
| supplier_column_mappings | 11 | ❌ | ✅ import_supplier_items_v2 | ✅ | Utilisée pipeline import uniquement |
| supplier_connectors | 13 | ❌ | — | — | — |
| supplier_range_mappings | 21 | ❌ | ✅ import_supplier_items_v2 | ✅ | Pipeline import uniquement |
| supplier_order_logs | 13 | ❌ | — | — | — |
| tenant_appliance_brands | 7 | NON VÉRIFIÉ | — | — | — |
| _import_staging_poujoulat | 2 | ❌ | — | — | ⚠️ RLS DÉSACTIVÉ — à supprimer |
| _archive_joncoux_legacy_20260520 | 118 | ❌ | — | — | ⚠️ Archive — RLS activée, 0 policy |
| import_joncoux_staging | 40 | ❌ | — | — | ⚠️ Staging Joncoux — statut inconnu |
| heating_appliance_import_rows | 22 | ❌ | — | — | Staging import ADEME |

#### core (9 tables)

| Table | Colonnes | Utilisée front | Utilisée RPC | Documentée | Dette |
|---|---|---|---|---|---|
| customers | 16 | ✅ Clients.tsx, useCustomers | — | ✅ | — |
| projects | 18 | ✅ v_projects_with_customer | ✅ transition_project_status | ✅ | preferred_supplier_name ABSENT (US-C07e) |
| installations | 40 | ✅ v_installations_with_customer | ✅ complete_commissioning | ✅ | heating_appliance_id colonne confirmée |
| technical_surveys | 133 | ✅ TechnicalSurveyDetail | ✅ finalize_installation_from_survey | ✅ | 133 colonnes — complexité élevée |
| tenants | 23 | ❌ (lecture JWT uniquement) | ✅ provision-tenant (Edge) | ✅ | — |
| users | 11 | ✅ useCurrentUser | ✅ custom_access_token_hook | ✅ | — |
| properties | 16 | ✅ useCustomerProperties | — | NON VÉRIFIÉ | — |
| activities | 11 | ✅ (timeline projets/interventions) | — | NON VÉRIFIÉ | Immutabilité enforced par trigger |
| documents | 15 | NON VÉRIFIÉ | — | — | — |
| webhook_events | 8 | ❌ | — | — | — |

#### operations (2 tables)

| Table | Colonnes | Utilisée front | Documentée | Dette |
|---|---|---|---|---|
| interventions | 36 | ✅ v_interventions_with_context | ✅ | — |
| service_requests | 19 | ✅ v_service_requests_with_context | ✅ | — |
| contact_events | 15 | ✅ ServiceRequestDetail | NON VÉRIFIÉ | — |

### RPC — état réel

#### RPC utilisées par le frontend (prouvées)

| RPC | Schéma | Utilisée dans | Prouvée |
|---|---|---|---|
| search_quote_items_v2 | public (wrapper) | useCatalogSearch.ts | ✅ SHA 9e54452 |
| search_heating_appliances | public | ApplianceSearchTab.tsx | ✅ SHA b5368bc |
| resolve_item_price | catalog | QuoteEditor.tsx | ✅ INVARIANT 5 |
| replace_quote_lines | public (wrapper) | useQuoteDetail.ts | ✅ INVARIANT 7 |
| sign_quote_and_initialize | billing | useSignQuote.ts | ✅ SHA 0e891fa |
| save_lines_as_bundle | catalog | QuoteEditor.tsx | ✅ SHA 17e85e8 — ERREUR AUDIT CORRIGÉE |
| duplicate_quote | billing | NON VÉRIFIÉ front | NON VÉRIFIÉ |
| create_invoice_from_intervention | billing | InterventionDetail.tsx | NON VÉRIFIÉ (probable) |
| delete_catalog_with_items | catalog | useCatalog.ts | ✅ SHA f8606ff |
| import_supplier_items_v2 | public (wrapper) | Scripts Codespaces | ✅ pipeline import |

#### RPC existantes en base — non utilisées front (NON VÉRIFIÉ ou dormantes)

| RPC | Schéma | Usage probable | Dette |
|---|---|---|---|
| search_quote_items | public | Legacy v1 — NON VÉRIFIÉ si encore utilisée | À vérifier avant suppression |
| search_quote_items_v3 | public | Créée en session — NON VÉRIFIÉ si utilisée | NON VÉRIFIÉ |
| compute_project_pipeline_value | billing | NON VÉRIFIÉ | — |
| create_purchase_order | billing | NON VÉRIFIÉ front | — |
| create_sale_order | billing | NON VÉRIFIÉ front | — |
| create_delivery_note | billing | NON VÉRIFIÉ front | — |
| transition_quote_status | billing | NON VÉRIFIÉ front | — |
| generate_document_number | billing | Utilisée par trigger uniquement | — |
| _stage_poujoulat_batch | catalog | Pipeline import staging — dormant | Dette staging |
| complete_field_intervention | operations | NON VÉRIFIÉ front | — |
| complete_commissioning | operations | NON VÉRIFIÉ front | — |

### Vues — état réel (10 vues)

| Vue | Schéma | Utilisée front | Prouvée |
|---|---|---|---|
| v_quotes_with_customer | core + billing | ✅ useQuoteDetail, useQuotes | ✅ |
| v_projects_with_customer | core | ✅ useProjects, useProjectDetail, QuoteEditor, InterventionCreate | ✅ |
| v_installations_with_customer | core | ✅ useInstallations, useInstallationDetail, useClientDetail | ✅ |
| v_interventions_with_context | operations | ✅ useInterventions, useInterventionDetail | ✅ |
| v_service_requests_with_context | operations | ✅ useServiceRequests, useServiceRequestDetail | ✅ |
| v_invoices_with_context | billing | ✅ useInvoices, InvoiceDetail | ✅ |
| v_invoice_totals | billing | NON VÉRIFIÉ | — |
| v_quote_totals | billing | NON VÉRIFIÉ | — |
| v_purchase_orders_with_context | billing | NON VÉRIFIÉ | — |

---

## ÉTAPE 3 — AUDIT DU FRONTEND

### Pages — inventaire complet

| Fichier | Taille | Route | Relié US | Utilisé | Orphelin | Dette |
|---|---|---|---|---|---|---|
| Dashboard.tsx | 6 556 | /dashboard | US-P (KPIs) | ✅ | Non | — |
| Clients.tsx | 8 695 | /clients | US-CRM | ✅ | Non | — |
| Projects.tsx | 12 596 | /projects | US-P01 | ✅ | Non | — |
| ProjectDetail.tsx | 53 970 | /projects/:id | US-P01-P04 | ✅ | Non | — |
| Quotes.tsx | 26 041 | /quotes | US-D01 | ✅ | Non | — |
| QuoteDetail.tsx | 70 738 | /quotes/:id | US-D01-D05 | ✅ | Non | Plus gros fichier |
| Catalog.tsx | 30 857 | /catalog | US-C07 | ✅ | Non | Navigation par catalog_id, pas catalog_domain |
| Installations.tsx | 10 261 | /installations | US-APP-04 | ✅ | Non | — |
| InstallationDetail.tsx | 26 304 | /installations/:id | US-APP-03/04 | ✅ | Non | — |
| InterventionCreate.tsx | 31 727 | /interventions/new | US-PLN-01 | ✅ | Non | — |
| InterventionDetail.tsx | 51 955 | /interventions/:id | US-PLN-01 | ✅ | Non | Plus gros fichier pages |
| Interventions.tsx | 10 529 | /interventions | US-PLN-01 | ✅ | Non | — |
| InvoiceDetail.tsx | 11 380 | /invoices/:id | US-FAC | ✅ | Non | — |
| Invoices.tsx | 6 451 | /invoices | US-FAC | ✅ | Non | — |
| ServiceRequestCreate.tsx | 32 453 | /service-requests/new | US-SAV-01 | ✅ | Non | — |
| ServiceRequestDetail.tsx | 20 180 | /service-requests/:id | US-SAV-01 | ✅ | Non | — |
| ServiceRequests.tsx | 9 013 | /service-requests | US-SAV-01 | ✅ | Non | — |
| TechnicalSurveyDetail.tsx | 10 203 | /technical-surveys/:id | US-P02 | ✅ | Non | — |
| Planning.tsx | 679 | /planning | US-PLN-02 | ⚠️ STUB | Non | STUB vide — masqué nav |
| CreateQuote.tsx | 1 701 | NON VÉRIFIÉ | NON VÉRIFIÉ | NON VÉRIFIÉ | ⚠️ POTENTIEL | À auditer |
| LandingPage.tsx | 52 552 | / | — | ✅ | Non | — |

#### Pages settings

| Fichier | Route | Statut |
|---|---|---|
| SupplierDiscounts.tsx | /settings/supplier-discounts | ✅ COMPLET 36 Ko |

### Hooks — inventaire complet

| Hook | Taille | Vues/Tables utilisées | US reliée | Statut |
|---|---|---|---|---|
| useCatalog.ts | 9 272 | catalog.catalogs + catalog_items par catalog_id | US-C | ✅ FONCTIONNEL |
| useCatalogSearch.ts | 3 766 | search_quote_items_v2 | US-D03 | ✅ — p_active_supplier_names non branché |
| useQuoteDetail.ts | 11 855 | v_quotes_with_customer, quote_lines, quote_sections | US-D | ✅ |
| useQuotes.ts | 3 968 | v_quotes_with_customer, v_projects_with_customer | US-D | ✅ |
| useCreateQuote.ts | 6 270 | v_projects_with_customer | US-D01 | ✅ |
| useSignQuote.ts | 2 288 | sign_quote_and_initialize | US-D05 | ✅ |
| useProjects.ts | 4 303 | v_projects_with_customer | US-P | ✅ |
| useProjectDetail.ts | 4 435 | v_projects_with_customer + quotes + invoices | US-P | ✅ |
| useInstallations.ts | 3 089 | v_installations_with_customer | US-APP-04 | ✅ |
| useInstallationDetail.ts | 3 547 | v_installations_with_customer | US-APP-03/04 | ✅ |
| useInterventions.ts | 5 586 | v_interventions_with_context | US-PLN-01 | ✅ |
| useInterventionDetail.ts | 2 215 | v_interventions_with_context | US-PLN-01 | ✅ |
| useInvoices.ts | 2 484 | v_invoices_with_context | US-FAC | ✅ |
| useServiceRequests.ts | 4 701 | v_service_requests_with_context | US-SAV | ✅ |
| useServiceRequestDetail.ts | 2 708 | v_service_requests_with_context | US-SAV | ✅ |
| useCustomers.ts | 3 308 | core.customers | US-CRM | ✅ |
| useClientDetail.ts | 3 607 | v_installations_with_customer + activities | US-CRM | ✅ |
| useDashboardKpis.ts | 5 743 | v_projects_with_customer + billing | — | ✅ |
| useCurrentUser.tsx | 3 304 | core.users | — | ✅ |
| useCustomerProperties.ts | 1 173 | core.properties | — | ✅ |
| useCustomerSearch.ts | 1 375 | core.customers | — | ✅ |

### Composants majeurs

| Composant | Taille | Utilisé dans | Statut |
|---|---|---|---|
| ApplianceSearchTab.tsx | 7 342 | QuoteEditor.tsx CatalogPopover | ✅ FONCTIONNEL |
| AppSidebar.tsx | 5 358 | AppLayout | ✅ |
| SearchGlobal.tsx | 9 754 | AppLayout | ✅ |
| StatusBadge.tsx | 6 594 | Partout | ✅ |
| InterventionCard.tsx | 3 310 | NON VÉRIFIÉ | NON VÉRIFIÉ |
| InstallationCard.tsx | 2 497 | NON VÉRIFIÉ | NON VÉRIFIÉ |
| ProjectCard.tsx | 2 211 | NON VÉRIFIÉ | NON VÉRIFIÉ |
| NewQuoteModal.tsx | 11 404 | Projets, Quotes | ✅ |

---

## ÉTAPE 4 — MATRICE USER STORIES ↔ CODE ↔ BASE

| US | Tables | RPC/Vue | Hook | Page | Verdict | Preuve |
|---|---|---|---|---|---|---|
| US-D01 Créer devis | billing.quotes | replace_quote_lines | useCreateQuote | QuoteEditor | ✅ DONE | SHA 17e85e8 |
| US-D04 Remise fournisseur | tenant_supplier_discounts | resolve_item_price | useCatalogSearch | QuoteEditor | ✅ DONE | SHA 5de776b (SupplierDiscounts) |
| US-D05 Signer devis | billing.quotes + invoices | sign_quote_and_initialize | useSignQuote | QuoteDetail | ✅ DONE | SHA 0e891fa |
| US-D06 Ouvrages/Kits | catalog.catalogs (catalog_type=internal) | save_lines_as_bundle | — (inline QuoteEditor) | QuoteEditor | ✅ PARTIAL — RPC + front existent, tables quote_kits ABSENTES | SHA 17e85e8 fragment save_lines_as_bundle |
| US-D03 Recherche catalogue | catalog_items | search_quote_items_v2 | useCatalogSearch | CatalogPopover | ✅ PARTIAL — p_active_supplier_names non branché | SHA 9e54452 |
| US-APP-01 Appareils dans devis | heating_appliances | search_heating_appliances | — (inline QuoteEditor) | QuoteEditor CatalogPopover | ✅ PARTIAL — fonctionnel, vat_rate:20 bug | SHA b5368bc |
| US-FAC-04 Numérotation | document_sequences | generate_document_number (trigger) | — | QuoteDetail, InvoiceDetail | ✅ DONE via trigger — non visible front directement | trigger t1_set_quote_number confirmé |
| US-C07a Fournisseurs actifs UI | tenant_suppliers | — | — | Catalog.tsx | ❌ ABSENT front | GitHub search 0 résultat |
| US-C07b Recherche filtrée | tenant_suppliers + search_quote_items_v2 | search_quote_items_v2 | useCatalogSearch | CatalogPopover | ❌ ABSENT — p_active_supplier_names non branché | SHA 9e54452 |
| US-C07d Onglets catalog_domain | catalog_items | — | useCatalog | Catalog.tsx | ❌ ABSENT — catalog_domain NULL | Supabase confirmé |
| US-PLN-01 Interventions | operations.interventions | — | useInterventions | InterventionDetail (51Ko) | ✅ PARTIAL — pages riches, planning absent | Tailles fichiers confirmées |
| US-PLN-02 Planning bureau | operations.interventions | — | — | Planning.tsx | ❌ STUB 679 octets | SHA fa30de5 |
| US-APP-04 Parc installé | core.installations | — | useInstallations | InstallationDetail | ✅ PARTIAL — pages présentes | SHA a04afab |
| US-SAV-01 SAV | operations.service_requests | — | useServiceRequests | ServiceRequestCreate/Detail | ✅ PARTIAL — module complet | SHA 5cf3eb5 |
| US-CRM-01 Contacts multiples | core.customer_contacts | — | — | — | ❌ ABSENT — table manquante | Supabase confirmé |
| US-CRM-04 Relances devis | quote_followups | — | — | — | ❌ ABSENT — table manquante | Supabase confirmé |
| US-FAC-01 Types factures | billing.invoices | — | useInvoices | InvoiceDetail | ⚠️ PARTIAL — invoice_kind colonne présente | Schéma 33 colonnes confirmé |

---

## ÉTAPE 5 — INVENTAIRE DES DOCUMENTS OUBLIÉS

| Document | Impact potentiel | Risque si ignoré |
|---|---|---|
| CATALOG_ITEMS_V1_CANONICAL.md | ⚠️ ÉLEVÉ — coexiste avec FINAL, marque item_family obligatoire vs FINAL marque conditionnel | Un agent lit CANONICAL et travaille sur schéma obsolète |
| ROADMAP_6_SEMAINES.md | ⚠️ MOYEN — contient "importer Poujoulat 16529" comme tâche à faire, alors que c'est fait | Mauvaise estimation d'avancement |
| ROADMAP_EXECUTABLES_8S.md | ⚠️ MOYEN — même problème | Idem |
| docs/audit/technical_debt.csv | ⚠️ FAIBLE — dette dupliquée dans USER_STORIES_V3 | Confusion sur source de vérité dette |
| docs/audit/p0_actions.csv | ⚠️ FAIBLE — P0 géré dans LIGNIA_V1_MASTER | Idem |
| docs/audit/forbidden_now.md | ⚠️ FAIBLE — liste interdictions dupliquée dans LIGNIA_V1_MASTER | Idem |
| docs/business/, docs/ops/, docs/runtime/ | NON VÉRIFIÉ — contenu inconnu | Risque de décisions non remontées |
| ESTIMATE_TO_INSTALLATION_WORKFLOW.md | NON VÉRIFIÉ — peut décrire un workflow incompatible avec l'état actuel | Risque de contradiction avec useSignQuote |
| HEATING_APPLIANCE_EXECUTION_PLAN.md | ⚠️ MOYEN — décrit ApplianceSearchTab comme à créer, alors qu'il existe | Tâches déjà faites redéveloppées |

---

## ÉTAPE 6 — TOP 10 DES INCOHÉRENCES RÉELLES

### CRITIQUE

**1. CRITIQUE — catalog_domain NULL sur 22 796 articles**
- Documentation : US-C07d demande onglets Fumisterie/Appareils/Prestations/SAV
- Code : Catalog.tsx n'a pas d'onglets par domain
- Base : catalog_domain absent de tous les articles (confirmé)
- Impact : onglets catalogue impossibles, recherche contextualisée impossible
- Preuve : Supabase SELECT catalog_domain FROM catalog_items — NULL

**2. CRITIQUE — _import_staging_poujoulat sans RLS**
- Documentation : identifiée dans audit sécurité
- Base : rls_enabled=false confirmé
- Impact : table accessible sans filtre tenant — risque sécurité
- Preuve : pg_class.relrowsecurity = false

**3. CRITIQUE — 6 Edge Functions avec verify_jwt=false**
- Documentation : audit sécurité P0-A identifié, prompt prêt
- Base : confirmé par list_edge_functions
- Impact : provision-tenant appelable sans authentification
- Preuve : list_edge_functions résultats précédents

### IMPORTANT

**4. IMPORTANT — save_lines_as_bundle : RPC existe, mais ne crée pas de table quote_kits**
- Documentation : "partiellement implémenté" — FAUX
- Code : QuoteEditor.tsx appelle save_lines_as_bundle (SHA 17e85e8 confirmé)
- Base : catalog.save_lines_as_bundle existe, crée un catalog_item de type 'service' dans le catalogue interne (pas de table quote_kits)
- Impact : les ouvrages sont sauvegardés comme articles catalogue, pas comme structures de lignes — limite la réutilisation mais fonctionne
- Preuve : corps SQL de save_lines_as_bundle lu intégralement

**5. IMPORTANT — tenant_suppliers peuplée mais aucun code front ne la lit**
- Documentation : US-C07a décrit un bandeau fournisseurs sur Catalog.tsx
- Code : 0 occurrence tenant_suppliers dans src/ (GitHub search confirmé)
- Base : 28 lignes, 7 tenants × 4 fournisseurs
- Impact : DB en avance sur le code — fonctionnalité non accessible
- Preuve : GitHub search 0 résultats

**6. IMPORTANT — p_active_supplier_names non branché dans useCatalogSearch**
- Documentation : US-C07b demande recherche filtrée
- Code : useCatalogSearch passe p_active_supplier_names=null (déduit de SHA 9e54452 — pas de lecture tenant_suppliers)
- Base : paramètre existe dans search_quote_items_v2
- Impact : recherche devis non filtrée par fournisseurs actifs
- Preuve : useCatalogSearch.ts SHA 9e54452

**7. IMPORTANT — CATALOG_ITEMS_V1_CANONICAL.md pas archivé**
- Documentation : deux documents contradictoires sur item_family
- Impact : un agent lit CANONICAL et prend des décisions sur schéma obsolète
- Preuve : les deux fichiers coexistent dans docs/architecture/catalog/

**8. IMPORTANT — vat_rate:20 hardcodé dans addAppliance()**
- Documentation : doctrine TVA dit 5.5% appareils rénovation
- Code : vat_rate: 20 dans QuoteEditor.tsx addAppliance
- Impact : chaque appareil ajouté à un devis est taxé à 20% au lieu de 5.5%
- Preuve : SHA 17e85e8 fragment confirmé précédemment

### COSMÉTIQUE

**9. COSMÉTIQUE — Bouton "Importer un catalogue" visible pour tous les rôles**
- Documentation : bouton réservé SUPER_ADMIN
- Code : Catalog.tsx rend le bouton sans vérification de rôle
- Impact : confus pour l'artisan, pas de risque sécurité
- Preuve : Catalog.tsx SHA 9b7bb5c lu intégralement

**10. COSMÉTIQUE — Colonne "Coût HT" affichée et toujours vide**
- Documentation : INVARIANT 2 — cost_price toujours NULL
- Code : Catalog.tsx affiche la colonne avec condition `item.cost_price != null`
- Impact : colonne inutile visible par l'artisan
- Preuve : Catalog.tsx SHA 9b7bb5c

---

## ERREURS DES AUDITS PRÉCÉDENTS

**ERREUR 1 — Appareils "non branchés"**
Affirmé : "ApplianceSearchTab non branché — P0 critique"
Réel : ApplianceSearchTab importé et rendu dans CatalogPopover de QuoteEditor (SHA 17e85e8, SHA b5368bc confirmés)
Cause : lecture de HEATING_APPLIANCE_EXECUTION_PLAN.md sans vérifier le code

**ERREUR 2 — Conditions d'achat "non branchées"**
Affirmé : "SupplierDiscounts non branché — P0"
Réel : SupplierDiscounts.tsx 36 Ko, route active /settings/supplier-discounts, gestion globale + grilles barèmes
Cause : lecture de LIGNIA_V1_MASTER.md backlog sans vérifier le code

**ERREUR 3 — Numérotation "non branchée"**
Affirmé : "document_sequences non connectée au front — P0"
Réel : numérotation gérée par triggers (t1_set_quote_number, t2_set_invoice_number) côté base, non par le front directement. Tenant dbd5a19f a 134 devis numérotés. Le front affiche quote_number mais ne l'appelle pas via document_sequences.
Cause : confusion "le front ne lit pas document_sequences" (vrai) vs "la numérotation ne fonctionne pas" (faux)

**ERREUR 4 — Ouvrages "absents"**
Affirmé : "save_lines_as_bundle absent du code — tables quote_kits absentes"
Réel : save_lines_as_bundle présent dans QuoteEditor.tsx (SHA 17e85e8) ET dans catalog. (Supabase). Il crée des catalog_items de type 'service' dans le catalogue interne du tenant, pas des structures quote_kits.
Cause : GitHub search mal formulé, lecture de documentation obsolète

---

## ÉTAT DE VÉRITÉ PAR MODULE

| Module | Verdict | Base | Code | UI artisan | Incohérence doc |
|---|---|---|---|---|---|
| Devis (créer, éditer, PDF) | ✅ DONE | ✅ | ✅ | ✅ | Non |
| Signature devis + acompte | ✅ DONE | ✅ | ✅ | ✅ | Non |
| Numérotation | ✅ DONE via trigger | ✅ | ✅ affichage | ✅ | ⚠️ Doc disait "non branché" |
| Appareils dans devis | ✅ PARTIAL — vat_rate bug | ✅ | ✅ | ✅ | ⚠️ Doc disait "non branché" |
| Ouvrages/Kits | ✅ PARTIAL — fonctionne différemment | ✅ RPC | ✅ | ✅ UI save | ⚠️ Doc disait "absent" |
| Remises fournisseur | ✅ DONE | ✅ | ✅ | ✅ | ⚠️ Doc disait "non branché" |
| Catalogue (navigation) | ⚠️ PARTIAL | ✅ 22796 articles | ✅ nav catalog_id | ✅ | catalog_domain manquant |
| Fournisseurs actifs | ❌ ABSENT front | ✅ tenant_suppliers | ❌ | ❌ | DB en avance |
| Onglets catalog_domain | ❌ ABSENT | ❌ NULL | ❌ | ❌ | Non |
| Installations | ⚠️ PARTIAL | ✅ | ✅ pages riches | ✅ | Non |
| SAV | ⚠️ PARTIAL | ✅ | ✅ 52Ko code | ✅ | Non |
| Interventions | ⚠️ PARTIAL | ✅ | ✅ 82Ko code | ✅ | Non |
| Planning | ❌ STUB | ✅ données | ❌ 679 octets | ❌ | Non |
| Factures | ⚠️ PARTIAL | ✅ | ✅ pages | ✅ | Non |
| Contacts multiples | ❌ ABSENT | ❌ | ❌ | ❌ | Non |
| Relances devis | ❌ ABSENT | ❌ | ❌ | ❌ | Non |

---

*Document créé le 23 juin 2026 — Claude Analytics*
*Méthode : lectures GitHub (SHAs vérifiés), Supabase (requêtes réelles), documentation (fichiers lus)*
*Prochaine mise à jour recommandée : après chaque sprint, par Claude Read*
*Remplace : LIGNIA_US_IMPLEMENTATION_TRACKER.md (incomplet), audits précédents*
