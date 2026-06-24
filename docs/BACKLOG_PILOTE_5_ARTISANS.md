# BACKLOG_PILOTE_5_ARTISANS
> 30 jours — 15 tickets maximum — aucun nouveau concept
> Source : LIGNIA_CANONICAL_TRUTH_V1 + LIGNIA_PRODUCT_STATUS_V1
> Ordre = priorité d'exécution. Ne pas réordonner sans valider le précédent.

---

## LÉGENDE

- **Exécutant** : Lovable (frontend) ou Claude Exec (base)
- **Effort** : XS < 1h / S 2-4h / M 4-8h / L > 1 jour
- **Validation** : test manuel sur le compte Rita (ee7ce528)

---

## SEMAINE 1 — Corriger ce qui est cassé

---

### BUG-01 — TVA appareils : 20% → 5.5%
**Type :** Bug
**Exécutant :** Lovable
**Effort :** XS
**Risque :** Aucun — 1 ligne de code

**Description :**
Dans `QuoteEditor.tsx`, la fonction `addAppliance()` hardcode `vat_rate: 20`.
Chaque poêle ou insert ajouté à un devis affiche 20% TVA au lieu de 5.5%.

**Impact artisan :**
Devis avec TVA incorrecte. Interdit avant pilote réel.

**Fichier ciblé :** `src/pages/quotes/QuoteEditor.tsx`
**Chercher :** `vat_rate: 20` dans `addAppliance`
**Remplacer par :** `vat_rate: 5.5`

**Ne pas toucher :** le reste de QuoteEditor.tsx

**Critère de validation :**
Ajouter un poêle dans un devis → TVA affichée = 5,5%

**Dépendances :** Aucune

---

### BUG-02 — Suppression article : DELETE physique → archivage
**Type :** Bug bloquant (violation R-05)
**Exécutant :** Lovable
**Effort :** XS
**Risque :** Faible — changement isolé dans un hook

**Description :**
`useCatalog.ts` supprime physiquement les articles catalogue avec `.delete()`.
R-05 interdit les suppressions physiques — elles cassent les snapshots de devis signés.

**Fichier ciblé :** `src/hooks/useCatalog.ts`
**Chercher :** `deleteItem` → `.delete().eq("id", itemId)`
**Remplacer par :** `.update({ is_active: false }).eq("id", itemId)`

**Critère de validation :**
Supprimer un article catalogue → il disparaît de la liste mais reste en base avec `is_active=false`

**Dépendances :** Aucune

---

### BUG-03 — Bibliothèque ouvrages : permettre la réinsertion
**Type :** Bug fonctionnel
**Exécutant :** Lovable
**Effort :** S
**Risque :** Faible — ajout d'un onglet dans le CatalogPopover existant

**Description :**
`save_lines_as_bundle` fonctionne et sauvegarde les ouvrages en base comme articles `catalog_type=internal`, `product_type=service`.
Mais il n'existe aucun onglet dans le CatalogPopover pour réinsérer un ouvrage dans un nouveau devis.
Résultat : les ouvrages peuvent être créés mais jamais réutilisés — l'argument de vente #1 est inaccessible.

**Fichier ciblé :** `src/pages/quotes/QuoteEditor.tsx` (CatalogPopover)
**Action :** Ajouter un onglet "Ouvrages" qui liste les `catalog_items` du tenant avec `product_type='service'` et `catalog_type='internal'`.
**Ne pas modifier :** `save_lines_as_bundle`, la RPC, la structure des données.

**Critère de validation :**
Sauvegarder un ouvrage → ouvrir un nouveau devis → onglet "Ouvrages" → insérer l'ouvrage → les lignes apparaissent

**Dépendances :** Aucune (RPC et données déjà en place)

---

### BUG-04 — PDF facture : vérifier et corriger si absent
**Type :** Bug potentiel
**Exécutant :** Lovable
**Effort :** XS si existe, S si absent
**Risque :** Moyen si absent — un artisan pilote doit pouvoir envoyer des factures

