# LIGNIA — Project Knowledge Lovable

> À coller dans Lovable → Project Settings → Knowledge.
> Contexte spécifique au projet LIGNIA uniquement.
> Règles génériques (TypeScript, React, design) → AGENTS.md (Workspace Knowledge).

---

## MODÈLE PRODUIT — SAAS MULTI-TENANT

LIGNIA est une plateforme SaaS B2B vendue en abonnement à des centaines d'artisans.
Chaque décision d'interface doit fonctionner pour 500 entreprises différentes,
pas seulement pour l'artisan en cours de test.

Chaque artisan (ou entreprise) = un tenant distinct et isolé.
Un écran doit être compris et utilisable par un artisan non informatique en moins de 30 secondes.
Chaque clic économisé est multiplié par des milliers d'utilisateurs.
Si une fonctionnalité demande une explication, elle est probablement mal conçue.
Toujours préférer une configuration unique qui bénéficie à toute l'équipe
plutôt qu'une option répétée à chaque devis.

Catalogue central (géré par LIGNIA éditeur) :
  Partagé entre tous les tenants en lecture.
  Seul LIGNIA peut l'importer ou le modifier.
  is_central = true, tenant_id = NULL.

Catalogue privé (géré par chaque tenant) :
  Articles créés par l'artisan lui-même.
  is_central = false, tenant_id = UUID du tenant.

Isolation des données :
  Ne jamais coder en dur un tenant_id.
  Utiliser uniquement le tenantId du user courant via useCurrentUser().
  Quand une table ou une RPC exige tenant_id, utiliser ce tenantId courant.
  Ne jamais utiliser un UUID de test copié depuis Supabase.
  La RLS reste la barrière de sécurité principale — ne jamais la contourner.

---

## PROJET

LIGNIA est un CRM B2B pour artisans bois énergie.
Cycle : Lead → Devis → Signature → Installation → SAV → Facturation.

Utilisateurs principaux :
- `admin` : patron, paramètre l'entreprise, valide les devis
- `user` : secrétaire, commercial, poseur — usage quotidien
- `super_admin` : équipe LIGNIA, accès total

---

## ARCHITECTURE FRONTEND

- React + TypeScript + Vite
- Tailwind CSS (tokens uniquement — jamais de hex)
- shadcn/ui pour tous les composants
- React Router v6
- Supabase multi-schéma

### Schémas Supabase — import obligatoire

```typescript
import { catalogDb, billingDb, coreDb, operationsDb }
  from "@/integrations/supabase/schema-clients";

// catalog    → catalog_items, catalogs, heating_appliances,
//               tenant_supplier_discounts, tenant_suppliers
// billing    → quotes, quote_lines, quote_sections, invoices,
//               invoice_lines, document_sequences
// core       → customers, projects, installations, users, tenants
// operations → interventions, service_requests
```

Ne jamais utiliser le client Supabase par défaut pour ces schémas.
Toujours utiliser le schéma correspondant à la table cible.

### Récupérer le tenantId et le rôle

```typescript
const { tenantId, userRole, coreUser } = useCurrentUser();
```

### Hooks existants — modifier uniquement si le ticket le demande explicitement

| Hook | Fichier |
|---|---|
| useCatalog | src/hooks/useCatalog.ts |
| useCatalogSearch | src/hooks/useCatalogSearch.ts |
| useQuoteDetail | src/hooks/useQuoteDetail.ts |
| useSignQuote | src/hooks/useSignQuote.ts |
| useCurrentUser | src/hooks/useCurrentUser.tsx |

---

## INVARIANTS — NE JAMAIS VIOLER

```
INVARIANT 1  supplier_ref = code fournisseur brut — jamais modifié
INVARIANT 2  cost_price = NULL dans catalog_items — jamais affiché
INVARIANT 3  unit_price_ht = prix public uniquement
INVARIANT 4  quote_lines = snapshots immuables après signature
INVARIANT 5  resolve_item_price = seule source de pricing runtime
INVARIANT 6  RLS activée sur toutes les tables multi-tenant
INVARIANT 7  Ne jamais modifier : search_quote_items_v2,
             resolve_item_price, replace_quote_lines
```

---

## FICHIERS SENSIBLES

Gros fichiers — toujours commencer par Plan Mode.
Ne modifier que la fonction explicitement citée dans le ticket.

```
QuoteEditor.tsx               gros fichier — Plan Mode obligatoire
Catalog.tsx                   gros fichier — Plan Mode obligatoire
useCatalog.ts                 modifier uniquement la fonction citée
useSignQuote.ts               modifier uniquement si ticket l'exige
ApplianceSearchTab.tsx        modifier uniquement si ticket l'exige
useCatalogSearch.ts           modifier uniquement si ticket l'exige
                              (accepte déjà activeSuppliers en param)
```

---

## RÈGLES MÉTIER

```
TVA
  Respecter le vat_rate déjà porté par l'article ou la ligne.
  Ne jamais inférer un taux de TVA sauf instruction explicite dans le ticket.
  Cas connu à corriger : addAppliance() dans QuoteEditor.tsx
  hardcode encore vat_rate: 20 au lieu de 5.5 — ticket BUG-01 en cours.

Suppression article catalogue
  = is_active=false (jamais DELETE physique)

Devis signé
  = immuable (INVARIANT 4)

Fournisseurs visibles
  Objectif en cours : utiliser tenant_suppliers pour filtrer
  la recherche catalogue et devis.
  À ce jour, tenant_suppliers existe et est peuplée,
  mais le front ne la lit pas encore partout.
  Ne pas considérer ce filtre comme actif sauf si le ticket le précise.

Colonne cost_price
  = toujours NULL — ne jamais afficher (INVARIANT 2)

Modification locale
  Toujours privilégier une modification locale
  plutôt qu'un refactoring global.
  Si une correction peut se faire dans une seule fonction :
  ne pas toucher au reste du fichier.
```

---

## RÔLES ET VISIBILITÉ

```typescript
// Bouton admin seulement :
if (userRole === 'admin' || userRole === 'super_admin') { ... }

// Visible pour tous :
if (userRole) { ... }
```

Exemple : bouton "Importer un catalogue" → admin uniquement.

---

## INTERDIT DANS CE PROJET

```
❌ Modifier search_quote_items_v2
❌ Modifier resolve_item_price
❌ Modifier replace_quote_lines
❌ Créer une nouvelle table Supabase
❌ DELETE physique sur catalog_items → utiliser is_active=false
❌ Hardcoder des couleurs hex
❌ localStorage ou sessionStorage
❌ Introduire un formulaire complexe sans instruction explicite dans le ticket
❌ Afficher cost_price (toujours NULL)
❌ Implémenter sur un gros fichier sans Plan Mode préalable
❌ Coder en dur un tenant_id ou un UUID arbitraire
```

---

## CHECKLIST AVANT DE CODER

```
1. Lire le ticket complètement
2. Vérifier ce Knowledge File
3. Plan Mode si gros fichier (QuoteEditor, Catalog)
4. Modifier le minimum nécessaire
5. Ne pas toucher ce qui n'est pas dans le ticket
6. Valider sur le compte de test
7. Commit
```

---

## FORMAT TICKET ATTENDU

```
On page /[route] ([Fichier.tsx]),
[action précise en une phrase].

Context:
[Ce qui existe déjà. Pourquoi ce changement.]

Expected behavior:
[Ce que l'utilisateur voit ou fait.]

Change:
[Fichier exact. Fonction exacte. Modification minimale.]

Do not touch:
- [fichier ou fonction A]
- [fichier ou fonction B]

Validation:
[Test manuel — action → résultat attendu]
```
