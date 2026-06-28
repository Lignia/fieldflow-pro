# LIGNIA SPRINT SNAPSHOT

> Ce document est la photo officielle du produit à un instant T.
> Il ne résume pas les conversations. Il décrit l'état du produit.
> Il est mis à jour par Claude Analytics à la fin de chaque sprint, validé par Thomas.
> Il est le premier document injecté dans toute nouvelle conversation IA.
>
> Version : Sprint 0 — Fin de phase Exploration
> Date : 28 juin 2026
> SHA GitHub : 14e6a88
> Validé par : Thomas

---

## 1. IDENTITÉ DU PROJET

```
Produit      : LIGNIA — CRM/mini-ERP vertical pour artisans bois énergie
Stack        : React + TypeScript + Vite (Lovable) ↔ Supabase PostgreSQL
Repo         : Lignia/fieldflow-pro
Supabase     : hejxvqghsyaauwzkfikg
Schémas DB   : catalog / billing / core / operations / ai
Phase        : Entrée en construction (pilote 5 artisans)
```

---

## 2. ÉTAT RÉEL DU PRODUIT — 28 JUIN 2026

### Base de données (chiffres vérifiés Supabase)

```
Catalogue central    : 22 796 articles (is_central=true)
Fournisseurs         : 4 (Poujoulat 16 529, Joncoux 6 093, KEMP 166, LIGNIA 8)
Tenants actifs       : 7
Fournisseurs actifs  : 14 (Poujoulat + Joncoux actifs sur 7 tenants)
Clients              : 26
Projets              : 16
Devis                : 97
Lignes de devis      : 107
Factures             : 3 (toutes deposit, toutes draft)
Installations        : 3 (toutes draft)
```

### Ce qui fonctionne (prouvé par le code et la base)

```
✓ Authentification multi-tenant avec RLS
✓ Catalogue central searchable via search_quote_items_v2
✓ QuoteEditor : sections, lignes, remises, signature, PDF devis
✓ Acompte automatique à la signature (sign_quote_and_initialize)
✓ Numérotation automatique devis et factures (triggers actifs)
✓ Remises fournisseurs par famille (SupplierDiscounts.tsx)
✓ Resolve_item_price (calcul prix net automatique)
✓ SAV : ServiceRequestCreate + ServiceRequestDetail (52Ko fonctionnel)
✓ Interventions : création et détail (8 types dont technical_survey)
✓ Parc installé : core.installations avec vue v_installations_with_customer
✓ Bundles/ouvrages : save_lines_as_bundle branché dans QuoteEditor
✓ Appareils ADEME : 1 516 références Flamme Verte dans heating_appliances
✓ TVA appareils : addAppliance() corrigée à 5.5% (commit 613122a)
```

### Ce qui est absent ou cassé (prouvé)

```
❌ PDF facture : bouton disabled (BUG-04 — bloquant pilote)
❌ Planning : Planning.tsx = 679 octets, stub vide
❌ Contacts multiples par client : table customer_contacts absente
❌ Date expiration devis : expires_at absent de billing.quotes
❌ Envoi email devis/facture depuis l'app
❌ Commande fournisseur : tables présentes, 0 ligne, 0 front
❌ Facture solde avec déduction acompte (parent_invoice_id jamais rempli)
❌ Export comptable (Pennylane, Sage, FEC)
❌ Contrats de maintenance : colonnes présentes, 0 logique
❌ Cerfa 15497 ramonage
⚠️ TVA Poujoulat : 16 529 articles à 20% au lieu de 5.5% (migration en attente GO Thomas)
⚠️ supplier_ref Poujoulat et KEMP préfixés (POU_, KEMP_) — bloquant BDC V2
⚠️ catalog_domain documenté dans US mais absent de la base
```

---

## 3. DÉCISIONS ARCHITECTURALES FIGÉES

Ces décisions ne sont plus discutables sans session explicite + entrée DECISION_LOG.

```
✓ Catalogue SaaS central (pas d'import local par tenant)
✓ Snapshot immuable quote_lines après signature (INVARIANT 4)
✓ Séparation CRM / comptabilité (LIGNIA exporte, Pennylane comptabilise)
✓ RLS Supabase = seule barrière de sécurité multi-tenant
✓ search_quote_items_v2, resolve_item_price, replace_quote_lines = intouchables
✓ cost_price = NULL absolu (INVARIANT 2)
✓ Acompte automatique à la signature
✓ Pas de comptabilité intégrée, pas de gestion de stock
✓ Un ticket Lovable = un fichier = une fonction = un changement minimal
```

---

## 4. DOCUMENTS ACTIFS — LISTE COMPLÈTE

| Document | Rôle | Lire si... |
|---|---|---|
| `docs/SPRINT_SNAPSHOT.md` (ce fichier) | Photo du produit | Démarrage toute nouvelle conversation |
| `docs/LIGNIA_OPERATING_MODEL.md` | Gouvernance et workflow | Question sur qui fait quoi |
| `docs/RELEASE_BOARD.md` | Statuts tickets | Que fait-on aujourd'hui ? |
| `docs/BACKLOG_PILOTE_5_ARTISANS.md` | Tickets détaillés | Avant d'envoyer un ticket Lovable |
| `LIGNIA_ARCHITECTURE_LEDGER.md` (racine) | Schéma technique complet | Avant toute migration ou RPC |
| `docs/LIGNIA_DESIGN_DOCTRINE.md` | Pourquoi LIGNIA est conçu ainsi | Avant une décision architecturale |
| `docs/architecture/project/DECISION_LOG.md` | Journal des décisions | Pourquoi cette décision a été prise ? |
| `docs/architecture/catalog/D-25_TVA_catalogue_doctrine.md` | Doctrine TVA | Avant tout devis ou migration TVA |
| `docs/product/LIGNIA_USER_STORIES_V3.md` | Ce que le produit doit faire | Avant de spécifier une nouvelle US |
| `docs/runtime/CRITICAL_FILES.md` | Fichiers protégés | Avant tout ticket Lovable |
| `docs/runtime/IMPORT_RUNBOOK.md` | Import fournisseur | Avant un import catalogue |
| `AGENTS.md` (racine) | Workspace Lovable | Lu automatiquement par Lovable |
| `docs/LIGNIA_LOVABLE_KNOWLEDGE.md` | Project Knowledge Lovable | Collé dans Lovable Project Settings |

