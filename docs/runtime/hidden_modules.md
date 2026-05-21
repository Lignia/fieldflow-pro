# Modules masqués — runtime

Ce document recense les modules présents dans le code mais volontairement
masqués de la navigation utilisateur, pour éviter l'accumulation silencieuse
de `TODO` dans la base.

Mise à jour : 2026-05-21

## Horizon — vue d'ensemble

| Module                          | Horizon                         |
| ------------------------------- | ------------------------------- |
| Planning                        | V2 (3-12 mois)                  |
| SAV / Demandes                  | V1 (0-3 mois)                   |
| Interventions                   | V1 (0-3 mois)                   |
| MobileFAB                       | V1 (dépend SAV + Interventions) |
| Technical Surveys workflow      | V1 (0-3 mois)                   |

Valeurs autorisées pour la colonne *Horizon* :

- **V1 (0-3 mois)** — engagement court terme.
- **V2 (3-12 mois)** — engagé mais pas prioritaire.
- **Expérimental** — pas tranché, dépend d'un signal métier.
- **Abandonné** — ne reviendra pas, à supprimer du code à terme.

---

## Planning

- **Horizon** : V2 (3-12 mois).
- **Masqué dans** : `src/components/MobileBottomNav.tsx` (tab commenté),
  `src/components/AppSidebar.tsx` (jamais ajouté).
- **Route encore active** : `/planning` (composant `src/pages/Planning.tsx`).
- **Raison** : module non finalisé, pas de logique de planification réelle,
  pas de synchronisation avec interventions / techniciens.
- **Condition de réactivation** :
  - modèle `planning_events` (ou équivalent) en base avec RLS multi-tenant ;
  - vue agenda fonctionnelle (jour / semaine) ;
  - intégration avec les interventions et la disponibilité technicien.
- **Dépendances** : backend (table + RPC), frontend (composant agenda),
  hook `usePlanning`.

## SAV / Demandes (`service-requests`)

- **Horizon** : V1 (0-3 mois).
- **Masqué dans** : `src/components/MobileBottomNav.tsx` (tab commenté),
  `src/components/navigation/MobileFAB.tsx` (action "Signaler un problème"
  commentée), `src/components/AppSidebar.tsx` (jamais ajouté).
- **Routes encore actives** : `/service-requests`, `/service-requests/new`,
  `/service-requests/:id`.
- **Raison** : flux SAV pas encore validé métier, pas de SLA, pas de
  qualification de demande, pas de lien clair avec interventions.
- **Condition de réactivation** :
  - workflow SAV défini (statuts, transitions, SLA) ;
  - lien `service_request → intervention` opérationnel ;
  - notifications client / technicien.
- **Dépendances** : backend (FSM `service_request_status`, RPC de
  transition), frontend (formulaires + cockpit demande).

## Interventions

- **Horizon** : V1 (0-3 mois).
- **Masqué dans** : `src/components/navigation/MobileFAB.tsx` (action
  "Démarrer une intervention" commentée), `src/components/AppSidebar.tsx`
  (jamais ajouté).
- **Routes encore actives** : `/interventions`, `/interventions/new`,
  `/interventions/:id`.
- **Raison** : module en cours, pas d'entrée terrain validée pour les
  techniciens, pas de capture de preuve (photos, signature) finalisée.
- **Condition de réactivation** :
  - parcours technicien "Ma journée" stabilisé ;
  - capture photo + signature client en ligne / hors ligne ;
  - lien avec installation et bon d'intervention PDF.
- **Dépendances** : backend (table `interventions`, RPC de clôture),
  frontend (cockpit technicien, upload photo, signature).

## MobileFAB — bouton d'actions rapides

- **Horizon** : V1 — dépend de la réactivation des modules SAV et
  Interventions.
- **Masqué dans** : `src/components/navigation/MobileFAB.tsx` (composant
  retourne `null` tant que `actions` est vide).
- **Actions prévues** :
  1. *Démarrer une intervention* → dépend du module Interventions.
  2. *Signaler un problème* → dépend du module SAV.
  3. *Prendre une photo* → dépend d'un module capture photo (stockage
     Supabase Storage + association à l'entité courante).
- **Condition de réactivation** : au moins une des trois actions ci-dessus
  devient prête (réactiver alors uniquement les entrées correspondantes
  dans le tableau `actions` du composant).
- **Dépendances** : voir modules respectifs ; côté frontend, réintroduire
  les imports Lucide (`Wrench`, `AlertTriangle`, `Camera`), le hook
  `useNavigate`, l'état `open`, et les composants `Sheet`/`Button`.

## Technical Surveys — workflow complet

- **Horizon** : V1 (0-3 mois).
- **Masqué dans** : aucune entrée de menu dédiée ; seule la route
  `/technical-surveys/:id` (lecture) et `/technical-surveys/new`
  (placeholder) existent.
- **Routes encore actives** : `/technical-surveys/new` (placeholder),
  `/technical-surveys/:id` (lecture).
- **Raison** : le formulaire 55+ champs et le workflow de validation
  (relevé → devis final) ne sont pas finalisés ; pas de création réelle
  depuis l'UI, pas de cycle de revue.
- **Condition de réactivation** :
  - formulaire complet (sections + conditionnels) opérationnel ;
  - rattachement projet + génération automatique du devis final ;
  - signature interne (chargé d'affaires) et export PDF.
- **Dépendances** : backend (table `technical_surveys` + RPC
  `finalize_survey`), frontend (formulaire multi-sections, viewer PDF).

> **Note d'implémentation (à respecter pour V1)** : le formulaire ne devra
> **pas** être un formulaire ERP géant. Cible : formulaire guidé,
> progressif, conversationnel. Les 55+ champs doivent être organisés en
> sections contextuelles (révélées au fil du parcours), pas affichés en
> une seule page. Toute implémentation qui dump l'intégralité des champs
> sur un seul écran est considérée comme un anti-pattern.

---

**Règle** : tout module ajouté à cette liste doit également avoir son
entrée masquée commentée avec `// TODO: activer quand module prêt` dans le
code, et toute réactivation doit mettre à jour ce fichier.