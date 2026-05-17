-- ============================================================
-- MIGRATION : db_comment_1_final
-- Date       : 2026-05-17
-- Auteur     : LIGNIA — Claude Supabase
-- ============================================================
--
-- OBJECTIF
--   Documenter en base PostgreSQL les règles métier, invariants
--   et conventions d'usage via COMMENT ON TABLE / COLUMN / FUNCTION.
--   Ce fichier consolide les vagues 1 et 2 de DB-COMMENT-1.
--
-- PÉRIMÈTRE
--   Schémas  : catalog, billing, core
--   Tables   : catalog.catalog_items, catalog.import_joncoux_staging,
--              catalog.tenant_supplier_discounts,
--              catalog.heating_appliances,
--              billing.quotes, billing.quote_lines,
--              billing.invoices, billing.invoice_lines,
--              billing.purchase_orders, billing.purchase_order_lines,
--              core.customers, core.properties, core.projects
--   Fonctions: public.search_quote_items (legacy),
--              public.search_quote_items_v2,
--              catalog.search_quote_items (legacy wrapper),
--              catalog.search_quote_items_v2 (wrapper standard),
--              catalog.resolve_item_price
--
-- DÉPENDANCES
--   - ARCH-DOC-1 (GitHub docs/architecture/) : source de vérité
--   - Migrations SQI-1, SQI-2, PRICING-1, WRAPPER-1, CAT-3,
--     RESET-CATALOG-2 v1.3 : doivent être appliquées avant
--   - db_comment_1_vague1 : migration précédente supersédée par celle-ci
--
-- RÈGLES
--   Idempotent : COMMENT ON remplace sans erreur ni effet de bord.
--   Aucune modification de schéma (pas de DDL, pas de DML).
--   Aucun ENUM, aucune contrainte, aucune colonne ajoutée.
--   Peut être réappliquée sans risque à tout moment.
--
-- DETTES DOCUMENTÉES (ne pas corriger ici)
--   1. product_id (quote_lines/invoice_lines) vs catalog_item_id
--      (purchase_order_lines) : nommage incohérent — dette acceptée.
--   2. catalog.import_joncoux_staging : nom Joncoux-centric — dette
--      acceptée. Renommage à étudier post-stabilisation multi-fournisseurs.
--   3. heating_appliances.flamme_verte_stars : CHECK IN (5,6,7)
--      absent — migration séparée à planifier.
--   4. catalog.catalog_items.technology_type : taxonomie partielle,
--      aide au ranking uniquement — pas une taxonomie universelle.
--   5. RLS catalogue central : politiques exactes à documenter
--      dans une vague ultérieure.
--   6. catalog.catalog_items.item_family : colonne vide à 100% —
--      les valeurs autorisées vivent dans le COMMENT ON ci-dessous
--      et dans DECISION_LOG D-12. À valider côté Edge Function
--      lors du premier import multi-fournisseurs.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- BLOC 1 — TABLES : catalog
-- ════════════════════════════════════════════════════════════

COMMENT ON TABLE catalog.catalog_items IS
'Rôle: Référentiel produit mutable — source des prix et données techniques.
Règle: catalog_items est mutable ; quote_lines est l''historique immuable.
Standard: is_central=true = catalogue partagé LIGNIA (tenant_id IS NULL).
Danger: Ne jamais modifier les *_snapshot de quote_lines depuis ici.';

COMMENT ON TABLE catalog.import_joncoux_staging IS
'Rôle: Sas de validation avant publication dans catalog_items central.
Règle: RLS deny-all pour authenticated — service_role uniquement (Edge Functions).
Standard: Pipeline SOURCE → STAGING → VALIDATION → PUBLICATION.
Danger: Ne jamais accéder depuis Lovable ; jamais publier sans import_status=valid.';

COMMENT ON TABLE catalog.tenant_supplier_discounts IS
'Rôle: Remises négociées artisan par fournisseur et barème — source unique des remises.
Règle: discount_pct ne doit jamais être stocké dans catalog_items.
Standard: Résolution par priorité : bareme > global, fabricant > grossiste.
Danger: Sans entrée ici, resolve_item_price retourne pricing_source=central_catalog.';


-- ════════════════════════════════════════════════════════════
-- BLOC 2 — TABLES : billing
-- ════════════════════════════════════════════════════════════

COMMENT ON TABLE billing.quotes IS
'Rôle: Devis artisan multi-tenant avec contexte fiscal et commercial.
Règle: payload = dette contrôlée temporaire — pas de données légales.
Standard: quote_number non vide obligatoire avant génération PDF.
Danger: payload n''est pas un snapshot — données contractuelles → quote_lines.metadata.';

COMMENT ON TABLE billing.quote_lines IS
'Rôle: Historique immuable — snapshot figé au moment de l''ajout d''une ligne.
Règle: metadata ne doit jamais être modifié après insertion.
Standard: unit_price_ht = prix vente ; unit_cost_price = prix achat artisan.
Danger: FK vers catalog_items.id = product_id — jamais catalog_item_id.';

COMMENT ON TABLE billing.invoices IS
'Rôle: Facture émise au client — deposit, finale ou avoir (credit_note).
Règle: credit_note → adjusted_invoice_id obligatoire. Workflow : deposit → final → credit_note.
Standard: invoice_number généré par document_sequences — jamais saisi manuellement.
Danger: payload = dette contrôlée, pas de données légales. Factur-X = facturx_xml.';

COMMENT ON TABLE billing.invoice_lines IS
'Rôle: Lignes de facture — snapshot figé depuis quote_lines via source_line_id.
Règle: metadata hérité de quote_lines.metadata — immuable après création.
Standard: source_line_id → quote_lines.id. unit_cost_price jamais affiché client.
Danger: unit_price_ht = prix vente. Jamais remplacer par net_price_ht.';

