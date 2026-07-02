# LIGNIA SPRINT SNAPSHOT

> Photo officielle du produit à un instant T.
> Ne résume pas les conversations. Décrit l'état du produit.
> Mis à jour par Claude Analytics à la fin de chaque sprint, validé par Thomas.
> Premier document injecté dans toute nouvelle conversation IA.
>
> Version : Sprint 0 — Fin de phase Exploration / Fondation
> Date : 28 juin 2026
> SHA GitHub : 3d5ceda (LIGNIA_PRODUCT_MAP)
> Validé par : Thomas

---

## DÉMARRAGE NOUVELLE CONVERSATION — 3 ÉTAPES

```
1. Lire ce document                    → 3 minutes
2. Lire LIGNIA_OPERATING_MODEL.md      → 2 minutes
3. Confirmer à Thomas : "Prêt. Prochain objectif : BUG-04 PDF facture."
```

**Ne pas refaire :** audits documentaires, benchmark OpenFire, discussions de gouvernance.
**Si un sujet inconnu surgit :** chercher dans DECISION_LOG, puis DESIGN_DOCTRINE, puis demander à Thomas.

---

## 1. IDENTITÉ DU PROJET

```
Produit      : LIGNIA — CRM/mini-ERP vertical pour artisans bois énergie
Stack        : React + TypeScript + Vite (Lovable) ↔ Supabase PostgreSQL
Repo         : Lignia/fieldflow-pro
Supabase     : hejxvqghsyaauwzkfikg
Schémas DB   : catalog / billing / core / operations / ai
Phase        : Sprint 1 — Construction produit
```

---

## 2. ÉTAT RÉEL DU PRODUIT — 28 JUIN 2026 (vérifié Supabase)

```
Catalogue central    : 22 796 articles (is_central=true)
Fournisseurs         : 4 (Poujoulat 16 529, Joncoux 6 093, KEMP 166, LIGNIA 8)
Tenants actifs       : 7
Clients              : 26 (0 avec SIRET renseigné — colonne existe, UI absente)
Projets              : 16 (statuts : lead_qualified 5, estimate_sent 4, signed 3...)
Devis                : 97 (tous avec expiry_date ✓, tous avec tva_context='renovation_15ans' ✓)
Lignes de devis      : 107
Factures             : 3 (toutes deposit, toutes draft)
Installations        : 3
```

### Ce qui fonctionne (prouvé code + base)

```
✓ Auth multi-tenant RLS
✓ Catalogue central + search_quote_items_v2 (ranking sémantique actif)
✓ family_search_profiles (34 lignes, boost_score par gamme)
✓ search_synonyms (57 lignes, jargon fumisterie)
✓ QuoteEditor : sections, lignes, remises, signature, PDF devis
✓ expiry_date : 97/97 devis remplis (champ actif, à exposer dans UI)
✓ tva_context : 97/97 devis à 'renovation_15ans' (champ actif, à exposer UI)
✓ Acompte automatique à la signature (sign_quote_and_initialize)
✓ Numérotation automatique devis + factures (triggers actifs)
✓ Remises fournisseurs par famille (SupplierDiscounts.tsx)
✓ resolve_item_price (calcul prix net automatique)
✓ SAV : ServiceRequestCreate + ServiceRequestDetail (52Ko)
✓ Interventions : création + détail (8 types)
✓ Parc installé : core.installations
✓ Bundles : save_lines_as_bundle branché dans QuoteEditor
✓ Appareils ADEME : 1 516 références Flamme Verte
✓ TVA appareils : addAppliance() à 5.5% (commit 613122a)
✓ Pipeline projet : 17 statuts (lead_new → closed), utilisé en base
✓ siret dans core.customers : colonne existe, UI ne l'expose pas
✓ Onboarding : OnboardingCompanyPage.tsx (20Ko) fonctionnel
```

### Ce qui est absent ou cassé (prouvé)

```
❌ PDF facture : bouton disabled — BUG-04 PRIORITÉ 1
❌ Planning : Planning.tsx = stub vide (679 octets)
❌ Commande fournisseur : tables prêtes, 0 front, 0 ligne
❌ Facture solde : parent_invoice_id jamais rempli
❌ Export comptable Pennylane
❌ Contrats maintenance : colonnes présentes, 0 logique
❌ Cerfa 15497 ramonage
❌ Bouton "Créer devis depuis SAV"
⚠️ TVA Poujoulat : 16 529 articles à 20% (migration en attente GO Thomas)
⚠️ supplier_ref préfixée POU_/KEMP_ (bloquant BDC V1)
⚠️ Bibliothèque ouvrages (réinsertion bundle) : BUG-03
⚠️ Archivage articles : BUG-02
```

