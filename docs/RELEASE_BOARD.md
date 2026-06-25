# RELEASE BOARD — LIGNIA PILOTE 5 ARTISANS
> Document unique de pilotage — 30 jours
> Mis à jour après chaque ticket terminé et validé
> Source vérité : BACKLOG_PILOTE_5_ARTISANS.md

---

## STATUTS

| Symbole | Signification |
|---|---|
| ⬜ | À faire |
| 🔵 | En cours (envoyé à Lovable / Claude Exec) |
| ✅ | Terminé — validé par Thomas |
| ❌ | Bloqué |

---

## SEMAINE 1 — CORRIGER

| # | Ticket | Responsable | Dépendances | Test validation | Statut |
|---|---|---|---|---|---|
| BUG-01 | TVA appareils 20% → 5.5% | Lovable | — | Ajouter poêle → TVA = 5,5% | ⬜ |
| BUG-02 | Suppression article → archivage | Lovable | — | Supprimer article → is_active=false en base | ⬜ |
| BUG-03 | Bibliothèque ouvrages — réinsertion | Lovable | — | Sauvegarder ouvrage → le trouver sans recherche dans un nouveau devis | ⬜ |
| BUG-04 | PDF facture — activer le bouton | Lovable | — | Ouvrir facture → télécharger PDF avec données correctes | ⬜ |

---

## SEMAINE 2 — CONNECTER

| # | Ticket | Responsable | Dépendances | Test validation | Statut |
|---|---|---|---|---|---|
| FEAT-05 | Bandeau fournisseurs actifs | Lovable | — | Chips visibles, toggle actif/inactif, toast | ⬜ |
| FEAT-06 | Recherche devis filtrée | Lovable | FEAT-05 | "coude 150" → Poujoulat + Joncoux seulement | ⬜ |
| FEAT-07 | Bannière dashboard | Lovable | FEAT-05 | Nouveau tenant → bannière visible | ⬜ |
| FEAT-08 | Masquer bouton import | Lovable | — | Non-admin → bouton absent | ⬜ |
| FEAT-09 | Supprimer colonne Coût HT | Lovable | — | Colonne absente du tableau | ⬜ |

---

## SEMAINE 3 — SÉCURISER + ARCHIVER

| # | Ticket | Responsable | Dépendances | Test validation | Statut |
|---|---|---|---|---|---|
| SEC-10 | provision-tenant verify_jwt:true | Claude Exec | — | list_edge_functions → verify_jwt=true + test onboarding | ⬜ |
| SEC-11 | DROP _import_staging_poujoulat | Claude Exec | — | Table absente de information_schema.tables | ⬜ |
| DOCS-12 | Archiver documents obsolètes | Claude Exec | — | 9 fichiers dans docs/archive/ | ⬜ |

---

## SEMAINE 4 — TESTER

| # | Ticket | Responsable | Dépendances | Test validation | Statut |
|---|---|---|---|---|---|
| TEST-13 | Test pilote devis complet | Thomas | BUG-01 BUG-03 BUG-04 FEAT-05 FEAT-06 | Parcours complet sans blocage | ⬜ |
| AJUST-14 | Ajustements post-test | Lovable/Exec | TEST-13 | Défini après TEST-13 | ⬜ |
| RESERVE-15 | Réserve pilote | À définir | TEST-13 | Défini si nécessaire | ⬜ |

---

## RÈGLES D'EXÉCUTION

```
1. Un ticket à la fois — ne pas envoyer FEAT-06 avant que FEAT-05 soit validé
2. Chaque ticket → PLAN MODE d'abord dans Lovable pour les fichiers > 200 lignes
3. Pincer la version stable dans Lovable après chaque ticket validé
4. Tester sur le compte Rita (ee7ce528) après chaque ticket
5. Si Lovable entre en boucle → revenir à la version pincée, pas de "Try to Fix" > 2x
```

---

## HORS PÉRIMÈTRE — NE PAS OUVRIR AVANT TEST-13

```
Planning calendrier              → effort L, stub vide
Contacts multiples               → table absente
Relances devis automatiques      → table absente
Onglets catalogue catalog_domain → migration données requise
5 Edge Functions admin           → sécurité post-pilote
Fournisseur préféré projet       → V2/V3
Types factures ACOMPTE/SOLDE     → V2
```

---

## KNOWLEDGE FILE LOVABLE

Avant chaque session Lovable, vérifier que le contenu de
`docs/LIGNIA_LOVABLE_KNOWLEDGE.md` est à jour dans
Lovable → Settings → Knowledge.

---

*Créé le 25 juin 2026*
*Prochain point : après TEST-13*
*Mise à jour : après chaque ticket ✅*