COMMENT ON TABLE billing.purchase_orders IS
'Rôle: Bon de commande fournisseur — groupement de lignes par supplier_name.
Règle: order_status CHECK actif : draft | sent | confirmed | partial | received | cancelled.
Standard: 1 purchase_order par supplier_name distinct par projet.
Danger: supplier_ref = référence d''achat externe — jamais un identifiant métier LIGNIA.';

COMMENT ON TABLE billing.purchase_order_lines IS
'Rôle: Lignes du bon de commande — articles commandés au fournisseur.
Règle: catalog_item_id (nullable) — s''appelle catalog_item_id ici (pas product_id).
Standard: reference = supplier_ref transmis tel quel au fournisseur.
Danger: qty_received < qty_ordered → order_status=partial automatiquement.';


-- ════════════════════════════════════════════════════════════
-- BLOC 3 — TABLES : core
-- ════════════════════════════════════════════════════════════

COMMENT ON TABLE core.customers IS
'Rôle: Client d''un artisan — particulier, professionnel ou collectivité.
Règle: customer_type ENUM : particulier | professionnel | collectivite.
Standard: name = civility+first_name+last_name OU company_name selon customer_type.
Danger: payload = dette contrôlée — SIRET va dans siret, pas dans payload.';

COMMENT ON TABLE core.properties IS
'Rôle: Bien immobilier lié à un client — adresse de chantier et contexte fiscal.
Règle: payload.tva = contexte TVA réduite. external_data = données BAN (geocodage).
Standard: external_data.ban = résultat API BAN. payload.tva = ancienneté + attestation.
Danger: payload ≠ external_data. TVA dans payload.tva, geocodage dans external_data.';

COMMENT ON TABLE core.projects IS
'Rôle: Projet commercial d''installation — du lead à la mise en service.
Règle: project_status ENUM (17 valeurs) — transitions via RPCs uniquement.
Standard: pipeline_value_ttc = valeur estimée pour dashboard KPIs uniquement.
Danger: payload = dette contrôlée. Ne jamais stocker données comptables dans payload.';


-- ════════════════════════════════════════════════════════════
-- BLOC 4 — COLONNES : catalog.catalog_items
-- ════════════════════════════════════════════════════════════

COMMENT ON COLUMN catalog.catalog_items.tenant_id IS
'Rôle: Propriétaire tenant de l''article (NULL = catalogue central LIGNIA).
Règle: is_central=true ↔ tenant_id IS NULL (contrôlé par check_central_consistency).
Standard: Articles centraux visibles par tous les tenants via RLS.
Danger: Ne jamais insérer tenant_id sur un article central.';

COMMENT ON COLUMN catalog.catalog_items.is_central IS
'Rôle: Indique si l''article appartient au catalogue central partagé LIGNIA.
Règle: is_central=true ↔ tenant_id IS NULL — contrainte CHECK active en base.
Standard: Articles centraux : import fournisseur validé via staging.
Danger: Un mauvais usage casse resolve_item_price et la visibilité multi-tenant.';

COMMENT ON COLUMN catalog.catalog_items.supplier_ref IS
'Rôle: Référence d''achat fournisseur externe (ex: EAN-13, code fournisseur).
Règle: Transmis tel quel à la commande — jamais modifié après publication centrale.
Standard: Priorité snapshot : sku_code ?? supplier_ref ?? sku ?? id.
Danger: Ce n''est PAS un identifiant métier LIGNIA.';

COMMENT ON COLUMN catalog.catalog_items.supplier_name IS
'Rôle: Nom du distributeur d''achat (ex: Lorflex, Poujoulat, Dinak...).
Règle: supplier_name + bareme_code = clé dans tenant_supplier_discounts.
Standard: manufacturer_name = fabricant réel ; supplier_name = canal d''achat — ne pas confondre.
Danger: La valeur doit correspondre exactement (casse) à tenant_supplier_discounts.supplier_name.';

COMMENT ON COLUMN catalog.catalog_items.manufacturer_name IS
'Rôle: Nom du fabricant réel du produit — distinct du distributeur d''achat.
Règle: manufacturer_name = fabricant (ex: Joncoux, Jeremias) ; supplier_name = distributeur.
Standard: Snapshoté dans metadata.prescription.manufacturer_name à l''ajout au devis.
Danger: Ne pas confondre avec supplier_name — fabricant ≠ canal d''achat.';

COMMENT ON COLUMN catalog.catalog_items.unit_price_ht IS
'Rôle: Prix tarif public HT — source du prix de vente client.
Règle: Figé dans quote_lines.unit_price_ht à l''insertion — jamais recalculé.
Standard: JAMAIS remplacer par resolve_item_price.net_price_ht (= prix achat).
Danger: Écraser unit_price_ht avec net_price_ht = erreur contractuelle grave.';

COMMENT ON COLUMN catalog.catalog_items.vat_rate IS
'Rôle: Taux TVA applicable — stocké en base : 5.5 / 10.0 / 20.0.
Règle: Jamais 0.055 / 0.10 / 0.20. Calcul TTC : total_ht × (1 + vat_rate / 100).
Standard: TypeScript : type VatRate = 5.5 | 10 | 20. Suggéré selon contexte fiscal.
Danger: vat_rate=0 ou format décimal = erreur de calcul TTC silencieuse côté Lovable.';

COMMENT ON COLUMN catalog.catalog_items.needs_human_review IS
'Rôle: Signal de vérification obligatoire avant prescription ou installation.
Règle: true UNIQUEMENT pour sécurité/DTU/DTA — jamais pour qualité d''import.
Standard: Badge ⚠️ CatalogPopover ; snapshoté dans metadata.prescription.
Danger: Ne pas mettre true pour normalized_name NULL ou bareme_code NULL.';

