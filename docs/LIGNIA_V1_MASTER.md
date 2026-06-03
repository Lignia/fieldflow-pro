# LIGNIA V1 — Document de pilotage produit

> Source de vérité unique. Mis à jour après chaque décision validée.
> Toute action sur le projet doit être justifiée par ce document.

---

## Vision produit

LIGNIA = cockpit métier printable-first pour artisans fumisterie / chauffage bois.

Objectif V1 : réduire la charge mentale artisan. Produire rapidement des devis lisibles, cohérents de l'éditeur au PDF signé. Cible : 50 clients artisans avant refonte majeure.

---

## Invariants absolus

Ces règles ne se discutent pas. Aucun patch ne les viole.

- PDF = vérité contractuelle. Editor ↔ PDF WYSIWYG obligatoire.
- tenant_id via JWT uniquement. Jamais via paramètre appelant.
- Fail-fast : erreur explicite, jamais fallback silencieux.
- TTC = donnée primaire. Marge = donnée métier. HT = technique.
- service ≠ final amputé. C'est un objet métier propre.
- Sections dans l'ordre sort_order, partout (Editor, Detail, PDF).
- Mono sur tous les nombres métier. Inter partout ailleurs.
- Aucun nombre monétaire ne wrappe jamais.
- La largeur utile du tableau ne rétrécit pas sous 700px.
- draft = bg-warning/15 text-warning
- sent = bg-info/15 text-info
- signed = bg-accent/15 text-accent
- lost = bg-destructive/15 text-destructive

---

## UX Cockpit — invariants perceptuels

### Par surface

| Surface | Mode | Objet dominant | Ton |
|---|---|---|---|
| Editor | Production | Tableau de lignes | Dense, rapide |
| Detail | Pilotage | Sidebar cockpit | Aéré, décisionnel |
| PDF | Document | Sections nommées | Imprimable, contractuel |

### Par type de devis

- **estimate** = rassurer. Non contractuel. Ton informatif.
- **final** = contractualiser. Signable. Ton dense et précis.
- **service** = aller vite. SAV terrain, tablette, 2 minutes max.

### Règles inviolables

- Sidebar pilotage = 3 blocs max visibles sans scroll.
- NextStep = premier élément visible de la sidebar, toujours.
- Badge statut = première information colorée de la page.
- TTC = chiffre le plus grand de la page, toujours.
- Actions destructives = variant ghost + text-destructive + Separator avant.

---

## Système devis — 3 objets métier distincts

### estimate
- Qualifier le projet avant visite technique.
- Prix approximatifs. Non contractuel.
- PDF : "Proposition commerciale — sous réserve de visite technique".
- Pas d'acompte. Pas de signature engageante.
- UI Editor : sans acompte, sans dates visite/travaux.

### final
- Document contractuel signable.
- Prix exacts. Références catalogue obligatoires.
- PDF : header standard "DEVIS". Zone signature future.
- Acompte présent. Déclenche facture d'acompte + installation.
- UI Editor : dense. Toutes sections. Marge interne visible.

### service
- SAV terrain / ramonage / entretien.
- 1-3 lignes max. Pas d'acompte.
- Pas de sections Appareil/Fumisterie/Pose.
- Pas de visite préalable. Pas de début travaux.
- PDF : "Bon d'intervention / Prestation d'entretien".
- UI Editor : ultra-compact. Optimisé tablette mobile (Luc).

---

## Agents et rôles

| Agent | Accès | Rôle | Interdit |
|---|---|---|---|
| Claude Analytics | Zéro | Audit, architecture, prompts, priorisation | Modifier quoi que ce soit |
| Claude Read-Only | GitHub + Supabase lecture | Diagnostic, vérification, audit code réel | Écrire, committer, migrer |
| Claude Exec | GitHub + Supabase écriture | Exécute les décisions validées | Décider de sa propre initiative |
| Lovable | Frontend uniquement | UX/UI, 1 invariant par prompt | Logique métier, sécurité, SQL |

---

## Backlog P0 — avant tout utilisateur réel

### Sécurité
- [x] RLS archive Joncoux activée (catalog._archive_joncoux_legacy_20260520)
- [ ] REVOKE PUBLIC sur 21 RPCs business billing/catalog/core
- [ ] Garde anti-anon dans sign_quote_and_initialize (tenant_id via JWT)
- [ ] Scan et retrait .env commité sur main

### PDF
- [ ] Brancher vatBreakdown + quoteSections dans handleGeneratePdf (2 lignes manquantes)
- [ ] Mention par quote_kind dans generateQuotePdf (header différencié)

### Catalogue
- [ ] Vérifier si search_quote_items_v2 utilise search_keywords ou search_vector
- [ ] Si search_keywords : UPDATE batch Joncoux (stratégie B — synonymes par item_family)

### Appareils
- [ ] Fix replace_quote_lines : persister appliance_id dans l'INSERT de la RPC
- [ ] Payload frontend handleSave : passer appliance_id dans le map p_lines
- [ ] Garde : bloquer handleSave(true) si une ligne a appliance_id défini et unit_price_ht = 0

---

## Backlog P1 — avant premiers clients payants

### Quote system
- [ ] QuoteEditor : masquer acompte/visite/travaux sur service
- [ ] QuoteEditor : masquer boutons Appareil/Fumisterie/Pose sur service
- [ ] QuoteDetail : sidebar affinée par quote_kind sur service
- [ ] suggestedVat aligner sur D-24 (5,5% fumisterie posée, pas 10%)
- [ ] isDesynced = false hardcodé : implémenter ou supprimer
- [ ] setTimeout 500ms artificiel dans useQuoteDetail : investiguer

### Sécurité
- [ ] Routes /design-system et /icons derrière AuthGate
- [ ] CreateQuote.tsx orphelin : vérifier et supprimer

### Performance
- [ ] FK indexes critiques : billing.quote_lines(quote_id), billing.quotes(project_id)
- [ ] RLS auth.uid() → (select auth.uid()) sur core.users et catalog.heating_appliances

---

## Backlog P2 — après PMF

- Bouton Aperçu PDF (aperçu inline avant envoi)
- Narration FSM (barre de progression cycle de vie)
- Comparaison versions devis (previous_quote_id)
- Voice quoting
- PWA offline
- Signature électronique intégrée
- Responsive mobile avancé
- Monitoring Sentry
- Staging Supabase

---

## Forbidden now

- Ne pas refactorer QuoteDetail/QuoteEditor tant que Lovable est actif.
- Ne pas créer de composant QuoteDocument partagé.
- Ne pas virtualiser le tableau avant 50 lignes réelles observées en prod.
- Ne pas déployer PWA offline en V1.
- Ne pas faire de responsive mobile avant desktop stable.
- Ne pas ajouter de feature si elle ne coche pas un P0/P1.
- Ne pas lancer un grand audit global — analyses ciblées uniquement désormais.

---

## Règles d'exécution Lovable

Avant chaque prompt Lovable, vérifier :
1. Ce patch coche-t-il un P0 ou P1 du backlog ?
2. Quel invariant est impacté ? Le nommer explicitement.
3. Le patch touche-t-il un seul composant ?

Format obligatoire :
```
- Objectif unique (1 phrase)
- Invariant impacté (nommé)
- Modifications (liste précise)
- Interdictions (au moins 3)
- Rapport attendu (critères de validation)
```

---

## Journal des décisions

Voir `docs/architecture/project/DECISION_LOG.md` (D-01 à D-24 documentées).

---

*Dernière mise à jour : 2026-06-03*