---

## 3. DÉCISIONS ARCHITECTURALES FIGÉES

Ne pas rediscuter sans session explicite + entrée DECISION_LOG.

```
✓ Catalogue SaaS central — pas d'import local par tenant
✓ Snapshot immuable quote_lines après signature (INVARIANT 4)
✓ Séparation CRM / comptabilité — LIGNIA exporte, Pennylane comptabilise
✓ RLS Supabase = seule barrière de sécurité multi-tenant
✓ search_quote_items_v2 — NE JAMAIS MODIFIER
✓ resolve_item_price — NE JAMAIS MODIFIER
✓ replace_quote_lines — NE JAMAIS MODIFIER
✓ cost_price = NULL absolu (INVARIANT 2)
✓ Acompte automatique à la signature
✓ Pas de comptabilité intégrée, pas de gestion de stock
✓ Un ticket Lovable = un fichier = une fonction = un changement minimal
```

---

## 4. DOCUMENTS ACTIFS

| Document | Quand l'ouvrir |
|---|---|
| `docs/SPRINT_SNAPSHOT.md` (ce fichier) | Démarrage toute nouvelle conversation |
| `docs/LIGNIA_OPERATING_MODEL.md` | Qui fait quoi, workflow, formats prompts |
| `docs/LIGNIA_PRODUCT_MAP.md` | Quoi construire et dans quel ordre |
| `docs/RELEASE_BOARD.md` | Statuts tickets du sprint courant |
| `LIGNIA_ARCHITECTURE_LEDGER.md` | Avant toute migration ou RPC |
| `docs/LIGNIA_DESIGN_DOCTRINE.md` | Avant une décision architecturale |
| `docs/architecture/project/DECISION_LOG.md` | Pourquoi une décision a été prise |
| `docs/architecture/catalog/D-25_TVA_catalogue_doctrine.md` | Avant tout sujet TVA |
| `docs/product/LIGNIA_USER_STORIES_V3.md` | Avant de spécifier une nouvelle US |
| `docs/runtime/CRITICAL_FILES.md` | Avant tout ticket Lovable |
| `AGENTS.md` (racine) | Lu automatiquement par Lovable |
| `docs/LIGNIA_LOVABLE_KNOWLEDGE.md` | Collé dans Lovable Project Settings |

**Tout le reste est archive.**

---

## 5. SPRINT 1 — OBJECTIFS

### Epic Facturation (priorité absolue)

**Objectif utilisateur :** un artisan peut créer un acompte, générer son PDF, envoyer sa facture et encaisser — sans sortir de LIGNIA.

**Critères d'acceptation :**
- [ ] PDF facture s'ouvre depuis InvoiceDetail (BUG-04)
- [ ] Artisan peut créer une facture solde depuis un devis signé
- [ ] Acompte déduit automatiquement dans la facture solde
- [ ] Statut facture passe de draft → sent → paid

**Tickets dans l'ordre :**

| ID | Ticket | Exécutant | Statut |
|---|---|---|---|
| BUG-01 | TVA appareils 20% → 5.5% | Lovable | ✅ DONE (commit 613122a) |
| BUG-04 | PDF facture (bouton disabled) | Lovable | ⬜ **PRIORITÉ 1** |
| BUG-02 | Archivage articles | Lovable | ⬜ |
| BUG-03 | Bibliothèque ouvrages | Lovable | ⬜ |
| US-C01 | Exposer expiry_date dans UI devis | Lovable | ⬜ |
| SEC-10 | provision-tenant JWT | Claude Exec | ⬜ |
| SEC-11 | DROP tables staging | Claude Exec | ⬜ |

---

## 6. DÉCISIONS EN ATTENTE GO THOMAS

| Sujet | Impact si GO |
|---|---|
| Migration TVA Poujoulat (16 529 articles 20%→5.5%) | Devis fiscalement corrects |
| Normalisation supplier_ref (supprimer POU_/KEMP_) | Débloque BDC V1 |
| catalog_domain : créer colonne ou supprimer US-C07d | Cohérence US/base |

---

## 7. COMMENT METTRE À JOUR CE DOCUMENT

**Qui :** Claude Analytics, sur GO Thomas, fin de chaque sprint.
**Chiffres :** toujours vérifiés par requête Supabase en temps réel.
**Commit :** `docs(snapshot): Sprint N — [features livrées en 5 mots]`

---

*LIGNIA SPRINT SNAPSHOT — v1.1*
*28 juin 2026 — Corrections factuelles (expiry_date, tva_context, siret existent en base)*
*Fin de phase Fondation. Sprint 1 démarre sur Epic Facturation.*