COMMENT ON COLUMN catalog.catalog_items.pricing_status IS
'Rôle: État du prix : priced | price_on_request | missing_price | manual_price.
Règle: price_on_request → prix_sur_devis=true → afficher "Sur demande".
Standard: missing_price ne doit jamais être publié en catalogue central.
Danger: Ignorer pricing_status = affichage d''un prix non contractuel.';

COMMENT ON COLUMN catalog.catalog_items.prix_sur_devis IS
'Rôle: Masque unit_price_ht — afficher "Sur demande" dans le CatalogPopover.
Règle: Lié à pricing_status=price_on_request. Jamais calculé automatiquement.
Standard: true → ne pas inclure dans un calcul de total devis automatique.
Danger: Ignorer ce flag = affichage d''un prix non contractuel.';

COMMENT ON COLUMN catalog.catalog_items.is_etanche IS
'Rôle: Étanchéité du conduit (concentrique pellets / gaz).
Règle: NULL ≠ false — toujours tester === false explicitement.
Standard: is_etanche=true + dta_status!=confirmed → needs_human_review=true.
Danger: Traiter NULL comme false = prescription non-étanche erronée.';

COMMENT ON COLUMN catalog.catalog_items.dta_status IS
'Rôle: État DTA pour systèmes étanches : confirmed | missing | not_applicable | unknown.
Règle: is_etanche=true + dta_status IN (missing,unknown) → needs_human_review=true.
Standard: Snapshoté dans metadata.prescription.dta_status à l''ajout au devis.
Danger: Article étanche sans DTA confirmé = risque DTU 24.1.';

COMMENT ON COLUMN catalog.catalog_items.product_kind IS
'Rôle: Type de composant fumisterie — clé de scoring dans search_quote_items_v2.
Règle: Valeurs réelles : tube, coude, adaptateur, te, solin, bride, flexible, terminal, kit, joint, plaque, accessoire.
Standard: Ranking : coude+angle → +20pts. Pénalité si dims manquantes sur coude/tube/adaptateur.
Danger: NULL = pénalité -20pts en recherche pour coude/tube/adaptateur/te/flexible.';

COMMENT ON COLUMN catalog.catalog_items.technology_type IS
'Rôle: Technologie du conduit — aide au tri dans search_quote_items_v2 (pas taxonomie universelle).
Règle: Valeurs réelles : concentrique, double_paroi_isolee, flexible_tubage.
Standard: Ordre de tri : concentrique(1) > double_paroi_isolee(2) > flexible_tubage(3).
Danger: NULL = classé en dernier (rang 4). Mapping partiel — ne pas traiter comme taxonomie complète.';

COMMENT ON COLUMN catalog.catalog_items.item_family IS
'Rôle: Famille produit LIGNIA — candidat pour product_family multi-fournisseurs (vide à 100% aujourd''hui).
Règle: Valeurs autorisées (liste fermée, validation côté Edge Function) :
  conduit_principal | systeme_etanche | tubage_flexible | tubage_rigide |
  raccordement_visible | raccordement_pellets_visible | sortie_toiture |
  gaine_technique | accessoire_fumisterie | adaptateur_transition.
Standard: À renseigner lors du premier import multi-fournisseurs. Voir DECISION_LOG D-12.
Danger: Ne jamais insérer de valeur hors liste — risque de fragmentation de la taxonomie.';

COMMENT ON COLUMN catalog.catalog_items.source_system IS
'Rôle: Provenance technique de l''article (LORFLEX_ERP | OPENFIRE | MANUAL | NULL).
Règle: Indique l''outil source à l''import — pas la vérité métier sur le fournisseur.
Standard: NULL = article pré-import central ou saisie manuelle — pas une erreur.
Danger: source_system ne détermine pas supplier_name ni manufacturer_name.';

COMMENT ON COLUMN catalog.catalog_items.import_batch_id IS
'Rôle: UUID du lot d''import — lien vers import_joncoux_staging pour rollback.
Règle: NULL = article créé hors pipeline (manuel ou test).
Standard: 1 UUID par exécution Edge Function — permet rollback par lot.
Danger: UUID de traçabilité uniquement — pas un identifiant métier.';


-- ════════════════════════════════════════════════════════════
-- BLOC 5 — COLONNES : catalog.import_joncoux_staging
-- ════════════════════════════════════════════════════════════

COMMENT ON COLUMN catalog.import_joncoux_staging.import_batch_id IS
'Rôle: UUID identifiant un lot d''import — clé de rollback par lot.
Règle: 1 UUID par exécution Edge Function d''import.
Standard: Partagé avec catalog_items.import_batch_id pour traçabilité end-to-end.
Danger: Toujours généré côté Edge Function — jamais en base (non traçable).';

COMMENT ON COLUMN catalog.import_joncoux_staging.import_status IS
'Rôle: Statut de validation avant publication dans catalog_items.
Règle: pending | valid | duplicate | error | review | rejected | published (CHECK actif).
Standard: Seules les lignes import_status=valid sont publiables.
Danger: Ne jamais publier sans valid — review et error bloquent intentionnellement.';

COMMENT ON COLUMN catalog.import_joncoux_staging.validation_errors IS
'Rôle: Erreurs de validation jsonb : [{field, error, value}]. NULL = aucune erreur.
Règle: Alimenté par l''Edge Function d''import. NULL ne garantit pas valid.
Standard: Vérifier import_status=valid — pas validation_errors IS NULL.
Danger: Un article sans erreur peut rester en review (needs_human_review=true).';


-- ════════════════════════════════════════════════════════════
-- BLOC 6 — COLONNES : catalog.tenant_supplier_discounts
-- ════════════════════════════════════════════════════════════

COMMENT ON COLUMN catalog.tenant_supplier_discounts.tenant_id IS
'Rôle: Tenant artisan auquel s''applique cette remise.
Règle: Remise spécifique à 1 artisan — jamais partagée entre tenants.
Standard: Combiné avec supplier_name + bareme_code pour resolve_item_price.
Danger: Une remise sans tenant_id correct ne sera jamais résolue.';

