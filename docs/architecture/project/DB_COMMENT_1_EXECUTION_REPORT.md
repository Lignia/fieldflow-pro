# DB-COMMENT-1 — EXECUTION REPORT

> Statut : **APPLIQUÉ ET CONFIRMÉ EN BASE**  
> Date   : 2026-05-17  
> Projet : LIGNIA 4 — `hejxvqghsyaauwzkfikg` (Supabase EU West)

---

## Migration appliquée

| Champ | Valeur |
|---|---|
| Nom migration | `db_comment_1_final` |
| Fichier source | `supabase/migrations/20260517_db_comment_1_final.sql` |
| Commit GitHub | `e97dec99ca8f5d4eed6e2ae756c8bec39727840d` |
| Nature | `COMMENT ON TABLE / COLUMN / FUNCTION` uniquement |
| Idempotent | Oui — peut être réappliquée sans effet de bord |

**Confirmation** : aucun changement de schéma, aucune colonne ajoutée, aucun ENUM créé, aucune contrainte modifiée, aucune donnée métier touchée.

---

## Périmètre documenté

| Catégorie | Nombre | Schémas |
|---|---|---|
| Tables | 13 | catalog (3), billing (6), core (3) |
| Colonnes | 80 | catalog (28), billing (34), core (14), heating_appliances (9) |
| Fonctions | 5 | catalog (4), public (1 legacy) |
| **Total** | **98 objets** | |

### Tables documentées

**catalog** : `catalog_items`, `import_joncoux_staging`, `tenant_supplier_discounts`  
**billing** : `quotes`, `quote_lines`, `invoices`, `invoice_lines`, `purchase_orders`, `purchase_order_lines`  
**core** : `customers`, `properties`, `projects`

### Fonctions documentées

| Fonction | Statut |
|---|---|
| `catalog.search_quote_items_v2` | STANDARD — RPC Lovable |
| `catalog.search_quote_items` | LEGACY — wrapper v1 |
| `catalog.resolve_item_price` | STANDARD |
| `public.search_quote_items_v2` | Implémentation interne |
| `public.search_quote_items` | LEGACY |

---

## DOC-STABILITY-PASS appliqué

Passe sémantique finale avant GO — corrections intégrées dans le commit `e97dec99` :

| Avant | Après | Raison |
|---|---|---|
| `CHECK actif` | `contrainte métier appliquée en base` | CHECK peut changer |
| `ENUM (17 valeurs)` | `pipeline métier géré via RPCs` | Nombre de valeurs peut évoluer |
| `Valeurs réelles :` | `Exemples courants :` | Import futur peut étendre la liste |
| `NULL sur 100% des lignes actuelles` | Supprimé | Vérité temporelle — faux dans 2 semaines |
| `RLS deny-all` | `accès réservé aux Edge Functions/service_role` | Policy implémentation, pas intention |
| `liste fermée` | `liste contrôlée applicativement` | Pas d'ENUM ni de CHECK en base |

---

## Points clés validés

### `supplier_name` / `manufacturer_name`

```
supplier_name   = distributeur d'achat (ex: Lorflex, Poujoulat)
                  case-sensitive — identique dans catalog_items
                  ET tenant_supplier_discounts ET purchase_orders
manufacturer_name = fabricant réel (ex: Joncoux, Jeremias)
                  distinct du canal d'achat
                  snapshoté dans metadata.prescription
```

### `unit_price_ht` / `unit_cost_price`

```
unit_price_ht   = prix vente client  — affiché au client — JAMAIS remplacé par net_price_ht
unit_cost_price = prix achat artisan — JAMAIS affiché au client
Calcul TTC      = total_ht × (1 + vat_rate / 100)
vat_rate        ∈ {5.5, 10.0, 20.0} — jamais format décimal
```

### `catalog.*` wrapper vs `public.*`

```
catalog.*  = interface Lovable — appel via catalogDb.rpc()
public.*   = implémentation interne — ne pas appeler depuis Lovable

Règle : toute évolution RETURNS TABLE dans public.*
        doit être répercutée manuellement dans catalog.* + testée
        Sans ça : erreurs runtime silencieuses côté Lovable
```

### `payload` = dette contrôlée

```
billing.quotes.payload      — tva_context + aides (temporaire)
billing.invoices.payload    — contexte fiscal (temporaire)
core.properties.payload     — ancienneté + attestation TVA (temporaire)
core.customers.payload      — données complémentaires (temporaire)
core.projects.payload       — données complémentaires (temporaire)

Règle universelle :
  - Accès défensif : payload?.xxx ?? {}
  - Jamais données contractuelles/légales
  - Jamais source de vérité
  - Jamais colonne indexable
```

### `item_family` contrôlé applicativement