**Description :**
Le PDF devis est confirmé (`doc.save()` dans QuoteDetail.tsx).
Le PDF facture n'a pas été trouvé dans le code. `InvoiceDetail.tsx` (11Ko) n'a pas été audité pour le PDF.

**Action :**
Lire `InvoiceDetail.tsx` et vérifier si un bouton "Télécharger PDF" existe.
Si absent → créer le même mécanisme que dans QuoteDetail.tsx.

**Critère de validation :**
Ouvrir une facture → bouton "Télécharger PDF" → fichier PDF téléchargé avec les bonnes informations

**Dépendances :** Aucune

---

## SEMAINE 2 — Connecter ce qui est prêt en base

---

### FEAT-05 — Page Catalogue : bandeau fournisseurs actifs
**Type :** Amélioration (US-C07a)
**Exécutant :** Lovable
**Effort :** S
**Risque :** Faible — ajout en haut de Catalog.tsx, sans toucher à la navigation existante

**Description :**
`catalog.tenant_suppliers` est peuplée (Poujoulat ✅ Joncoux ✅ KEMP ❌ LIGNIA ❌ pour chaque tenant).
Aucun code front ne la lit. La page Catalogue ne propose aucun moyen d'activer ou désactiver un fournisseur.

**Action :**
Ajouter en haut de `Catalog.tsx` une section "Mes fournisseurs" avec des chips cliquables.
Chaque chip lit `catalog.tenant_suppliers` via `catalogDb` (schema catalog).
Toggle = `UPDATE catalog.tenant_suppliers SET is_active = NOT is_active WHERE tenant_id = currentTenantId AND supplier_name = [chip cliqué]`
Toast : "Poujoulat activé" / "Poujoulat désactivé"

**Ne pas modifier :** la navigation par catalogue existante, le scroll infini, les autres sections

**Critère de validation :**
Rita ouvre Catalogue → voit chips Poujoulat (✓ vert) Joncoux (✓ vert) KEMP (grisé)
→ clique KEMP → passe actif → toast → is_active=true en base

**Dépendances :** Aucune (table peuplée)

---

### FEAT-06 — Devis : filtrer la recherche par fournisseurs actifs
**Type :** Amélioration (US-C07b)
**Exécutant :** Lovable
**Effort :** S
**Risque :** Faible — `p_active_supplier_names` déjà prévu dans `search_quote_items_v2`

**Description :**
`useCatalogSearch.ts` passe `p_active_supplier_names=null` à la RPC.
La RPC retourne donc tous les fournisseurs. L'artisan voit 22 796 articles mélangés.
`catalog.tenant_suppliers` contient déjà les fournisseurs actifs par tenant.

**Action dans `useCatalogSearch.ts` :**
Ajouter un `useEffect` qui charge les fournisseurs actifs :
```
SELECT supplier_name FROM catalog.tenant_suppliers
WHERE tenant_id = currentTenantId AND is_active = true
```
Passer le résultat comme `p_active_supplier_names` à `search_quote_items_v2`.
Si liste vide → passer `null` (fallback = tous visibles).

**Ne pas modifier :** `search_quote_items_v2`, `resolve_item_price`

**Critère de validation :**
Rita tape "coude 150" dans un devis → voit uniquement Poujoulat et Joncoux (ses fournisseurs actifs)

**Dépendances :** FEAT-05 doit être validé (sinon aucun fournisseur actif → fallback tous visibles)

---

### FEAT-07 — Dashboard : bannière si aucun fournisseur actif
**Type :** Amélioration (US-C07b)
**Exécutant :** Lovable
**Effort :** XS
**Risque :** Aucun — ajout conditionnel dans Dashboard.tsx

**Description :**
Si un artisan n'a activé aucun fournisseur, sa recherche devis retourne tous les articles.
Il ne comprend pas pourquoi. La découverte doit se faire avant le devis, pas pendant.

**Action dans `Dashboard.tsx` :**
Au chargement, compter `SELECT COUNT(*) FROM catalog.tenant_suppliers WHERE is_active=true`.
Si COUNT = 0 → afficher une bannière :
"Votre catalogue n'est pas encore configuré. [Configurer →]" → lien vers `/catalog`
Bannière disparaît dès que COUNT > 0.