COMMENT ON COLUMN catalog.tenant_supplier_discounts.supplier_name IS
'Rôle: Nom du fournisseur/distributeur concerné par la remise (ex: Lorflex, Poujoulat...).
Règle: Case-sensitive — doit correspondre exactement à catalog_items.supplier_name.
Standard: Valeur canonique issue du catalogue réel — jamais saisie libre sans référence.
Danger: Casse incorrecte = remise non trouvée, pricing_source=central_catalog par défaut.';

COMMENT ON COLUMN catalog.tenant_supplier_discounts.bareme_code IS
'Rôle: Code commercial fournisseur ciblé par la remise. NULL = remise globale fournisseur.
Règle: Non NULL = remise spécifique (priorité A/B). NULL = remise globale (priorité C/D).
Standard: Source de mapping fournisseur — valeurs issues de l''import ou config fournisseur.
Danger: Ne pas confondre bareme_code NULL (remise globale) et ligne manquante.';

COMMENT ON COLUMN catalog.tenant_supplier_discounts.discount_pct IS
'Rôle: Pourcentage de remise artisan (ex: 55.0 = 55%).
Règle: net_price = unit_price_ht × (1 - discount_pct / 100).
Standard: Source unique des remises — jamais stocker dans catalog_items.
Danger: Appliquer sur unit_cost_price au lieu de unit_price_ht = double remise.';


-- ════════════════════════════════════════════════════════════
-- BLOC 7 — COLONNES : billing.quotes
-- ════════════════════════════════════════════════════════════

COMMENT ON COLUMN billing.quotes.tenant_id IS
'Rôle: Identifiant du tenant artisan propriétaire du devis.
Règle: NOT NULL — tout devis appartient à un tenant.
Standard: Clé de filtrage RLS — jamais bypasser.
Danger: Oublier le filtre tenant_id = fuite de devis entre artisans.';

COMMENT ON COLUMN billing.quotes.payload IS
'Rôle: Dette contrôlée temporaire — données TVA et aides en attente de colonnes.
Règle: Jamais stocker données contractuelles ici. Accès : payload?.tva ?? {}.
Standard: Contient tva_context et aides. payload ≠ metadata (quote_lines).
Danger: payload est mutable et temporaire — metadata de quote_lines est immuable.';


-- ════════════════════════════════════════════════════════════
-- BLOC 8 — COLONNES : billing.quote_lines
-- ════════════════════════════════════════════════════════════

COMMENT ON COLUMN billing.quote_lines.product_id IS
'Rôle: FK vers catalog.catalog_items.id — lien au produit source.
Règle: S''appelle product_id — jamais catalog_item_id (n''existe pas dans le schéma).
Standard: Nullable = ligne libre sans produit catalogue.
Danger: Requête avec catalog_item_id retourne 0 résultats silencieusement.';

COMMENT ON COLUMN billing.quote_lines.unit_price_ht IS
'Rôle: Prix de vente client HT — figé à l''insertion depuis catalog_items.unit_price_ht.
Règle: Immuable après création. Jamais recalculé ni remplacé par net_price_ht.
Standard: Affiché au client. unit_cost_price = prix achat interne artisan.
Danger: Écraser avec net_price_ht = le client voit le prix d''achat.';

COMMENT ON COLUMN billing.quote_lines.unit_cost_price IS
'Rôle: Prix achat net artisan — depuis resolve_item_price.net_price_ht.
Règle: Jamais affiché dans le PDF client. NULL sur 100% des lignes actuelles (L1 non branché).
Standard: Figé à l''insertion. Calculé par resolve_item_price() dans addItem().
Danger: Ne jamais utiliser comme base de calcul du prix de vente.';

COMMENT ON COLUMN billing.quote_lines.vat_rate IS
'Rôle: Taux TVA de la ligne — figé à l''insertion. Stocké : 5.5 / 10.0 / 20.0.
Règle: Jamais 0 ni format décimal. Calcul TTC : total_ht × (1 + vat_rate / 100).
Standard: Toujours confirmé par l''artisan. TypeScript : type VatRate = 5.5 | 10 | 20.
Danger: Format décimal (0.10) = erreur de calcul TTC × 100. Valider avant PDF.';

COMMENT ON COLUMN billing.quote_lines.metadata IS
'Rôle: Snapshot immuable pricing + prescription — preuve contractuelle et légale DTU.
Règle: JAMAIS modifier après insertion. metadata ≠ payload (quotes).
Standard: Clés obligatoires : pricing.resolved_at, prescription.catalog_item_id.
Danger: metadata est immuable. payload (quotes) est temporaire. Ne pas confondre.';

COMMENT ON COLUMN billing.quote_lines.supplier_ref_snapshot IS
'Rôle: Référence d''achat fournisseur figée au moment du devis — pour bon de commande.
Règle: Copie de catalog_items.supplier_ref à l''insertion — jamais recalculé.
Standard: Utilisé pour grouper les lignes par fournisseur dans purchase_order_lines.
Danger: Ne pas relire catalog_items.supplier_ref — il peut avoir changé.';

COMMENT ON COLUMN billing.quote_lines.supplier_name_snapshot IS
'Rôle: Nom du distributeur d''achat figé au moment du devis.
Règle: Copie de catalog_items.supplier_name à l''insertion — jamais recalculé.
Standard: Utilisé pour grouper les commandes par distributeur dans purchase_orders.
Danger: supplier_name peut changer dans catalog_items — le snapshot protège l''historique.';


-- ════════════════════════════════════════════════════════════
-- BLOC 9 — COLONNES : billing.invoices
-- ════════════════════════════════════════════════════════════