**Tout le reste est archive.** Ne pas injecter dans une nouvelle conversation.

---

## 5. SPRINT EN COURS — PILOTE 5 ARTISANS

### Objectif du sprint

Rendre LIGNIA utilisable par 5 artisans réels dans leurs vraies journées de travail.

### Tickets et statuts

| ID | Ticket | Statut | Bloque |
|---|---|---|---|
| BUG-01 | TVA appareils 20% → 5.5% | ✅ DONE (commit 613122a) | — |
| BUG-02 | Archivage articles (is_active=false) | ⬜ À faire | — |
| BUG-03 | Bibliothèque ouvrages (réinsertion bundle) | ⬜ À faire | — |
| BUG-04 | PDF facture (bouton disabled) | ⬜ **PRIORITÉ 1** | Pilote bloquant |
| FEAT-05 | Bandeau fournisseurs actifs | ⬜ À faire | — |
| FEAT-06 | Recherche filtrée par fournisseur | ⬜ À faire | — |
| FEAT-07 | Bannière dashboard | ⬜ À faire | — |
| FEAT-08 | Masquer bouton import (admin only) | ⬜ À faire | — |
| FEAT-09 | Supprimer colonne Coût HT devis | ⬜ À faire | — |
| SEC-10 | provision-tenant JWT | ⬜ À faire | Claude Exec |
| SEC-11 | DROP tables staging | ⬜ À faire | Claude Exec |
| DOCS-12 | Archiver 22 documents obsolètes | ⬜ À faire | Claude Exec |
| TEST-13 | Test pilote artisans réels | ⬜ Après S1+S2 | Thomas |
| AJUST-14 | Ajustements post-test | ⬜ Après TEST-13 | — |
| US-C01 | Date expiration devis (légal) | ⬜ À faire | Lovable |

### Prochaine action immédiate

**BUG-04 — PDF facture.** Ticket Lovable prêt à envoyer.
Thomas envoie le ticket. Claude Analytics vérifie le commit résultant.

---

## 6. DÉCISIONS EN ATTENTE DE GO THOMAS

Ces sujets ont été analysés. Ils attendent une décision Thomas avant d'avancer.

| Sujet | Analyse disponible | Décision requise |
|---|---|---|
| Migration TVA Poujoulat | Tableau famille-par-famille dans D-25 | Valider ou rejeter chaque famille |
| supplier_ref préfixée (POU_, KEMP_) | Audit de gouvernance produit | Nettoyer ou mapper dans le connecteur |
| catalog_domain | Absent de la base, documenté dans USER_STORIES | Créer la migration ou supprimer US-C07d |
| Snapshot sans trigger SQL | Audit identifié — protection applicative seulement | Accepter ou créer le trigger |

---

## 7. CE QUE LA PROCHAINE CONVERSATION DOIT SAVOIR

### Pour démarrer en 5 minutes

```
1. Lire ce document (SPRINT_SNAPSHOT) — 3 minutes
2. Lire RELEASE_BOARD.md — 1 minute
3. Confirmer à Thomas : "Je suis prêt. Prochaine action : BUG-04."
```

### Ce qu'il ne faut pas refaire

```
✗ Relire les benchmarks OpenFire (doctrine gelée)
✗ Refaire l'audit documentaire (stabilisé)
✗ Rediscuter la gouvernance (figée dans OPERATING_MODEL)
✗ Produire de nouveaux documents de réflexion
✗ Chercher à comprendre toute la base de données dès le départ
```

### Ce qu'il faut faire si un sujet inconnu surgit

```
1. Chercher dans DECISION_LOG si la décision existe déjà
2. Chercher dans DESIGN_DOCTRINE si c'est un choix architectural documenté
3. Si introuvable → demander à Thomas si c'est nouveau ou oublié
4. Si nouveau → analyser en 1 session max, décision Thomas, entrée DECISION_LOG
```

---

## 8. COMMENT METTRE À JOUR CE DOCUMENT

**Qui :** Claude Analytics, sur GO Thomas, à la fin de chaque sprint.

**Quand :** quand tous les tickets du sprint sont DONE ou reportés au sprint suivant.

**Ce qui change à chaque mise à jour :**
- Section 2 : chiffres Supabase (requête SQL)
- Section 5 : statuts des tickets
- Section 6 : décisions en attente

**Ce qui ne change jamais sauf décision explicite :**
- Section 1 : identité du projet
- Section 3 : décisions architecturales figées
- Section 4 : liste des documents actifs

**Format du commit :**
`docs(snapshot): Sprint N — [features livrées en 5 mots]`

---

*LIGNIA SPRINT SNAPSHOT — v1.0*
*28 juin 2026 — Fin de phase Exploration*
*Préparé par Claude Analytics — Validé par Thomas*
