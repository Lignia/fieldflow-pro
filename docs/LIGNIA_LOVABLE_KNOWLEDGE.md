# LIGNIA — Knowledge File Lovable
> À coller dans Lovable → Settings → Knowledge avant chaque sprint.
> Ne contient que ce que Lovable doit savoir. Pas d'historique. Pas de backlog.

---

## PRODUIT

LIGNIA est un CRM pour artisans bois énergie (poêles, inserts, granulés, ramonage).
Public : patrons + secrétaires + commerciaux + poseurs.
Cycle principal : Lead → Devis → Signature → Installation → SAV → Facturation.

---

## ARCHITECTURE FRONTEND

- React + TypeScript + Vite
- Tailwind CSS (tokens design system — ne jamais utiliser de couleurs hex directes)
- shadcn/ui pour tous les composants UI
- React Router v6 pour le routing
- Supabase multi-schéma : `catalogDb`, `billingDb`, `coreDb`, `operationsDb`

### Schémas Supabase

```typescript
import { catalogDb, billingDb, coreDb, operationsDb }
  from "@/integrations/supabase/schema-clients";

// catalog  → catalog_items, catalogs, heating_appliances,
//            tenant_supplier_discounts, tenant_suppliers
// billing  → quotes, quote_lines, quote_sections, invoices, invoice_lines,
//            document_sequences
// core     → customers, projects, installations, users, tenants
// operations → interventions, service_requests
```

### Hooks clés

| Hook | Fichier | Usage |
|---|---|---|
| useCurrentUser | src/hooks/useCurrentUser.tsx | tenantId, userRole, coreUser |
| useCatalog | src/hooks/useCatalog.ts | Navigation catalogue par catalog_id |
| useCatalogSearch | src/hooks/useCatalogSearch.ts | Recherche fulltext via RPC |
| useQuoteDetail | src/hooks/useQuoteDetail.ts | Chargement devis + lignes |
| useSignQuote | src/hooks/useSignQuote.ts | Signature devis |

---

## INVARIANTS — NE JAMAIS VIOLER

```
INVARIANT 1  supplier_ref = code brut fournisseur — jamais modifié
INVARIANT 2  cost_price = NULL dans catalog_items — jamais affiché
INVARIANT 3  unit_price_ht = prix public uniquement
INVARIANT 4  quote_lines = snapshots immuables après signature
INVARIANT 5  resolve_item_price = seule source de pricing runtime
INVARIANT 6  RLS activée sur toutes les tables multi-tenant
INVARIANT 7  Ne jamais modifier : search_quote_items_v2,
             resolve_item_price, replace_quote_lines
```

---

## FICHIERS SENSIBLES — NE PAS TOUCHER SANS INSTRUCTION EXPLICITE

```
src/pages/quotes/QuoteEditor.tsx     (70Ko — modifier uniquement la fonction citée)
src/hooks/useCatalog.ts              (modifier uniquement la fonction citée)
src/hooks/useSignQuote.ts            (ne pas toucher)
src/components/ApplianceSearchTab.tsx (ne pas toucher)
src/hooks/useCatalogSearch.ts        (ne pas toucher — accepte déjà activeSuppliers)
```

---

## CONVENTIONS UI

- Tokens couleur : `bg-accent`, `text-muted-foreground`, `border-border`, etc.
- Jamais de couleurs hex ou rgb directes
- Composants : toujours depuis `@/components/ui/`
- Toast : toujours `toast()` depuis `sonner`
- Icônes : toujours depuis `lucide-react`
- Formulaires : pas de balise `<form>` — utiliser `onClick` handlers

---

## RÈGLES MÉTIER

- TVA appareils (poêles, inserts) = 5.5%
- TVA fumisterie rénovation = 10%
- TVA neuf ou main d'œuvre = 20%
- Un artisan ne voit que les articles de ses fournisseurs actifs (`tenant_suppliers`)
- La suppression d'un article = archivage (`is_active=false`), jamais DELETE physique
- Les devis signés ne peuvent jamais être modifiés (INVARIANT 4)

---

## RÔLES UTILISATEUR

```
userRole = 'super_admin'  → LIGNIA team — accès total
userRole = 'admin'        → Patron de l'entreprise — paramétrage
userRole = 'user'         → Commerciaux, secrétaires, poseurs
```

Accès via : `const { userRole } = useCurrentUser()`

---

## FORMAT TICKET LOVABLE

```
On page /[route] ([Fichier.tsx]),
[action précise].

Context:
[Ce qui existe déjà et pourquoi ce changement est nécessaire]

Expected behavior:
[Ce que l'artisan voit / fait]

Change:
[Modification exacte — fichier, fonction, ligne si possible]

Do not touch:
- [fichier A]
- [fonction B]
- [hook C]

Validation:
[Test manuel précis avec compte Rita]
```

---

## COMPTE TEST

- Tenant Rita POELE : `ee7ce528-3526-4cc4-92a5-3b4da865bef7`
- Fournisseurs actifs : Poujoulat ✅, Joncoux ✅, KEMP SAS ❌, LIGNIA ❌

---

## INTERDIT DANS LOVABLE

```
❌ Modifier search_quote_items_v2
❌ Modifier resolve_item_price
❌ Modifier replace_quote_lines
❌ Créer une nouvelle table Supabase
❌ Utiliser DELETE sur catalog_items (utiliser is_active=false)
❌ Hardcoder des couleurs hex
❌ Utiliser localStorage ou sessionStorage
❌ Utiliser la balise <form>
❌ Afficher cost_price (toujours NULL — INVARIANT 2)
```