COMMENT ON COLUMN billing.invoices.tenant_id IS
'Rôle: Tenant propriétaire de la facture — clé RLS.
Règle: NOT NULL — toute facture appartient à un artisan.
Standard: Filtrage RLS — jamais bypasser.
Danger: Oublier tenant_id = fuite de factures entre artisans.';

COMMENT ON COLUMN billing.invoices.invoice_kind IS
'Rôle: Type de facture : deposit | final | credit_note.
Règle: Workflow : deposit → final (parent_invoice_id=deposit.id) → credit_note (adjusted_invoice_id=final.id).
Standard: deposit = acompte. final = solde. credit_note = avoir correctif.
Danger: credit_note sans adjusted_invoice_id = avoir orphelin non traçable.';

COMMENT ON COLUMN billing.invoices.invoice_status IS
'Rôle: Statut : draft | sent | paid | partial | overdue | canceled | void.
Règle: void = annulée sans avoir. canceled = annulée avec avoir (credit_note lié).
Standard: paid → paid_at obligatoire. overdue = due_date dépassée sans paiement complet.
Danger: Ne pas confondre canceled (avec avoir) et void (sans avoir).';

COMMENT ON COLUMN billing.invoices.origin_mode IS
'Rôle: Origine : from_quote | direct_intervention | manual.
Règle: from_quote → quote_id obligatoire. direct_intervention → intervention_id obligatoire.
Standard: Détermine le flux de création et les champs obligatoires associés.
Danger: origin_mode=manual = facture libre — pas de snapshot catalogue garanti.';

COMMENT ON COLUMN billing.invoices.parent_invoice_id IS
'Rôle: FK vers la facture d''acompte parente (invoice_kind=deposit).
Règle: NULL si standalone. Non NULL si invoice_kind=final avec deposit lié.
Standard: Permet de calculer le solde restant dû (total_ttc − acomptes payés).
Danger: parent_invoice_id ne peut pointer qu''un deposit — pas une autre final.';

COMMENT ON COLUMN billing.invoices.adjusted_invoice_id IS
'Rôle: FK vers la facture corrigée par cet avoir (credit_note).
Règle: Obligatoire si invoice_kind=credit_note — NULL sinon.
Standard: Lien traçable pour export FEC et Factur-X.
Danger: credit_note sans adjusted_invoice_id casse la traçabilité comptable.';

COMMENT ON COLUMN billing.invoices.facturx_xml IS
'Rôle: XML Factur-X (e-facture structurée) — NULL si non générée.
Règle: Généré uniquement si einvoice_status=ready. Jamais éditer manuellement.
Standard: Conforme EN 16931. Référencé dans einvoice_ref après envoi.
Danger: Modifier facturx_xml après envoi = non-conformité légale.';

COMMENT ON COLUMN billing.invoices.einvoice_status IS
'Rôle: Statut e-facture : NULL | ready | sent | acknowledged | rejected.
Règle: NULL = non concernée. rejected = facturx_xml à corriger avant renvoi.
Standard: ready → envoi via connecteur. acknowledged = acceptée par destinataire.
Danger: rejected sans correction = blocage paiement.';

COMMENT ON COLUMN billing.invoices.external_reference IS
'Rôle: Référence dans le logiciel comptable externe (Evoliz, Pennylane, Sage...).
Règle: external_system CHECK : evoliz | pennylane | sage | ebp | cegid | axonaut | sellsy | other.
Standard: NULL si non synchronisé. synced_at = horodatage dernière synchro.
Danger: Ne pas écraser manuellement — géré par le connecteur de synchronisation.';

COMMENT ON COLUMN billing.invoices.payload IS
'Rôle: Dette contrôlée temporaire — contexte fiscal et notes en attente de colonnes.
Règle: Jamais stocker données légales obligatoires ici. Accès défensif : payload?.xxx ?? {}.
Standard: Même convention que billing.quotes.payload.
Danger: payload est mutable — données de référence → invoice_lines.metadata.';


-- ════════════════════════════════════════════════════════════
-- BLOC 10 — COLONNES : billing.invoice_lines
-- ════════════════════════════════════════════════════════════

COMMENT ON COLUMN billing.invoice_lines.source_line_id IS
'Rôle: Référence polymorphique vers la ligne source — cible dépend de origin_mode.
Règle: from_quote → quote_lines.id. direct_intervention → intervention_line.id. NULL = manuel.
Standard: origin_mode détermine le type de la ligne source — ne pas supposer quote_lines.
Danger: Ne pas assumer que source_line_id pointe toujours quote_lines.';

COMMENT ON COLUMN billing.invoice_lines.quote_line_id IS
'Rôle: FK spécifique vers billing.quote_lines.id — distinct de source_line_id.
Règle: NULL si origin_mode=direct_intervention ou manual. Non NULL si from_quote.
Standard: Présent → metadata hérité snapshot quote_lines. Absent → snapshot vide ou manuel.
Danger: source_line_id est polymorphique. quote_line_id est toujours quote_lines.';

COMMENT ON COLUMN billing.invoice_lines.product_id IS
'Rôle: FK vers catalog.catalog_items.id — même convention que quote_lines.product_id.
Règle: Nullable. S''appelle product_id (cohérent avec quote_lines — pas catalog_item_id).
Standard: NULL si ligne de service ou ligne manuelle sans produit catalogue.
Danger: purchase_order_lines utilise catalog_item_id — même table cible, nommage différent.';

COMMENT ON COLUMN billing.invoice_lines.unit_price_ht IS
'Rôle: Prix de vente HT figé — depuis quote_lines ou saisi manuellement.
Règle: Immuable après création. Jamais remplacer par unit_cost_price.
Standard: Affiché au client dans le PDF facture.
Danger: Écraser avec net_price_ht = erreur contractuelle et légale.';

