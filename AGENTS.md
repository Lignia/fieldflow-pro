# LIGNIA — Workspace Knowledge

> Ce fichier est lu automatiquement par Lovable à chaque session.
> Il définit les règles qui s'appliquent à TOUS les projets du workspace.
> Règles spécifiques au projet LIGNIA → voir Project Knowledge (Settings → Knowledge).

---

## Philosophie de développement

Prioriser :
- la simplicité
- la maintenabilité
- la prévisibilité
- le comportement explicite

Éviter :
- la sur-ingénierie
- l'abstraction prématurée
- la complexité inutile

## Règle d'or avant tout changement

1. Auditer le code existant
2. Comprendre le comportement actuel
3. Réutiliser ce qui existe déjà
4. Patcher au minimum

Workflow obligatoire : AUDIT → PLAN → PATCH

Ne jamais réécrire de larges sections de code sans preuve que
l'implémentation actuelle est cassée.

## Plan Mode

Utiliser Plan Mode avant d'implémenter quand :
- Le fichier cible dépasse 200 lignes
- La fonctionnalité touche plusieurs composants
- Un bug complexe est difficile à reproduire
- Un doute existe sur l'impact du changement

Jamais d'implémentation directe sur QuoteEditor.tsx ou Catalog.tsx
sans Plan Mode préalable.

## Pinning

Après chaque fonctionnalité validée : pincer la version dans Lovable.
Après chaque bug corrigé : pincer la version.
En cas de régression : revenir à la version pincée, pas de "Try to Fix" > 2 fois.

## Principes d'architecture

La base de données est la source de vérité.

Les règles métier appartiennent au backend dès que possible.

Le code frontend se concentre sur :
- l'affichage
- l'interaction
- la validation
- l'expérience utilisateur

Ne jamais dupliquer la logique métier dans plusieurs couches.

## Conventions TypeScript

TypeScript strict obligatoire.
Ne jamais utiliser `any`. Si type inconnu : `unknown` + type guard.

Préférer :
- interfaces explicites
- type guards
- unions discriminées

## Conventions de nommage

- Composants React : PascalCase
- Hooks : camelCase avec préfixe `use`
- Utilitaires : kebab-case
- Variables et fonctions : camelCase
- Constantes globales : SCREAMING_SNAKE_CASE
- Types et interfaces : PascalCase

## Conventions React

Préférer :
- composants fonctionnels
- composition
- hooks réutilisables
- responsabilités isolées

Éviter :
- composants surdimensionnés
- état profondément imbriqué
- abstractions inutiles

Jamais de `<form>` HTML natif. Intercepter via onClick/onChange.
Jamais de `useEffect` + fetch manuel. Utiliser les hooks existants.

## Design system

Tailwind core uniquement.
Pas de styles inline.
Pas de couleurs hex directes — utiliser les tokens du design system.
shadcn/ui pour tous les composants de base.
lucide-react pour les icônes uniquement.
Espacements cohérents — ne pas contourner le système.

## Gestion d'erreurs

Échouer rapidement.
Rendre les erreurs visibles.
Ne jamais ignorer silencieusement les échecs.

Toujours fournir :
- `console.error` dans le catch
- feedback utilisateur via `toast()` depuis sonner
- workflow récupérable quand possible

## Sécurité

Ne jamais contourner les permissions.
Ne jamais faire confiance à la validation frontend seule.
Jamais de secret en dur dans le code — toujours via variables d'environnement.
Jamais de `dangerouslySetInnerHTML` sans sanitization explicite.
Jamais de `eval()` ou `Function()` dynamique.

## Base de données

Préférer les changements additifs.
Éviter les migrations destructives.
Protéger les données métier historiques.
Favoriser les enregistrements immuables quand la précision historique compte.

## Performance

Optimiser seulement quand nécessaire — mesurer avant d'optimiser.
`useMemo` / `useCallback` uniquement quand prouvé nécessaire, pas par défaut.
`Promise.all` quand plusieurs fetch sont indépendants.
Pagination obligatoire dès qu'une liste peut dépasser 50 éléments.

## Communication

Être concis et factuel.
Distinguer clairement : faits / suppositions / recommandations.
Réponses en français. Code en anglais (variables, fonctions, commentaires techniques).
Pas d'emojis dans les réponses techniques.
Pas de "great idea" ni de flatterie.
Pas d'ajouts non demandés ("au cas où").
Pas de code mort (variables et imports inutilisés).
