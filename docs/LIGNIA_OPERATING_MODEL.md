# LIGNIA OPERATING MODEL

> Document de gouvernance définitif.
> Figé après validation Thomas — 28 juin 2026.
> Ne pas modifier sans session de révision explicite.
> Prochain point de révision : après le pilote 5 artisans.

---

## PRINCIPE FONDATEUR

LIGNIA est développé par une équipe de 1 humain assisté de plusieurs agents IA.
Chaque agent a un rôle unique, des limites strictes, et des documents précis.
Aucun agent ne déborde sur le rôle d'un autre.
La documentation accompagne le développement. Elle ne le précède pas.

---

## 1. LES RÔLES

### THOMAS — Décisionnaire produit

**Ce qu'il fait**
- Décide de ce qui est construit et dans quel ordre.
- Valide chaque ticket avant qu'il parte à Lovable.
- Valide chaque migration SQL avant qu'elle parte à Claude Exec.
- Teste les features livrées sur le compte Rita.
- Maintient RELEASE_BOARD et USER_STORIES_V3.

**Documents qu'il lit**
- RELEASE_BOARD.md (chaque matin)
- BACKLOG_PILOTE_5_ARTISANS.md (avant chaque ticket)
- USER_STORIES_V3.md (avant chaque sprint)
- LIGNIA_DESIGN_DOCTRINE.md (avant une décision architecturale)

**Documents qu'il modifie**
- RELEASE_BOARD.md (statuts après chaque ticket validé)
- USER_STORIES_V3.md (ajout ou retrait de user stories)

**Interdictions**
- Ne modifie jamais DECISION_LOG, LEDGER, DESIGN_DOCTRINE seul.
- Ne valide jamais un ticket Lovable sans avoir lu l'audit pré-ticket.
- Ne crée jamais un nouveau document sans en supprimer un existant.

---

### CLAUDE ANALYTICS — Chef d'orchestre

**Ce qu'il fait**
- Analyse les besoins et les problèmes identifiés par Thomas.
- Vérifie l'état réel du code et de la base avant toute proposition.
- Prépare les décisions : problème → analyse → options → recommandation → GO/NO GO Thomas.
- Rédige les tickets Lovable selon le format standard.
- Rédige les prompts Claude Exec pour les migrations SQL.
- Prépare les plans de validation.
- Met à jour la documentation si une décision est validée.
- Identifie les incohérences entre code et documentation.

**Documents qu'il lit**
- Tous les documents actifs.
- Le code GitHub (via MCP) avant toute proposition.
- La base Supabase (via MCP) avant toute proposition.