COMMENT ON COLUMN billing.invoice_lines.unit_cost_price IS
'Rôle: Prix achat net artisan — hérité de quote_lines.unit_cost_price.
Règle: Jamais affiché dans le PDF client.
Standard: Utilisé pour le calcul de marge interne uniquement.
Danger: Ne jamais afficher ni transmettre au client.';

COMMENT ON COLUMN billing.invoice_lines.metadata IS
'Rôle: Snapshot immuable hérité de quote_lines.metadata (pricing + prescription).
Règle: JAMAIS modifier après insertion. Même structure que quote_lines.metadata.
Standard: NULL si ligne manuelle sans source_line_id.
Danger: metadata est immuable — toute modification casse la traçabilité légale.';

COMMENT ON COLUMN billing.invoice_lines.vat_rate IS
'Rôle: Taux TVA de la ligne — stocké : 5.5 / 10.0 / 20.0.
Règle: Jamais 0 ni format décimal. Calcul TTC : total_ht × (1 + vat_rate / 100).
Standard: Hérité de quote_lines.vat_rate si from_quote. TypeScript : type VatRate = 5.5 | 10 | 20.
Danger: Format décimal (0.10) = calcul TTC × 100. Valider cohérence avec la facture.';

COMMENT ON COLUMN billing.invoice_lines.service_date IS
'Rôle: Date de réalisation du service (lignes d''intervention principalement).
Règle: NULL si non applicable. Obligatoire pour lignes de prestation SAV.
Standard: Requis pour e-facturation des prestations de service (Factur-X EN 16931).
Danger: NULL sur une ligne de service = rejet possible Factur-X.';


-- ════════════════════════════════════════════════════════════
-- BLOC 11 — COLONNES : billing.purchase_orders
-- ════════════════════════════════════════════════════════════

COMMENT ON COLUMN billing.purchase_orders.supplier_name IS
'Rôle: Nom du distributeur destinataire — clé de regroupement des lignes.
Règle: 1 purchase_order par supplier_name distinct par projet. Casse identique à catalog_items.supplier_name.
Standard: Lignes regroupées depuis supplier_name_snapshot de quote_lines.
Danger: Casse incorrecte = commande non rattachée aux remises tenant_supplier_discounts.';

COMMENT ON COLUMN billing.purchase_orders.supplier_ref IS
'Rôle: Référence fournisseur pour ce bon de commande — clé d''achat externe.
Règle: Transmis tel quel au fournisseur — jamais un identifiant métier LIGNIA.
Standard: Distinct de purchase_order_lines.reference (= supplier_ref par ligne article).
Danger: Ne pas confondre avec order_number (= référence interne LIGNIA).';

COMMENT ON COLUMN billing.purchase_orders.order_status IS
'Rôle: Statut (CHECK actif) : draft | sent | confirmed | partial | received | cancelled.
Règle: partial = réception incomplète sur ≥1 ligne. received = toutes lignes réceptionnées.
Standard: Transitions via rpc_receive_delivery_and_advance_project.
Danger: received sans vérification de toutes les lignes = stock potentiellement incorrect.';

COMMENT ON COLUMN billing.purchase_orders.external_reference IS
'Rôle: Référence dans le logiciel externe (Evoliz, Pennylane...).
Règle: external_system CHECK : evoliz | pennylane | sage | ebp | cegid | axonaut | sellsy | other.
Standard: NULL si non synchronisé. Géré par connecteur automatique.
Danger: Ne pas écraser manuellement — risque de désynchronisation.';


-- ════════════════════════════════════════════════════════════
-- BLOC 12 — COLONNES : billing.purchase_order_lines
-- ════════════════════════════════════════════════════════════

COMMENT ON COLUMN billing.purchase_order_lines.catalog_item_id IS
'Rôle: FK vers catalog.catalog_items.id — article commandé.
Règle: Nullable. S''appelle catalog_item_id ici — différent de quote_lines.product_id (même table cible).
Standard: NULL = ligne hors catalogue (article libre ou service).
Danger: Nommage différent de quote_lines/invoice_lines (product_id) — dette de cohérence acceptée.';

COMMENT ON COLUMN billing.purchase_order_lines.reference IS
'Rôle: Référence d''achat transmise au fournisseur pour cette ligne.
Règle: Copié depuis catalog_items.supplier_ref — clé d''achat externe, pas métier LIGNIA.
Standard: Jamais modifier après order_status=sent.
Danger: Modifier après envoi = désynchronisation avec le traitement fournisseur.';

COMMENT ON COLUMN billing.purchase_order_lines.qty_ordered IS
'Rôle: Quantité commandée — figée à la création de la ligne.
Règle: > 0 obligatoire. Jamais modifier après order_status=sent.
Standard: qty_received ≤ qty_ordered. qty_received = qty_ordered → order_status=received.
Danger: Modifier après envoi = désynchronisation avec le fournisseur.';

COMMENT ON COLUMN billing.purchase_order_lines.qty_received IS
'Rôle: Quantité reçue — mise à jour à la réception partielle ou totale.
Règle: 0 par défaut. qty_received < qty_ordered → order_status=partial.
Standard: Mis à jour via rpc_receive_delivery_and_advance_project uniquement.
Danger: Incrémenter manuellement sans RPC = désync statut projet.';


-- ════════════════════════════════════════════════════════════
-- BLOC 13 — COLONNES : core.customers
-- ════════════════════════════════════════════════════════════

COMMENT ON COLUMN core.customers.tenant_id IS
'Rôle: Artisan propriétaire du client — clé RLS.
Règle: NOT NULL — tout client appartient à un artisan.
Standard: Filtrage RLS — jamais bypasser.
Danger: Un client ne peut pas être partagé entre tenants.';