```
Statut actuel : vide à 100% — colonne prête pour import multi-fournisseurs

Valeurs autorisées (validation Edge Function — pas de CHECK SQL) :
  conduit_principal | systeme_etanche | tubage_flexible | tubage_rigide |
  raccordement_visible | raccordement_pellets_visible | sortie_toiture |
  gaine_technique | accessoire_fumisterie | adaptateur_transition

Documenté dans :
  - COMMENT ON COLUMN catalog.catalog_items.item_family (en base)
  - DECISION_LOG.md D-12
  - LIGNIA_ARCHITECTURE_LEDGER.md §4.6
```

---

## Risques restants

### R-01 — `is_central = false` sur 100% des articles

```
État    : 18 260 articles, tous is_central=false
Cause   : import central (is_central=true, tenant_id=NULL) non encore exécuté
Impact  : catalog.resolve_item_price retourne pricing_source=central_catalog
          sur 100% des articles — pas de remise négociée possible
Fix     : Edge Functions import-joncoux-central + publish-joncoux-batch
Priorité: P0 avant Lovable L1
```

### R-02 — `unit_cost_price` non branché dans `addItem()`

```
État    : unit_cost_price = NULL sur 100% des quote_lines
Cause   : resolve_item_price non appelé dans addItem() (Lovable)
Impact  : marge artisan non calculée, unit_cost_price inutilisable
Fix     : Lovable L1 — brancher addItem() → resolve_item_price
Priorité: P0 — bloquant pour les fonctionnalités pricing
```

### R-03 — `item_family` vide

```
État    : item_family = NULL sur 100% des catalog_items
Cause   : aucun import multi-fournisseurs exécuté
Impact  : pas de regroupement par famille produit, taxonomie incomplète
Fix     : valider les 10 valeurs autorisées dans l'Edge Function
          lors du premier import Poujoulat/Jeremias
Priorité: P1 avant import multi-fournisseurs
```

### R-04 — DTA non encore exploité

```
État    : has_dta=false, dta_status=NULL sur 100% des catalog_items
          needs_human_review=false sur 100% des catalog_items
Cause   : règles DTA/is_etanche non appliquées (pipeline ADEME à connecter)
Impact  : badge ⚠️ CatalogPopover jamais affiché
          prescription étanchéité non contrôlée
Fix     : appliquer les règles DTA lors du pipeline d'import
          is_etanche=true + dta_status IN ('missing','unknown')
          → needs_human_review=true
Priorité: P1 sécurité/DTU
```

### R-05 — FRONT-DOC-1 à faire

```
État    : contrats Frontend↔Backend documentés dans :
          - LIGNIA_ARCHITECTURE_LEDGER.md §4
          - docs/architecture/core/CATALOG_TO_QUOTE_CONTRACT.md
          - docs/architecture/frontend/LOVABLE_FRONTEND_RULES.md
          Mais aucun fichier TypeScript de constantes partagées n'existe.
Impact  : les règles (VatRate, item_family, pricing_source, vat_rate format)
          vivent dans la documentation, pas dans le code Lovable
Fix     : FRONT-DOC-1 — créer :
          src/types/catalog.ts   (VatRate, PricingSource, ItemFamily)
          src/types/quote.ts     (QuoteLineMetadata, PayloadTva)
          src/constants/catalog.ts (ITEM_FAMILY_VALUES, VAT_RATES)
Priorité: P1 avant Lovable L1
```

---

## Historique des sessions DB-COMMENT-1

| Session | Contenu | Commit |
|---|---|---|
| Vague 1 (preview) | catalog, billing.quotes/quote_lines, fonctions | — |
| Vague 2 (preview) | billing.invoices+, core.*, heating_appliances | — |
| Corrections multi-fabricants | Neutralisation Joncoux-centric, TVA, wrapper RPC | — |
| DOC-STABILITY-PASS | Suppression formulations temporelles et figées | `e97dec99` |
| **GO apply_migration** | **Migration appliquée en base** | `e97dec99` |
| Rapport de clôture | Ce document | voir commit courant |

---

## Références

| Document | Emplacement |
|---|---|
| Migration SQL | `supabase/migrations/20260517_db_comment_1_final.sql` |
| Invariants base | `docs/architecture/core/DATABASE_INVARIANTS.md` v1.3 |
| Contrat catalogue→devis | `docs/architecture/core/CATALOG_TO_QUOTE_CONTRACT.md` |
| Règles Lovable | `docs/architecture/frontend/LOVABLE_FRONTEND_RULES.md` |
| Décisions D-01→D-16 | `docs/architecture/project/DECISION_LOG.md` v1.3 |
| Architecture globale | `LIGNIA_ARCHITECTURE_LEDGER.md` v1.0 |

---

*DB-COMMENT-1 — Clôture 2026-05-17*
