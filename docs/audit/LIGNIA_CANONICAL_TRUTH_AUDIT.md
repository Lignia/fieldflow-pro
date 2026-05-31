# LIGNIA_CANONICAL_TRUTH_AUDIT

> Auteur : Claude Analytics  
> Date : mai 2026  
> Périmètre : tous les documents docs/business, docs/product, docs/architecture, docs/LIGNIA_V1_MASTER, docs/ENGINEERING_PRINCIPLES  
> Mission : identifier les décisions prises, oubliées, redécouvertes, et les contradictions entre documents

---

## Méthode

Chaque document a été lu dans l'ordre suivant :
1. `docs/LIGNIA_V1_MASTER.md` — source de vérité déclarée
2. `docs/ENGINEERING_PRINCIPLES.md` — règles d'exécution frontend
3. `docs/architecture/project/DECISION_LOG.md` — D-01 à D-24
4. `docs/business/LIGNIA_LIFECYCLE.md` — cycles 1 à 4
5. `docs/business/LIGNIA_OBJECT_MODEL.md` — modèle objet métier
6. `docs/business/CATALOG_ECOSYSTEM.md` — écosystème fournisseurs
7. `docs/product/LIGNIA_USER_STORIES_V3.md` — user stories
8. `docs/product/ROADMAP_6_SEMAINES.md` — roadmap S1-S6
9. `docs/product/ROADMAP_EXECUTABLES_8S.md` — roadmap exécutable 8 semaines
10. `docs/product/HEATING_APPLIANCE_EXECUTION_PLAN.md` — plan appareils P0-P3
11. `docs/product/ESTIMATE_TO_INSTALLATION_WORKFLOW.md` — workflow complet

---

## PARTIE 1 — Ce qui a été décidé et reste valide

Ces décisions existent dans les documents. Elles ne doivent pas être rediscutées.

### Décisions architecturales (DECISION_LOG D-01 à D-24)

| ID | Décision | Document source |
|---|---|---|
| D-01 | `has_dta`, `needs_human_review`, `is_etanche` sur `catalog_items` | DECISION_LOG |
| D-02 | Pipeline staging obligatoire pour tout import catalogue | DECISION_LOG |
| D-03 | Articles centraux visibles via `is_central = true OR tenant_id = p_tenant_id` | DECISION_LOG |
| D-04 | RPCs versionnées `_v2`, `_v3`... jamais DROP+CREATE en prod | DECISION_LOG |
| D-05 | `resolve_item_price` retourne JSONB = ajout de clés safe | DECISION_LOG |
| D-08 | `catalog.*` = interface Lovable. `public.*` = implémentation | DECISION_LOG |
| D-09 | `supplier_name` = canal d'achat qui facture l'artisan | DECISION_LOG |
| D-19 | `primary_vendor` / `other_vendors` JSONB — temporaire MVP | DECISION_LOG |
| D-22 | Remises multi-niveaux anticipées — NULL en MVP, logique V2 | DECISION_LOG |
| D-24 | TVA réglementaire BOFiP complète — 5,5% / 10% / 20% par famille | DECISION_LOG |

### Invariants absolus (LIGNIA_V1_MASTER)

Ces règles existent, sont documentées, et s'appliquent à tout patch :

- PDF = vérité contractuelle. Editor ↔ PDF WYSIWYG obligatoire.
- `tenant_id` via JWT uniquement. Jamais via paramètre appelant.
- Fail-fast : erreur explicite, jamais fallback silencieux.
- TTC = donnée primaire, nombre le plus grand de la page.
- `service` ≠ `final` amputé. C'est un objet métier propre avec UI distincte.
- Sections dans l'ordre `sort_order`, partout.
- `draft/sent/signed/lost` = tokens couleur spécifiques fixés.

### Règles engineering (ENGINEERING_PRINCIPLES)

Ces règles existent et s'appliquent à tout prompt Lovable :