COMMENT ON COLUMN core.customers.customer_type IS
'Rôle: Type de client : particulier | professionnel | collectivite (ENUM).
Règle: NOT NULL. Détermine les champs d''identité affichés et la TVA applicable.
Standard: particulier → civility+first_name+last_name. pro/collectivite → company_name.
Danger: Mauvais type = affichage incorrect du nom et erreur TVA (collectivite → 20%).';

COMMENT ON COLUMN core.customers.siret IS
'Rôle: Numéro SIRET (14 chiffres) — identifiant légal professionnel/collectivité.
Règle: NULL autorisé. Obligatoire pour e-facturation B2B.
Standard: Validé via API Sirene si renseigné. Utilisé pour les mentions légales PDF.
Danger: Stocker dans payload au lieu de siret = invisible pour l''export FEC.';

COMMENT ON COLUMN core.customers.source_origin IS
'Rôle: Canal d''acquisition du client — valeur libre (pas d''ENUM).
Règle: NOT NULL. Exemples réels : manual, web_form, import, referral.
Standard: Utilisé pour l''analyse pipeline et les KPIs d''acquisition.
Danger: Valeur générique ou vide = perte de données CRM.';

COMMENT ON COLUMN core.customers.payload IS
'Rôle: Dette contrôlée temporaire — données complémentaires sans colonne dédiée.
Règle: Jamais stocker données légales ici. SIRET → colonne siret. Accès : payload?.xxx ?? {}.
Standard: Même convention que billing.quotes.payload.
Danger: payload est mutable — jamais utiliser comme source de vérité contractuelle.';


-- ════════════════════════════════════════════════════════════
-- BLOC 14 — COLONNES : core.properties
-- ════════════════════════════════════════════════════════════

COMMENT ON COLUMN core.properties.tenant_id IS
'Rôle: Artisan propriétaire du bien — clé RLS.
Règle: NOT NULL. Tout bien appartient à un artisan.
Standard: Filtrage RLS — jamais bypasser.
Danger: Un bien ne peut pas être partagé entre tenants.';

COMMENT ON COLUMN core.properties.property_type IS
'Rôle: Type de logement — détermine l''éligibilité à la TVA réduite.
Règle: NULL autorisé mais bloquant pour TVA réduite. Valeur libre (pas d''ENUM).
Standard: Exemples : maison | appartement | local_commercial | immeuble.
Danger: NULL = TVA réduite impossible à valider avant génération PDF.';

COMMENT ON COLUMN core.properties.external_data IS
'Rôle: Données géographiques API BAN — distinct de payload.
Règle: Format : {ban: {citycode, score, city, postcode, label, coordinates}}.
Standard: Alimenté par l''Edge Function de validation BAN. Lecture seule côté app.
Danger: external_data ≠ payload. Ne pas stocker TVA ici — payload.tva uniquement.';

COMMENT ON COLUMN core.properties.payload IS
'Rôle: Dette contrôlée — contexte TVA réduite et données fiscales.
Règle: payload.tva.logement_eligible_tva_reduite + tva_attestation_collected.
Standard: Accès défensif : payload?.tva ?? {}.
Danger: payload ≠ external_data. Ne jamais stocker geocodage dans payload.';


-- ════════════════════════════════════════════════════════════
-- BLOC 15 — COLONNES : core.projects
-- ════════════════════════════════════════════════════════════

COMMENT ON COLUMN core.projects.tenant_id IS
'Rôle: Artisan propriétaire du projet — clé RLS.
Règle: NOT NULL. Tout projet appartient à un artisan.
Standard: Filtrage RLS — jamais bypasser.
Danger: Un projet ne peut pas être partagé entre tenants.';

COMMENT ON COLUMN core.projects.status IS
'Rôle: Avancement dans le pipeline : lead_new → ... → closed | cancelled (ENUM, 17 valeurs).
Règle: Transitions via RPCs uniquement (sign_quote, commissioning, etc.).
Standard: Valeur courante la plus avancée : mes_done → closed.
Danger: Modifier manuellement sans RPC = désynchronisation avec core.activities.';

COMMENT ON COLUMN core.projects.pipeline_value_ttc IS
'Rôle: Valeur commerciale TTC estimée — dashboard KPIs uniquement.
Règle: NULL autorisé. pipeline_value_source indique la provenance.
Standard: Calculé depuis les devis liés — jamais saisi manuellement comme donnée comptable.
Danger: Valeur indicative — ne jamais utiliser pour la comptabilité ou les déclarations.';

COMMENT ON COLUMN core.projects.payload IS
'Rôle: Dette contrôlée temporaire — données complémentaires du projet.
Règle: Jamais stocker données contractuelles ou comptables ici.
Standard: Même convention que billing.quotes.payload. Accès défensif obligatoire.
Danger: payload est mutable — données de référence → colonnes dédiées.';


-- ════════════════════════════════════════════════════════════
-- BLOC 16 — COLONNES : catalog.heating_appliances
-- ════════════════════════════════════════════════════════════

COMMENT ON COLUMN catalog.heating_appliances.tenant_id IS
'Rôle: Tenant propriétaire (NULL = appareil registre ADEME partagé LIGNIA).
Règle: NULL = central visible par tous. Non NULL = appareil artisan privé.
Standard: Même convention que catalog_items.tenant_id.
Danger: Ne pas insérer tenant_id sur un appareil issu du registre ADEME officiel.';

COMMENT ON COLUMN catalog.heating_appliances.appliance_type IS
'Rôle: Type d''appareil selon la nomenclature ADEME — texte libre du registre.
Règle: Nomenclature ADEME ≠ catalog_items.product_kind — taxonomies incompatibles.
Standard: Compatibilité poêle→fumisterie via couche prescription/mapping — jamais égalité texte directe.
Danger: Joindre heating_appliances.appliance_type avec catalog_items.product_kind = résultats erronés.';