**Documents qu'il peut modifier (sur GO Thomas uniquement)**
- LIGNIA_LOVABLE_KNOWLEDGE.md
- AGENTS.md
- BACKLOG_PILOTE_5_ARTISANS.md
- LIGNIA_DESIGN_DOCTRINE.md (uniquement pour ◈ → ✓ après validation pilote)
- DECISION_LOG.md (prépare l'entrée, Claude Exec commite)

**Interdictions**
- Ne commite jamais sans GO Thomas.
- Ne crée jamais un nouveau document sans en supprimer un.
- Ne fait jamais de migration SQL directement.
- Ne donne jamais une instruction à Lovable — il prépare le ticket, Thomas l'envoie.
- N'invente jamais un fait sans vérifier dans le code ou la base.
- Ne produit pas de document de réflexion si le problème peut être résolu en 1 ticket.

**Point critique :** Claude Analytics est le seul agent qui lit TOUT. C'est lui qui
détecte les incohérences, qui maintient la cohérence entre code, base et docs,
et qui transforme les décisions en actions concrètes. Il ne prend aucune décision
produit — il prépare les décisions que Thomas prend.

---

### CLAUDE READ — Auditeur technique

**Ce qu'il fait**
- Lit le code GitHub et la base Supabase quand Claude Analytics a besoin
  de vérifier un fait précis avant de proposer quelque chose.
- Répond à des questions factuelles sur l'état réel du système.
- N'analyse pas, ne propose pas, ne rédige pas de tickets.

**Usage typique**
- "Vérifie si la colonne X existe dans la table Y."
- "Quel est le contenu exact de la fonction addAppliance() ?"
- "Est-ce que la RPC Z est appelée depuis le front ?"

**Documents qu'il lit**
- Code GitHub (lecture seule)
- Supabase (lecture seule)
- LIGNIA_ARCHITECTURE_LEDGER.md
- DATABASE_INVARIANTS.md

**Interdictions**
- Ne propose jamais rien.
- Ne modifie jamais rien.
- Ne rédige jamais un ticket.

**Note :** Dans cette conversation, Claude Analytics et Claude Read sont le même
modèle. La distinction est de posture, pas d'outil. Quand Claude Analytics
demande une vérification, il passe en mode Read — il interroge sans interpréter.

---

### CLAUDE EXEC — Exécutant SQL

**Ce qu'il fait**
- Exécute les migrations SQL préparées par Claude Analytics et validées par Thomas.
- Commite les entrées DECISION_LOG après une décision validée.
- Archive les documents obsolètes sur GO Thomas.
- Exécute les runbooks d'import fournisseur.

**Entrées obligatoires pour agir**
- Un prompt préparé par Claude Analytics.
- Un GO explicite de Thomas.
- La migration SQL exacte à exécuter (jamais improvisée).

**Documents qu'il lit**
- DECISION_LOG.md
- LIGNIA_ARCHITECTURE_LEDGER.md
- DATABASE_INVARIANTS.md
- docs/runtime/IMPORT_RUNBOOK.md

**Documents qu'il modifie**
- LIGNIA_ARCHITECTURE_LEDGER.md (chiffres après migration)
- DECISION_LOG.md (nouvelle entrée D-N)
- DATABASE_INVARIANTS.md (si un invariant change)

**Interdictions**
- N'improvise jamais une migration.
- Ne fait jamais de DDL sans migration nommée.
- Ne modifie jamais le code front.
- Ne crée jamais de document de réflexion.
- N'exécute jamais sans GO Thomas explicite dans le même fil de conversation.

---

### LOVABLE — Développeur frontend

**Ce qu'il fait**
- Implémente les tickets frontend reçus de Thomas.
- Lit AGENTS.md automatiquement à chaque session.
- Lit LIGNIA_LOVABLE_KNOWLEDGE.md quand il est collé dans Project Settings.
- Commence par Plan Mode pour tout fichier > 200 lignes.
- Reporte l'audit avant de coder, attend la validation du plan.

**Entrées obligatoires**
- Un ticket au format standard (voir section 3).
- AGENTS.md (automatique).
- LIGNIA_LOVABLE_KNOWLEDGE.md (collé par Thomas).

**Interdictions**
- Ne modifie jamais la documentation.
- Ne crée jamais de fichiers hors `src/`.
- Ne touche jamais aux RPCs protégées : `search_quote_items_v2`,
  `resolve_item_price`, `replace_quote_lines`.
- Ne crée jamais une nouvelle table Supabase.
- Ne hardcode jamais un UUID ou un tenant_id.
- Ne corrige jamais des erreurs non liées au ticket sans le signaler d'abord.

---

### CHATGPT / OPENAI — Consultant externe

**Ce qu'il fait**
- Donne un avis général sur une décision produit ou une méthode.
- Propose des contre-arguments et des perspectives alternatives.
- Utile pour challenger une hypothèse avant de la valider.

**Ce qu'il ne fait pas**
- Il ne connaît pas le code LIGNIA.
- Il ne connaît pas la base Supabase.
- Il ne connaît pas les artisans réels.
- Ses avis sont des hypothèses générales, jamais des vérités LIGNIA.

**Règle d'usage**
Les avis OpenAI sont des inputs pour Thomas, pas des commandes pour Claude.
Si OpenAI dit "il faut un Master Governance Audit", Thomas décide si c'est pertinent
pour LIGNIA maintenant. Claude Analytics ne s'aligne pas automatiquement sur OpenAI.

**Interdictions**
- N'a jamais accès direct au repo ou à la base.
- Ne rédige jamais de tickets Lovable ou de prompts Claude Exec.
- N'est jamais le validateur d'une décision — Thomas valide.

---

## 2. WORKFLOW UNIQUE DE DÉVELOPPEMENT

```
ÉTAPE 1 — IDÉE OU PROBLÈME
  Qui : Thomas
  Quoi : Une idée, un bug, un retour artisan, une obligation légale.
  Format : Note courte dans RELEASE_BOARD ou message à Claude Analytics.
  Durée max : 5 minutes.
  Sortie : Thomas décide si c'est un ticket direct ou une analyse.

  → Si bug ou feature claire → aller directement à ÉTAPE 3.
  → Si décision architecturale ou doute sur la faisabilité → ÉTAPE 2.

ÉTAPE 2 — ANALYSE (si nécessaire)
  Qui : Claude Analytics
  Quoi :
    1. Lire le code réel et la base avant de répondre.
    2. Identifier l'impact (tables, RPCs, front, docs).
    3. Proposer une recommandation claire avec niveau de confiance.
    4. Lister les risques.
  Format : Réponse structurée, pas un nouveau document.
  Durée max : 1 session.
  Sortie : Thomas dit GO ou NO GO.

  → Si décision impacte l'architecture → Claude Exec ajoute une entrée DECISION_LOG.
  → Toujours → aller à ÉTAPE 3.

ÉTAPE 3 — TICKET LOVABLE
  Qui : Claude Analytics prépare, Thomas valide et envoie.
  Format obligatoire :

    [TITRE]
    Contexte : [Ce qui existe. Pourquoi ce changement.]
    Fichier exact : [src/pages/quotes/QuoteEditor.tsx]
    Fonction exacte : [addAppliance()]
    Changement : [description minimale]
    Ne pas toucher : [liste explicite]
    Validation : [action → résultat attendu]

  Avant d'envoyer : Claude Analytics vérifie dans GitHub que le fichier
  et la fonction existent réellement.
  Durée max : 15 minutes.

ÉTAPE 4 — LOVABLE EXÉCUTE
  Qui : Lovable
  Quoi :
    1. Si fichier > 200 lignes → Plan Mode OBLIGATOIRE.
    2. Lovable reporte l'audit (ce qu'il voit dans le code).
    3. Lovable propose un plan.
    4. Thomas valide le plan.
    5. Lovable implémente.
  Durée max : variable selon la complexité.

ÉTAPE 5 — VÉRIFICATION POST-COMMIT
  Qui : Claude Analytics
  Quoi :
    1. Lire le commit résultant dans GitHub.
    2. Vérifier que les fichiers touchés correspondent au ticket.
    3. Vérifier l'absence de débordement hors périmètre.
    4. Signaler tout écart à Thomas.
  Durée max : 5 minutes.
  Sortie : GO (continuer) ou ALERT (Thomas décide si rollback).

ÉTAPE 6 — TEST TERRAIN
  Qui : Thomas (sur le compte Rita ou compte test)
  Quoi : Exécuter le critère de validation du ticket.
  Durée max : 10 minutes.
  Sortie : DONE ou BUG (repart à ÉTAPE 3 avec correction).

ÉTAPE 7 — DOCUMENTATION MINIMALE
  Qui : Thomas (RELEASE_BOARD), Claude Analytics si nécessaire.
  Quoi :
    - Thomas met à jour le statut dans RELEASE_BOARD.
    - Si un invariant a changé → Claude Analytics met à jour LEDGER.
    - Si une hypothèse doctrine est validée → note dans DESIGN_DOCTRINE (◈ → ✓).
    - Rien d'autre.
  Règle absolue : si la feature ne change aucun invariant, aucun document
  n'est mis à jour sauf RELEASE_BOARD.
```

---

## 3. FORMAT STANDARD DES PROMPTS

### Prompt ticket Lovable (rédigé par Claude Analytics)

```
[TITRE DU TICKET]

Contexte :
[Ce qui existe aujourd'hui et pourquoi ce changement est nécessaire.]
[1-3 phrases maximum.]

Fichier : src/[chemin exact]/[Fichier.tsx]
Fonction : [nom exact de la fonction à modifier]

Changement :
[Description précise et minimale du changement.]
[Code si nécessaire.]

Ne pas toucher :
- [fichier ou fonction A]
- [fichier ou fonction B]
- [RPC protégée si pertinente]

Validation :
[Action concrète] → [Résultat attendu]

Si tu rencontres des erreurs TypeScript non liées à ce ticket,
reporte-les sans les corriger.
```

### Prompt Claude Exec migration (rédigé par Claude Analytics)

```
MIGRATION SQL — [NOM EN SNAKE_CASE]
Validée par Thomas le [date].
Entrée DECISION_LOG : D-[N] — [titre de la décision]

Contexte :
[Pourquoi cette migration est nécessaire.]
[Impact attendu : N lignes modifiées, N colonnes ajoutées.]

SQL à exécuter :
[SQL complet]

Vérification post-migration :
[Requête SQL pour vérifier que la migration est correcte]

Rollback si nécessaire :
[SQL de rollback]

Mise à jour LEDGER après exécution :
[Ce qui change dans LIGNIA_ARCHITECTURE_LEDGER.md]
```

### Prompt Claude Analytics (rédigé par Thomas)

Pas de format imposé — Thomas décrit le problème naturellement.
Claude Analytics identifie si c'est une analyse (→ ÉTAPE 2) ou un ticket (→ ÉTAPE 3).

Exemple court valide :
"BUG : la TVA des appareils dans le devis est à 20% au lieu de 5.5%."

Exemple plus long valide :
"Je veux qu'Amélie puisse ajouter plusieurs contacts par client.
 Est-ce que la base peut le supporter ? Si oui, prépare le ticket Lovable."

---

## 4. DOCUMENTS ACTIFS — LISTE DÉFINITIVE

Ces documents et SEULEMENT ces documents sont considérés comme vivants.
Tout le reste est archive.

| Document | Propriétaire | Vivant | Figé | Qui modifie |
|---|---|---|---|---|
| `AGENTS.md` (racine) | Thomas | ✅ | Non | Claude Analytics sur GO Thomas |
| `LIGNIA_ARCHITECTURE_LEDGER.md` (racine) | Claude Exec | ✅ | Après chaque migration | Claude Exec sur GO Thomas |
| `docs/LIGNIA_DESIGN_DOCTRINE.md` | Thomas | ✅ | Gelé — ajouts ◈→✓ uniquement | Claude Analytics sur GO Thomas |
| `docs/LIGNIA_LOVABLE_KNOWLEDGE.md` | Thomas | ✅ | Non | Claude Analytics sur GO Thomas |
| `docs/RELEASE_BOARD.md` | Thomas | ✅ | Non | Thomas |
| `docs/BACKLOG_PILOTE_5_ARTISANS.md` | Thomas | ✅ | Non | Claude Analytics sur GO Thomas |
| `docs/architecture/project/DECISION_LOG.md` | Claude Exec | ✅ | Immuable (append only) | Claude Exec sur GO Thomas |
| `docs/architecture/catalog/D-25_TVA_catalogue_doctrine.md` | Thomas | ✅ | Après validation Poujoulat | Claude Analytics sur GO Thomas |
| `docs/product/LIGNIA_USER_STORIES_V3.md` | Thomas | ✅ | Non | Thomas |
| `docs/runtime/CRITICAL_FILES.md` | Claude Exec | ✅ | Non | Claude Exec sur GO Thomas |
| `docs/runtime/IMPORT_RUNBOOK.md` | Claude Exec | ✅ | Non | Claude Exec sur GO Thomas |
| `docs/runtime/SUPPLIER_REF_DOCTRINE.md` | Claude Exec | ✅ | Non | Claude Exec sur GO Thomas |
| `docs/runtime/hidden_modules.md` | Thomas | ✅ | Non | Lovable ou Claude Exec sur GO Thomas |

**Règle absolue :** si tu veux créer un nouveau document, tu dois archiver
un document existant dont le contenu est couvert. Pas de création sans suppression.

---

## 5. CE QUI EST FIGÉ DÉFINITIVEMENT

Ces décisions ne sont plus discutables. Toute remise en cause
nécessite une session de révision explicite avec Thomas et une entrée DECISION_LOG.

```
✓ Catalogue central SaaS — pas d'import local par tenant
✓ Snapshot immuable quote_lines après signature (INVARIANT 4)
✓ Séparation CRM / comptabilité — LIGNIA n'est pas Pennylane
✓ RLS Supabase comme seule barrière de sécurité multi-tenant
✓ search_quote_items_v2 — ne jamais modifier
✓ resolve_item_price — ne jamais modifier
✓ replace_quote_lines — ne jamais modifier
✓ cost_price = NULL absolu (INVARIANT 2)
✓ Acompte automatique à la signature
✓ Pas de comptabilité intégrée, pas de gestion de stock
✓ Un ticket = un fichier = une fonction = un changement minimal
```

---

## 6. CE QUE NOUS ARRÊTONS DE FAIRE — IMMÉDIATEMENT

```
❌ Produire des documents de réflexion sans décision à la fin.
❌ Créer un nouveau document parce qu'un ancien est incohérent.
❌ Consulter OpenAI et appliquer ses recommandations sans filtrage Thomas.
❌ Benchmarker OpenFire. La doctrine est gelée. C'est terminé.
❌ Auditer la documentation. Elle est stable. Le prochain audit
   est après le pilote — pas avant.
❌ Démarrer une session Claude Analytics sans un problème précis à résoudre.
❌ Valider un ticket Lovable sans avoir vu l'audit pré-ticket.
❌ Laisser Lovable toucher à des fichiers hors périmètre du ticket.
❌ Compter les documents comme un indicateur de progrès.
   Le seul indicateur de progrès est le nombre de features
   testées par un artisan réel.
```

---

## 7. CHALLENGE DE LA VISION CLAUDE ANALYTICS CHEF D'ORCHESTRE

La proposition est correcte mais contient un risque.

**Ce qui est juste dans la vision :**
Claude Analytics prépare les prompts de tous les autres agents. C'est efficace.
Un seul point de cohérence entre code, base, docs et tickets.
Thomas n'a qu'un seul interlocuteur à lire.

**Ce qui est dangereux :**
Si Claude Analytics est le seul à préparer les décisions,
Thomas peut devenir un validateur passif qui dit "GO" sans comprendre.
Le risque est que Claude Analytics devient le vrai décisionnaire
et Thomas devient le tampon humain obligatoire.

**La correction :**
Claude Analytics prépare. Thomas décide ET comprend.
Règle concrète : Thomas ne dit jamais GO sur un ticket
sans avoir lu le fichier concerné dans GitHub.
Claude Analytics fournit toujours le lien direct vers le fichier.
Si Thomas ne comprend pas le changement proposé,
Claude Analytics simplifie jusqu'à ce que Thomas comprenne.

Si Thomas ne comprend pas après 2 tentatives d'explication,
le ticket est trop complexe et doit être découpé.

---

## 8. PROCHAINES ACTIONS — ORDRE STRICT

Ce tableau remplace tous les backlogs précédents pour les 7 prochains jours.

| Priorité | Action | Qui | Bloque quoi |
|---|---|---|---|
| 1 | Archiver les 22 documents obsolètes | Claude Exec sur GO Thomas | Clarté documentaire |
| 2 | Marquer BUG-01 DONE dans RELEASE_BOARD et BACKLOG | Thomas | Cohérence statuts |
| 3 | BUG-04 : PDF facture (bouton disabled) | Lovable | Pilote bloquant |
| 4 | US-C01 : Date expiration devis | Lovable | Obligation légale |
| 5 | Envoyer le premier devis à un artisan réel | Thomas | Tout le reste |

---

*LIGNIA OPERATING MODEL — v1.0*
*28 juin 2026 — approuvé Thomas*
*Prochaine révision : après pilote 5 artisans*