- `QuoteEditor.tsx` = ne jamais refactorer
- `CatalogPopover` = ne jamais modifier (remplacé par `AddLineDrawer` dans la vision cible)
- `useCatalogSearch` (SHA 9e54452) = ne jamais modifier
- `search_heating_appliances` via `supabase.rpc` UNIQUEMENT — jamais `catalogDb.rpc`
- `search_quote_items_v2` via `catalogDb.rpc` UNIQUEMENT
- Snapshot = copie immuable au moment de sélection. Ne jamais recalculer.
- Ligne devis créée = complète dès l'insertion locale. Jamais partielle.
- `appliance_snapshot` posé au moment exact de la sélection.

### Vision produit fixée (LIGNIA_LIFECYCLE + LIGNIA_OBJECT_MODEL)

- 4 cycles : Vente (70% CA) → Entretien (20%) → SAV (10%) → Remplacement (valeur LT)
- L'installation est l'objet pivot qui relie les 4 cycles
- Le parc installé = actif stratégique #1
- `devis estimatif` = non contractuel, < 5 min, sans visite
- `devis final` = contractuel, avec données VT réelles
- `devis service` = SAV/entretien, ultra-compact, optimisé mobile
- Clôture chantier → installation activée → garanties calculées → prochaine échéance
- Note de calcul V3 = aide au dimensionnement, non systématique, après VT

### Domaines catalogue fixés (LIGNIA_OBJECT_MODEL)

```
FUMISTERIE      → conduits, accessoires, sorties de toit, tubage
APPAREIL        → poêles, inserts, chaudières
PRESTATION      → pose, ramonage, entretien, main d'œuvre
PIECE_DETACHEE  → joints, vitres, bougies, cartes électroniques...
```

Règle : le domaine est un attribut de l'article, pas du fournisseur.

---

## PARTIE 2 — Ce qui a été redécouvert alors que ça existait déjà

Ces éléments ont été présentés dans les analyses récentes (mai 2026) comme des découvertes ou des lacunes, alors qu'ils étaient documentés depuis des semaines.

### Redécouverte 1 — Le workflow Estimatif → Final → Service

**Présenté comme nouveau dans :** ESTIMATE_TO_INSTALLATION_WORKFLOW.md, APPLIANCE_LIFECYCLE_REVIEW.md  
**Existait déjà dans :** LIGNIA_LIFECYCLE.md (Cycle 1, étapes "Devis estimatif" et "Devis final"), LIGNIA_V1_MASTER.md (section "Système devis — 3 objets métier distincts")

`LIGNIA_V1_MASTER.md` documente explicitement depuis mai 2026 :
- `estimate` = qualifier avant VT, non contractuel, < 5 min
- `final` = contractuel signable, déclenche installation
- `service` = SAV terrain, tablette, 2 minutes max

Le DECISION_LOG n'a pas de D-25 sur ce point car **c'était déjà un invariant du master**.

### Redécouverte 2 — Le Flux B (client avec appareil existant)

**Présenté comme oublié dans :** ESTIMATE_TO_INSTALLATION_WORKFLOW.md, retour OpenAI  
**Existait déjà dans :** LIGNIA_LIFECYCLE.md (Cycle 3 SAV, Cycle 4 Remplacement), LIGNIA_OBJECT_MODEL.md (Installation — `origin`, `installed_by_self`, `takeover_date`)

`LIGNIA_LIFECYCLE.md` documente explicitement :
- Cycle 3 : "Client appelle → Identification de l'installation dans le parc"
- Cycle 4 : "Fin de vie ou obsolescence détectée → Projet remplacement créé"

La table `core.installations` a les colonnes `origin`, `installed_by_self`, `takeover_date` depuis le schéma initial.

### Redécouverte 3 — Photos chantier

**Présenté comme oublié dans :** ESTIMATE_TO_INSTALLATION_WORKFLOW.md, retour OpenAI  
**Existait déjà dans :** LIGNIA_LIFECYCLE.md ("Pose : Photos avant/après. Compte-rendu post-intervention.", "Clôture chantier : Photos finales")

La mention "Photos avant/après" existe dans `LIGNIA_LIFECYCLE.md` depuis la première version. Elle n'avait simplement pas été opérationnalisée dans un plan d'exécution.

### Redécouverte 4 — `technical_surveys` riche en données fumisterie