**Ne pas modifier :** les KPIs, le pipeline projets, le reste du Dashboard

**Critère de validation :**
Nouveau tenant sans fournisseur actif → bannière visible sur Dashboard
Après activation d'un fournisseur → bannière disparaît

**Dépendances :** FEAT-05

---

### FEAT-08 — Catalogue : masquer "Importer un catalogue" pour l'artisan
**Type :** Amélioration cosmétique
**Exécutant :** Lovable
**Effort :** XS
**Risque :** Aucun

**Description :**
Le bouton "Importer un catalogue" est visible par tous les rôles dans `Catalog.tsx`.
Il ne devrait être visible que pour les `SUPER_ADMIN` ou `TENANT_ADMIN`.
L'artisan (TENANT_USER) le voit et ne sait pas quoi en faire.

**Action :**
Récupérer `userRole` depuis `useCurrentUser`.
Afficher le bouton uniquement si `userRole === 'admin'` ou `userRole === 'super_admin'`.

**Critère de validation :**
Connexion avec rôle TENANT_USER → bouton "Importer" absent
Connexion avec rôle admin → bouton "Importer" visible

**Dépendances :** Aucune

---

### FEAT-09 — Catalogue : supprimer colonne "Coût HT" toujours vide
**Type :** Amélioration cosmétique (INVARIANT 2)
**Exécutant :** Lovable
**Effort :** XS
**Risque :** Aucun

**Description :**
`Catalog.tsx` affiche une colonne "Coût HT" qui est toujours vide (INVARIANT 2 : `cost_price = NULL`).
Elle occupe de la place et n'apporte aucune information.

**Action :** Supprimer la colonne "Coût HT" du tableau dans `Catalog.tsx`

**Critère de validation :**
Page Catalogue → colonne "Coût HT" absente

**Dépendances :** Aucune

---

## SEMAINE 3 — Sécurité et stabilité

---

### SEC-10 — Sécurité : provision-tenant → verify_jwt:true
**Type :** Sécurité (P0-A identifié)
**Exécutant :** Claude Exec (Supabase)
**Effort :** XS
**Risque :** Faible — rollback immédiat si onboarding casse

**Description :**
`provision-tenant` a `verify_jwt=false`. N'importe qui peut créer un tenant sans être authentifié.
`supabase.functions.invoke()` envoie automatiquement le JWT — le passage à `verify_jwt=true` ne cassera pas l'onboarding.

**Action :**
Redéployer `provision-tenant` avec `verify_jwt=true`. Code identique, flag uniquement.

**Rollback :** Redéployer avec `verify_jwt=false` si erreur 401 sur l'onboarding.

**Critère de validation :**
`list_edge_functions` → provision-tenant `verify_jwt=true`
Test onboarding Rita → tenant créé sans erreur

**Dépendances :** Aucune

---

### SEC-11 — Sécurité : supprimer _import_staging_poujoulat (RLS désactivée)
**Type :** Sécurité
**Exécutant :** Claude Exec (Supabase)
**Effort :** XS
**Risque :** Aucun — table vide, 0 dépendances confirmées

**Description :**
`catalog._import_staging_poujoulat` a `rls_enabled=false`. Table de staging terminée, vide, sans dépendances.
C'est une surface d'attaque inutile.

**Action :** `DROP TABLE IF EXISTS catalog._import_staging_poujoulat;`
**Vérification préalable :** `SELECT COUNT(*) FROM catalog._import_staging_poujoulat` → doit être 0.

**Critère de validation :**
Table absente de `information_schema.tables`

**Dépendances :** Aucune

---

### DOCS-12 — Archiver les documents obsolètes
**Type :** Maintenance documentaire
**Exécutant :** Claude Exec (GitHub)
**Effort :** XS
**Risque :** Aucun

**Description :**
Déplacer dans `docs/archive/` les documents identifiés comme obsolètes dans CANONICAL_TRUTH_V1 :
- `ROADMAP_6_SEMAINES.md`
- `ROADMAP_EXECUTABLES_8S.md`
- `CATALOG_ITEMS_V1_CANONICAL.md`
- `docs/audit/p0_actions.csv`
- `docs/audit/technical_debt.csv`
- `docs/audit/forbidden_now.md`