COMMENT ON COLUMN catalog.heating_appliances.ademe_fonds_air_bois_status IS
'Rôle: Éligibilité Fonds Air Bois ADEME : confirmed | pending | not_eligible | unknown.
Règle: confirmed UNIQUEMENT depuis le registre ADEME officiel — jamais depuis un catalogue fabricant.
Standard: Valeur par défaut à l''import : unknown. Mis à jour par pipeline ADEME uniquement.
Danger: confirmed depuis catalogue fabricant = erreur légale — aides refusées au client.';

COMMENT ON COLUMN catalog.heating_appliances.flamme_verte_status IS
'Rôle: Statut label Flamme Verte : confirmed | to_verify | not_applicable | expired.
Règle: confirmed UNIQUEMENT depuis le registre Flamme Verte officiel (Qualit EnR / ADEME).
Standard: Valeur par défaut : to_verify. Jamais déduire depuis flamme_verte_stars seul.
Danger: 7★ / A+ dans un catalogue fabricant = classe EcoDesign — PAS le label Flamme Verte.';

COMMENT ON COLUMN catalog.heating_appliances.flamme_verte_stars IS
'Rôle: Nombre d''étoiles Flamme Verte (5, 6 ou 7). NULL si statut non confirmed.
Règle: flamme_verte_stars présent ne suffit pas — flamme_verte_status doit être confirmed.
Standard: 7★ = niveau maximum actuel. Ne pas confondre avec la classification EcoDesign.
Danger: Stars sans status confirmed = label affiché sans base officielle.';

COMMENT ON COLUMN catalog.heating_appliances.data_source IS
'Rôle: Source des données : ademe | manufacturer | manual.
Règle: ademe = import registre ADEME. manufacturer = catalogue fabricant. Jamais croiser les deux.
Standard: Détermine la fiabilité des statuts ademe_fonds_air_bois_status et flamme_verte_status.
Danger: data_source=ademe sur données fabricant = fausse fiabilité des statuts d''éligibilité.';

COMMENT ON COLUMN catalog.heating_appliances.fuel_type IS
'Rôle: Type d''énergie de l''appareil : bois | granules | fioul | gaz | mixte.
Règle: Valeur libre — cohérence obligatoire avec catalog_items.energy_type pour la prescription.
Standard: Utilisé pour valider la compatibilité conduit/appareil selon les règles DTU.
Danger: fuel_type incohérent avec energy_type du conduit = prescription erronée.';

COMMENT ON COLUMN catalog.heating_appliances.nominal_power_kw IS
'Rôle: Puissance nominale en kW — aide au dimensionnement conduit.
Règle: NULL autorisé. Dimensionnement à valider selon DTU 24.1 / EN13384 / données fabricant.
Standard: NULL = prescription automatique impossible ou à confirmer manuellement par l''artisan.
Danger: Ne jamais valider un diamètre uniquement depuis ce champ sans règle métier dédiée.';

COMMENT ON COLUMN catalog.heating_appliances.registry_valid_until IS
'Rôle: Date d''expiration de l''homologation dans le registre ADEME.
Règle: NULL = pas de date connue. Passée = vérifier standard_obsolete et re-confirmer éligibilité.
Standard: Vérifier avant de valider une éligibilité Fonds Air Bois.
Danger: Appareil expiré présenté comme éligible = aide refusée au client.';


-- ════════════════════════════════════════════════════════════
-- BLOC 17 — FONCTIONS
-- ════════════════════════════════════════════════════════════

COMMENT ON FUNCTION public.search_quote_items(uuid, text, text[], text, boolean, integer) IS
'Rôle: Recherche articles catalogue pour le CatalogPopover.
Règle: LEGACY — remplacé par catalog.search_quote_items_v2.
Standard: Conservé pour compatibilité. Ne retourne pas les 9 colonnes v2.
Danger: Badges ⚠️, is_etanche, energy_type_simple et is_central absents.';

COMMENT ON FUNCTION public.search_quote_items_v2(uuid, text, text[], text, boolean, integer) IS
'Rôle: Implémentation native plpgsql — 34 colonnes dont 9 champs prescription/sécurité.
Règle: Implémentation interne — ne pas appeler directement depuis Lovable.
Standard: Exposée via le wrapper catalog.search_quote_items_v2 (catalogDb.rpc()).
Danger: Appeler public. depuis Lovable contourne catalogDb — toujours passer par catalog.';

COMMENT ON FUNCTION catalog.search_quote_items(uuid, text, text[], text, boolean, integer) IS
'Rôle: Wrapper SQL vers public.search_quote_items — accessible via catalogDb.rpc().
Règle: LEGACY — wrapper de v1. Ne plus utiliser dans du nouveau code Lovable.
Standard: Conservé pour compatibilité ascendante des appels existants.
Danger: Ne retourne pas les 9 colonnes v2 — badges ⚠️ et is_central absents.';

COMMENT ON FUNCTION catalog.search_quote_items_v2(uuid, text, text[], text, boolean, integer) IS
'Rôle: RPC STANDARD Lovable — wrapper officiel vers public.search_quote_items_v2.
Règle: public.* = implémentation interne. catalog.* = interface Lovable via catalogDb.rpc().
Standard: Toute évolution RETURNS TABLE dans public. doit être répercutée ici manuellement + testée.
Danger: Si public. change sans mise à jour ici, Lovable retourne des erreurs runtime silencieuses.';

COMMENT ON FUNCTION catalog.resolve_item_price(uuid, uuid, text) IS
'Rôle: Seule source du pricing net artisan — retourne JSONB avec net_price_ht.
Règle: Appeler UNIQUEMENT dans addItem() — jamais dans le CatalogPopover.
Standard: pricing_source=central_catalog si article central sans remise configurée.
Danger: net_price_ht → unit_cost_price (jamais unit_price_ht) = erreur contractuelle.';

-- ============================================================
-- FIN DE MIGRATION
-- ============================================================