**Présenté comme nouvelle découverte dans :** APPLIANCE_LIFECYCLE_REVIEW.md ("trouvaille majeure")
**Existait déjà dans :** LIGNIA_LIFECYCLE.md ("Visite technique : données collectées : hauteur conduit, nombre de coudes, diamètre sortie, type de conduit adapté..."), LIGNIA_OBJECT_MODEL.md ("Note de calcul simplifiée : données à collecter dès la visite technique V1 pour préparer V3")

Le fait que `core.technical_surveys` ait 130 colonnes pour la fumisterie était la mise en œuvre prévue de ce qui était documenté. Ce n'était pas une surprise architecturale.

### Redécouverte 5 — `billing.quotes` avec `quote_kind` enum, versioning, `installation_id`

**Présenté comme découverte dans :** APPLIANCE_LIFECYCLE_REVIEW.md  
**Existait déjà dans :** LIGNIA_V1_MASTER.md (section complète sur les 3 types), LIGNIA_LIFECYCLE.md (étape "Signature : Installation créée statut brouillon")

Le champ `installation_id` sur `billing.quotes` est la traduction du workflow documenté "Un devis SAV peut être lié à une installation existante".

### Redécouverte 6 — La commande fournisseur est une priorité métier haute

**Présenté comme insight dans :** ROADMAP_EXECUTABLES_8S.md, retour OpenAI  
**Existait déjà dans :** LIGNIA_OBJECT_MODEL.md ("Bon de commande : généré depuis le devis signé, regroupement automatique par fournisseur"), LIGNIA_LIFECYCLE.md ("Commande fournisseur : Bon de commande généré depuis les lignes du devis signé")

### Redécouverte 7 — `cost_price` ne doit jamais être stocké

**Énoncé comme règle dans :** ENGINEERING_PRINCIPLES.md ("Aucun frontend ne dépend de `cost_price`")  
**Existait aussi dans :** DECISION_LOG (invariant implicite lié à D-05, D-09)

Le fait que le prix d'achat ne soit jamais importé ni stocké est un **invariant fondateur** de l'architecture LIGNIA. Il est répété dans plusieurs documents mais sans ID de décision dédié. C'est un risque de dérive.

---

## PARTIE 3 — Contradictions entre documents

### Contradiction C-01 — Statut de `CatalogPopover`

**Document A — ENGINEERING_PRINCIPLES.md :**
> `CatalogPopover` = flow fumisterie stable, ne jamais modifier

**Document B — ESTIMATE_TO_INSTALLATION_WORKFLOW.md (produit en session mai 2026) :**
> Implique que l'onglet Appareils est dans le CatalogPopover

**Document C — Code réel (QuoteEditor.tsx committé commit 5ef05449) :**
> L'onglet Appareils A ÉTÉ ajouté dans CatalogPopover, en violation de ENGINEERING_PRINCIPLES

**Résolution requise :** ENGINEERING_PRINCIPLES doit être mis à jour pour refléter la décision de ne plus protéger CatalogPopover maintenant que l'onglet Appareils existe. OU la règle doit être reformulée pour dire "ne jamais modifier le comportement des onglets existants dans CatalogPopover".

### Contradiction C-02 — `AddLineDrawer` vs `CatalogPopover`

**ENGINEERING_PRINCIPLES.md :**
> `CatalogPopover` ne doit pas connaître les appareils.  
> `AddLineDrawer` gère uniquement recherche, affichage, sélection.  
> "La création d'une ligne appareil doit rester séparée de la création d'une ligne catalogue."

**Code réel (post-commit 5ef05449) :**
> L'onglet Appareils est DANS `CatalogPopover`. Il n'y a pas de `AddLineDrawer` séparé.

**Impact :** ENGINEERING_PRINCIPLES anticipe une architecture (`AddLineDrawer` distinct) qui n'a pas été implémentée. Les règles sur `AddLineDrawer` s'appliquent donc à un composant fictif.

**Résolution requise :** Soit le `AddLineDrawer` est créé (décision de refactoring, actuellement dans Forbidden), soit ENGINEERING_PRINCIPLES est mis à jour pour documenter que l'onglet Appareils vit dans CatalogPopover.

### Contradiction C-03 — Commande fournisseur : P1 vs V2

**LIGNIA_OBJECT_MODEL.md :**
> Bon de commande — Vision cible : Généré depuis le devis signé — **V2**