**Critère de validation :**
Les fichiers sont dans `docs/archive/`, absents de leurs emplacements d'origine.

**Dépendances :** Aucune

---

## SEMAINE 4 — Test terrain et ajustements

---

### TEST-13 — Test pilote : devis complet avec 1 artisan
**Type :** Test terrain
**Exécutant :** Thomas
**Effort :** S (2h avec un artisan)
**Risque :** Aucun — base de test

**Description :**
Avant d'inviter 5 artisans pilotes, tester le parcours complet :
1. Créer un client
2. Créer un projet
3. Ouvrir un devis
4. Ajouter un appareil → vérifier TVA 5.5%
5. Chercher "coude 150" → vérifier résultats filtrés sur fournisseurs actifs
6. Utiliser un ouvrage existant → vérifier réinsertion
7. Signer → vérifier facture acompte créée
8. Télécharger PDF devis
9. Télécharger PDF facture

Note les 3 points de friction pour AJUST-14.

**Critère de validation :**
Parcours complet sans blocage bloquant.

**Dépendances :** BUG-01, BUG-03, BUG-04, FEAT-05, FEAT-06

---

### AJUST-14 — Ajustements post-test terrain
**Type :** Réserve d'ajustements
**Exécutant :** Lovable ou Claude Exec selon le retour
**Effort :** S
**Risque :** Inconnu — dépend des retours TEST-13

**Description :**
Ticket réservé pour les 2-3 frictions identifiées lors du test terrain.
À compléter après TEST-13.
Ne pas anticiper le contenu.

**Critère de validation :** Défini après TEST-13

**Dépendances :** TEST-13

---

### RESERVE-15 — Réserve pilote
**Type :** Réserve
**Exécutant :** À définir
**Effort :** À définir

**Description :**
Réservé pour un blocage critique découvert lors de l'invitation des 5 artisans pilotes.
Si non utilisé → bonne nouvelle.

**Dépendances :** TEST-13, AJUST-14

---

## VUE D'ENSEMBLE — 30 JOURS

```
SEMAINE 1 — Corriger
  BUG-01   TVA appareils           XS  Lovable     ← COMMENCER ICI
  BUG-02   Archivage articles      XS  Lovable
  BUG-03   Bibliothèque ouvrages    S  Lovable
  BUG-04   PDF facture             XS  Lovable

SEMAINE 2 — Connecter
  FEAT-05  Bandeau fournisseurs     S  Lovable
  FEAT-06  Recherche filtrée        S  Lovable
  FEAT-07  Bannière dashboard      XS  Lovable
  FEAT-08  Masquer import          XS  Lovable
  FEAT-09  Supprimer col Coût HT   XS  Lovable

SEMAINE 3 — Sécuriser + Archiver
  SEC-10   provision-tenant        XS  Claude Exec
  SEC-11   DROP staging            XS  Claude Exec
  DOCS-12  Archiver docs           XS  Claude Exec

SEMAINE 4 — Tester
  TEST-13  Test terrain pilote      S  Thomas
  AJUST-14 Ajustements post-test    S  Lovable/Exec
  RESERVE-15 Réserve                -  À définir
```

---

## HORS PÉRIMÈTRE PILOTE (ne pas ouvrir avant retours terrain)

- Planning calendrier (effort L — stub vide)
- Contacts multiples par client (table absente — effort M)
- Relances devis automatiques (table absente — effort M)
- Onglets catalogue par catalog_domain (migration données — effort M)
- 5 Edge Functions admin à verrouiller (P0-B sécurité)
- Fournisseur préféré par projet (US-C07e — V2/V3)
- Types de factures ACOMPTE/SITUATION/SOLDE (V2)

---

*Créé le 24 juin 2026*
*Sources : LIGNIA_CANONICAL_TRUTH_V1.md + LIGNIA_PRODUCT_STATUS_V1.md*
*Prochain point : après TEST-13*