**ROADMAP_EXECUTABLES_8S.md (mai 2026) :**
> Vue commande fournisseur depuis devis signé — **P1, avant les pilotes**

**HEATING_APPLIANCE_EXECUTION_PLAN.md (mai 2026) :**
> P1-06 — Vue commande fournisseur — **avant les pilotes**

**Résolution :** La roadmap récente a avancé la priorité. `LIGNIA_OBJECT_MODEL.md` doit être mis à jour pour indiquer que le bon de commande V1 minimal (vue liste articles) est désormais P1, même si le bon de commande complet (réconciliation comptable, liaison facture fournisseur) reste V2.

### Contradiction C-04 — `Ouvrage / Kit` : absent vs présent

**LIGNIA_OBJECT_MODEL.md :**
> Ouvrage / Kit — État actuel : **Non implémenté**

**Code réel (QuoteEditor.tsx + DECISION_LOG) :**
> `save_lines_as_bundle` RPC existe et est appelée depuis QuoteEditor. Un bouton "Bibliothèque" / "Enregistrer comme ouvrage" est visible dans l'UI.

**LIGNIA_V1_MASTER.md (Backlog P1) :**
> Backlog P1 ne mentionne pas les ouvrages comme à construire

**Résolution :** `LIGNIA_OBJECT_MODEL.md` doit être mis à jour. Les ouvrages sont partiellement implémentés (sauvegarde depuis devis), mais la feature complète (bibliothèque d'ouvrages navigable, insertion depuis bibliothèque) reste à construire.

### Contradiction C-05 — `Parc installé` : V1 vs V2

**LIGNIA_OBJECT_MODEL.md :**
> Parc installé — Vision cible : Vue unifiée — **V1/V2**

**ROADMAP_6_SEMAINES.md :**
> Parc installé en S4

**ROADMAP_EXECUTABLES_8S.md :**
> Parc installé en S5 (P2)

**Retour OpenAI :**
> Parc installé en S7 (après pilotes)

**Résolution :** La décision finale est S7 / après 5 premiers pilotes observés. Cette décision doit être actée dans un DECISION_LOG D-25 pour mettre fin à la valse des semaines.

### Contradiction C-06 — `appliance_id` dans `replace_quote_lines` : bug connu vs non documenté

**LIGNIA_V1_MASTER.md (Backlog P0) :**
> Ne mentionne PAS `appliance_id` non persisté

**ROADMAP_EXECUTABLES_8S.md :**
> P0-01 : fix `replace_quote_lines` manquant

**ENGINEERING_PRINCIPLES.md :**
> `appliance_snapshot` doit être posé au moment exact de la sélection appareil

**Résolution :** `LIGNIA_V1_MASTER.md` Backlog P0 doit être mis à jour pour inclure explicitement le fix `appliance_id` + `appliance_snapshot` dans `replace_quote_lines`.

### Contradiction C-07 — Forbidden vs réalité des audits

**LIGNIA_V1_MASTER.md (Forbidden now) :**
> "Ne pas lancer un grand audit global — analyses ciblées uniquement désormais."

**Ce qui s'est passé :**
> La session mai 2026 a produit : audit UX complet, audit technique code, contre-expertise des audits, vérification Supabase, gap analysis appareils, lifecycle review, canonical truth audit.

Ce n'est pas une contradiction grave — les audits produits sont tous liés à un sujet précis (module Devis). Mais la règle Forbidden est visiblement contournée. La règle doit être reformulée : "Pas d'audit global sur l'ensemble du système. Un audit ciblé par module est acceptable."

---

## PARTIE 4 — Décisions prises mais jamais acculées dans un document de référence

Ces éléments ont été décidés implicitement ou dans des conversations mais ne sont pas dans DECISION_LOG.

### Décision implicite DI-01 — `cost_price` jamais stocké

**Statut :** Règle critique, énoncée dans ENGINEERING_PRINCIPLES mais sans ID DECISION_LOG  
**Risque :** Un futur Claude Exec pourrait créer une colonne `cost_price` en pensant corriger un manque  
**Action requise :** Ajouter D-25 dans DECISION_LOG

### Décision implicite DI-02 — 1 installation = 1 appareil (pour V1)

**Statut :** Recommandé dans HEATING_APPLIANCE_EXECUTION_PLAN mais non acté formellement  
**Risque :** Architecture multi-appareils créée prématurément, ou migration nécessaire  
**Action requise :** Décision fondateur → D-26 dans DECISION_LOG

### Décision implicite DI-03 — `appliance_snapshot` contenu minimal

**Statut :** Proposé dans HEATING_APPLIANCE_EXECUTION_PLAN mais non acté  
**Contenu proposé :** `{id, normalized_brand, normalized_model, fuel_type, nominal_power_kw, flamme_verte_stars, flue_diameter_mm, ademe_fonds_air_bois_status}`  
**Risque :** JSON fourre-tout ou snapshot incomplet  
**Action requise :** D-27 dans DECISION_LOG après validation fondateur

### Décision implicite DI-04 — Commande fournisseur V1 = vue lecture seule

**Statut :** LIGNIA_OBJECT_MODEL dit V2 complet. Roadmaps disent P1 minimal.  
**Périmètre V1 minimal jamais précisé :** liste articles groupée par fournisseur, lecture seule, pas d'envoi électronique, pas de réconciliation comptable  
**Risque :** Lovable construit une commande complète en croyant faire du P1  
**Action requise :** D-28 dans DECISION_LOG

### Décision implicite DI-05 — `catalog_domain` : colonne abandonnée ou à créer

**Statut :** `catalog_domain = "APPAREIL"` est utilisé dans le code frontend mais la colonne n'existe pas dans `billing.quote_lines`. Aucun document ne documente cette décision.  
**Risque :** Quelqu'un crée la colonne, quelqu'un d'autre la considère comme inutile  
**Action requise :** Décider : (A) créer la colonne + l'écrire dans la RPC, (B) l'abandonner et utiliser uniquement `appliance_id IS NOT NULL` comme signal. Documenter en D-29.

---

## PARTIE 5 — État de chaque document de référence

| Document | Statut | Action requise |
|---|---|---|
| `docs/LIGNIA_V1_MASTER.md` | ⚠️ Partiellement dépassé | Ajouter `appliance_id` fix dans Backlog P0. Reformuler règle audit. |
| `docs/ENGINEERING_PRINCIPLES.md` | ⚠️ Contradiction C-01 / C-02 | Mettre à jour règles CatalogPopover + AddLineDrawer pour refléter l'état réel du code |
| `docs/architecture/project/DECISION_LOG.md` | ⚠️ Manque D-25 à D-29 | Ajouter les 5 décisions implicites documentées ci-dessus |
| `docs/business/LIGNIA_LIFECYCLE.md` | ✅ Valide et complet | Aucune action requise |
| `docs/business/LIGNIA_OBJECT_MODEL.md` | ⚠️ Contradictions C-03 / C-04 / C-05 | Mettre à jour : commande fournisseur P1, ouvrages partiellement implémentés, parc installé S7 |
| `docs/business/CATALOG_ECOSYSTEM.md` | ✅ Valide | Aucune action requise |
| `docs/product/LIGNIA_USER_STORIES_V3.md` | ✅ Valide comme référence | Pas d'action immédiate |
| `docs/product/ROADMAP_6_SEMAINES.md` | 🚧 Supersédé | Remplacé par ROADMAP_EXECUTABLES_8S.md. Ne pas modifier. |
| `docs/product/ROADMAP_EXECUTABLES_8S.md` | ✅ Référence actuelle | Aucune action requise |
| `docs/product/HEATING_APPLIANCE_EXECUTION_PLAN.md` | ✅ Référence actuelle | Aucune action requise |
| `docs/product/ESTIMATE_TO_INSTALLATION_WORKFLOW.md` | ✅ Utile comme vue unifiée | Note : contenu largement redécouvert depuis les docs business existants |

---

## PARTIE 6 — Règle de validation pour les futures recommandations

Avant toute recommandation ou prompt, indiquer explicitement :

**COMPATIBLE** = la recommandation respecte tous les documents de référence  
**COMPLÈTE** = la recommandation ajoute quelque chose qui manquait mais ne contredit rien  
**CONTREDIT** = la recommandation entre en conflit avec un document existant — justifier explicitement  

### Exemples d'application

| Recommandation | Statut | Justification |
|---|---|---|
| Fix `appliance_id` dans `replace_quote_lines` | COMPATIBLE | Prévu dans ROADMAP_EXECUTABLES_8S P0-01, cohérent avec ENGINEERING_PRINCIPLES |
| Créer `AddLineDrawer` séparé | COMPATIBLE | Prévu dans ENGINEERING_PRINCIPLES, mais dans Forbidden (ne pas refactorer QuoteEditor). Conflict Forbidden vs Engineering Principles à trancher. |
| Fusionner `heating_appliances` et `catalog_items` | CONTREDIT D-02, D-03, D-08 | La séparation est une décision architecturale délibérée. Ajouter une FK est la voie correcte. |
| Créer colonne `catalog_domain` dans `quote_lines` | COMPLÈTE | Résout DI-05. Doit être acté en D-29 avant exécution. |
| Refactorer QuoteEditor.tsx | CONTREDIT ENGINEERING_PRINCIPLES + LIGNIA_V1_MASTER (Forbidden) | Explicitement interdit jusqu'après PMF. |
| Vue commande fournisseur P1 | CONTREDIT LIGNIA_OBJECT_MODEL (dit V2) | Priorité avancée dans les roadmaps récentes. Nécessite mise à jour LIGNIA_OBJECT_MODEL. |
| Note de calcul V3 maintenant | CONTREDIT LIGNIA_V1_MASTER (Backlog P2/V3) + LIGNIA_OBJECT_MODEL | Explicitement P3 dans tous les documents récents. |

---

## PARTIE 7 — Les 5 actions immédiates pour stabiliser la base documentaire

Classées par impact sur la prévention de dérive future.

**ACTION 1 — Mettre à jour `LIGNIA_V1_MASTER.md` Backlog P0**

Ajouter :
```
- [ ] Fix replace_quote_lines : persister appliance_id + appliance_snapshot
- [ ] Payload frontend : passer appliance_id dans handleSave
- [ ] Garde : bloquer envoi si ligne appliance_id avec unit_price_ht = 0
```
Responsable : Fondateur (validation) → Claude Exec (mise à jour fichier)

**ACTION 2 — Ajouter D-25 à D-29 dans DECISION_LOG**

- D-25 : `cost_price` jamais stocké — règle invariante
- D-26 : 1 installation = 1 appareil (décision fondateur attendue)
- D-27 : contenu minimal de `appliance_snapshot`
- D-28 : périmètre exact de la commande fournisseur V1
- D-29 : `catalog_domain` — créer la colonne OU utiliser `appliance_id IS NOT NULL`

Responsable : Fondateur (décisions DI-02 à DI-05) → Claude Exec (écriture)

**ACTION 3 — Mettre à jour ENGINEERING_PRINCIPLES.md**

Réorienter les règles sur `CatalogPopover` et `AddLineDrawer` pour refléter l'état réel du code post-commit 5ef05449.
Responsable : Claude Exec après validation fondateur

**ACTION 4 — Mettre à jour `LIGNIA_OBJECT_MODEL.md`**

Trois champs à corriger : commande fournisseur V1 minimal (pas V2), ouvrages partiellement implémentés, parc installé S7 après pilotes.
Responsable : Claude Exec

**ACTION 5 — Marquer `ROADMAP_6_SEMAINES.md` comme archivé**

Ajouter en tête du fichier : `> ARCHIVÉ — Supersédé par ROADMAP_EXECUTABLES_8S.md`
Responsable : Claude Exec

---

## PARTIE 8 — Ce que ce document ne tranche pas

Trois sujets qui nécessitent une décision fondateur avant toute exécution :

1. **1 installation = 1 ou N appareils ?** → DI-02. Bloquer P0-04 jusqu'à cette décision.
2. **`catalog_domain` dans `quote_lines` : créer ou abandonner ?** → DI-05. Bloquer jusqu'à D-29.
3. **`appliance_snapshot` : contenu minimal validé ?** → DI-03. Nécessaire avant tout patch `replace_quote_lines`.

---

*Ce document doit être relu avant toute session de production. Il remplace tous les audits précédents comme point de départ pour les nouvelles recommandations.*
