# LIGNIA — ENGINEERING PRINCIPLES

**Version :** V1 — Mai 2026
**Scope :** Frontend React/TypeScript + Supabase RPC contracts
**Destinataire :** Claude Exec, développeurs futurs, revues de code

Ce document définit les règles de codage **obligatoires** pour tout patch frontend LIGNIA.

**Contexte critique :**
- `QuoteEditor.tsx` = 73 Ko, composant critique, ne jamais refactorer
- `CatalogPopover` = flow fumisterie stable, ne jamais modifier
- `useCatalogSearch` (SHA 9e54452) = ne jamais modifier
- Chaque règle ci-dessous protège une invariance confirmée par audit runtime

> Toute violation doit être signalée et justifiée dans le commit message. Aucune exception silencieuse.

---

## React / Vite / TypeScript

- Aucun `any` local ajouté hors clients Supabase déjà centralisés.
- Tout nouveau type doit être explicite : `ApplianceSearchResult`, `AddLineDrawerProps`, `QuoteLineDraft`.
- Pas de logique métier dans le JSX.
- Pas de mutation directe des arrays de lignes devis.
- Utiliser `useMemo` uniquement pour calculs dérivés coûteux ou listes filtrées.
- Utiliser `useCallback` uniquement pour handlers passés à des composants enfants memoïsés.
- Pas de `useEffect` pour recalculer une donnée qui peut être dérivée au render.
- Pas de state dupliqué entre `QuoteEditor` et `AddLineDrawer`.

---

## TanStack Query / cache runtime

- Une query key = un contrat RPC stable.
- Toute query key doit inclure : `tenant_id`, `query`, `filters`, `limit`.
- Ne jamais utiliser une key générique type `["appliances"]` ou `["catalog"]`.
- Les recherches catalogue/appareils ne doivent pas refetch automatiquement au focus.
- `staleTime` obligatoire > 0 pour éviter le spam RPC.
- `retry` limité à 0 ou 1 sur recherche catalogue.
- Pas de retry agressif sur RPC de recherche.
- Pas de cache global mutable des résultats appareil.
- Pas de mutation directe du cache TanStack pour les lignes devis.
- Invalidation ciblée uniquement après sauvegarde devis, jamais à chaque frappe.
- Les hooks de recherche doivent dédupliquer les appels via debounce + query key stable.
- Une recherche vide ne doit pas déclencher de RPC.
- Les résultats de recherche ne doivent jamais devenir source contractuelle ; seul le snapshot ligne l'est.

---

## Optimistic updates / lignes devis

- Aucun optimistic update complexe dans `QuoteEditor`.
- Pas de placeholder "loading row".
- Pas de ligne fantôme pendant `resolve_item_price`.
- Une ligne devis n'est affichée que si l'objet local complet existe.
- Si `resolve_item_price` échoue, aucune ligne catalogue ne doit être ajoutée.
- Pas de rollback silencieux : erreur visible et ligne absente.
- Pas de double insert possible sur double clic : désactiver action ou guard pendant ajout.
- Les lignes appareils peuvent être ajoutées sans pricing RPC, mais doivent être complètes localement.
- Les lignes libres ne doivent jamais passer par un état intermédiaire incomplet.
- Toute insertion locale doit être idempotente côté UI : un clic = une ligne.

---

## Supabase / RPC contracts

- Un hook = un contrat RPC.
- `useCatalogSearch` reste propriétaire de `search_quote_items_v2`.
- `useApplianceSearch` devient propriétaire de `public.search_heating_appliances`.
- Ne jamais appeler une RPC directement depuis un composant UI si un hook dédié existe.
- Toujours typer la réponse RPC avant mapping UI.
- En cas d'erreur RPC : fail visible, pas de fallback silencieux.
- Ne jamais changer la signature d'une RPC appelée par le frontend sans vérifier tous les appels.
- `search_heating_appliances` doit être appelé via `supabase.rpc`, **jamais** `catalogDb.rpc`.
- `search_quote_items_v2` reste appelé via le chemin actuel, sans modification.

---

## Séparation UI / logique métier

- `AddLineDrawer` gère uniquement recherche, affichage, sélection.
- `QuoteEditor` reste propriétaire de la création réelle des lignes devis.
- `CatalogPopover` ne doit pas connaître les appareils.
- `useApplianceSearch` ne doit pas connaître `quote_lines`.
- Aucun composant UI ne doit recalculer un prix achat.
- Aucun composant UI ne doit modifier `metadata.pricing` sauf au moment de création de la ligne.
- La conversion résultat recherche → ligne devis doit rester dans un handler unique.
- La création d'une ligne appareil doit rester séparée de la création d'une ligne catalogue.

---

## Gestion état QuoteEditor

- Une ligne devis créée doit être complète dès l'insertion locale.
- Ne pas créer de ligne "partielle" puis la compléter par effet secondaire.
- `unit_cost_price` doit être posé au même endroit que `unit_price_ht`.
- `appliance_snapshot` doit être posé au moment exact de la sélection appareil.
- Le prix appareil manuel ne doit pas déclencher d'appel RPC.
- Les lignes libres ne doivent jamais passer par `resolve_item_price`.
- Éviter les états parallèles pour la même liste de lignes.
- L'ordre des lignes et `section_id` doivent être conservés à l'ajout.

---

## Performance rendering

- Ne pas rendre 1 516 appareils d'un coup.
- Toujours limiter les résultats RPC à 12.
- Debounce recherche : 300ms.
- Pas de recherche si query < 2 caractères, sauf état vide contrôlé.
- Éviter les gros objets JSONB dans le render ; les garder pour snapshot seulement.
- Les cards appareil affichent seulement les champs UX nécessaires.
- Les champs snapshot complets ne doivent pas être stringifiés dans l'UI.
- La liste de résultats doit recevoir des objets UI légers, pas le JSONB snapshot complet recalculé à chaque render.
- Pas de `.map()` coûteux sur dataset complet côté frontend.

---

## Mobile UX / drawer performance

- Autofocus recherche à l'ouverture du drawer.
- Ne pas casser le clavier mobile : éviter reflow brutal à chaque frappe.
- Le drawer doit conserver une hauteur stable pendant la saisie.
- La liste résultats ne doit pas rerender intégralement à chaque keypress si seuls loading/error changent.
- Pas d'animation lourde sur ouverture/fermeture mobile.
- Pas de shadow DOM lourd ni effet visuel coûteux dans les cards.
- Le scroll doit être interne au contenu du drawer.
- Les tabs doivent rester visibles pendant la saisie mobile.
- Touch target minimum : 44px.
- Éviter les boutons trop proches dans les cards appareil.
- Sur mobile, l'action principale "Ajouter" doit être accessible sans scroll excessif.

---

## Lazy loading

- `AddLineDrawer` peut être importé normalement si patch simple.
- Si impact bundle visible, passer à `React.lazy` plus tard, pas maintenant.
- Ne pas lazy-loader `QuoteEditor`.
- Ne pas introduire `Suspense` global.
- Ne pas lazy-loader les hooks de recherche.

---

## Hooks React

- Hooks uniquement en haut de composant ou dans hooks dédiés.
- Pas de hook conditionnel par onglet.
- `useApplianceSearch` doit accepter `enabled` ou gérer query vide proprement.
- Nettoyer les timers debounce au unmount.
- Éviter stale closures dans les handlers d'ajout ligne.
- Les hooks ne doivent pas retourner des objets instables inutiles à chaque render.
- Les hooks de recherche doivent exposer uniquement : `results`, `loading`, `error`.

---

## Snapshots immuables

- Snapshot = copie plate/JSON au moment de sélection.
- Ne jamais stocker une référence mutable vers l'objet résultat.
- Ne jamais recalculer `appliance_snapshot`.
- Ne jamais hydrater un devis existant depuis `heating_appliances`.
- Ne jamais recalculer une ligne signée depuis `catalog_items`.
- Un devis existant doit rester affichable même si le catalogue vivant est purgé.
- Les snapshots ne doivent pas dépendre du cache TanStack.

---

## JSONB runtime

- `metadata` doit toujours rester un objet valide.
- Ne jamais écraser `metadata` complet si un merge suffit.
- Préserver `metadata.pricing` existant.
- Ajouter des clés, ne jamais renommer/supprimer les clés existantes.
- Pour appareils : `metadata.source = "appliance"`.
- Pour catalogue : conserver la structure pricing actuelle.
- Toute nouvelle clé JSONB doit être documentée dans le commentaire du patch.
- Les champs JSONB critiques doivent être lus avec `?.`, jamais par accès fragile.

---

## Rollback frontend

- Chaque patch doit être revertable par `git revert <SHA>`.
- Pas de mélange UI + SQL + types générés dans le même commit.
- Aucun changement massif de formatage.
- Aucun déplacement de fichier existant sauf création de nouveau composant/hook demandé.
- Si un test manuel échoue, revert immédiat avant nouveau patch.
- Pas de migration frontend irréversible.
- Pas de modification de routes/navigation globale.

---

## Validation runtime obligatoire après chaque patch

- [ ] Ligne catalogue Joncoux ajoutée au devis
- [ ] Ligne appareil ajoutée au devis
- [ ] Ligne libre ajoutée au devis
- [ ] Sauvegarde devis
- [ ] Réouverture devis
- [ ] PDF/devis affiché si accessible
- [ ] Mobile 390px
- [ ] Desktop ≥ 1024px
- [ ] Vérification en base après sauvegarde (pas seulement UI)
- [ ] Double clic sur ajout catalogue → 1 seule ligne
- [ ] Double clic sur ajout appareil → 1 seule ligne
- [ ] Recherche rapide avec 5 frappes successives
- [ ] Fermeture drawer pendant chargement

---

## Anti-refactor (règles absolues)

- Ne pas "nettoyer" `QuoteEditor`.
- Ne pas extraire des sous-composants non demandés.
- Ne pas renommer handlers existants sauf nécessité locale.
- Ne pas modifier `CatalogPopover`.
- Ne pas modifier `useCatalogSearch`.
- Ne pas modifier le design system global.
- Ne pas introduire de nouvelle lib.
- Ne pas convertir un composant existant vers une autre primitive UI.
- Ne pas remplacer TanStack Query ou le pattern actuel de hooks.

---

## Dépendances circulaires

- `components` ne doivent pas importer depuis `pages`.
- `hooks` ne doivent pas importer depuis `components`.
- `QuoteEditor` peut importer `AddLineDrawer`.
- `AddLineDrawer` peut importer hooks + UI components.
- `useApplianceSearch` importe uniquement Supabase client, user context, toast si nécessaire.
- Pas d'import croisé `QuoteEditor` ↔ `AddLineDrawer`.
- Les types partagés doivent être dans un fichier neutre si nécessaire, pas dans `QuoteEditor`.

---

## Stabilité TypeScript

- Pas d'erreur `tsc`.
- Pas de `// @ts-ignore`.
- Pas de cast large `as any` hors frontière Supabase.
- Les types RPC appareils doivent accepter les NULL réels.
- `flue_diameter_mm` doit être typé `number | null`.
- `unit_price_ht = 0` appareil doit être volontaire et commenté.
- `unit_cost_price = null` appareil doit être volontaire et commenté.
- Les props optionnelles doivent être explicitement nullable ou optional, pas implicites.
- Les handlers doivent avoir des signatures stables et typées.

---

## Contrats UX

- L'utilisateur comprend clairement : catalogue fumisterie = prix calculé, appareil = prix à saisir.
- Badge obligatoire pour appareil sans prix.
- Badge obligatoire pour Ø non renseigné.
- Aucun blocage sur appareil sans diamètre.
- Aucun blocage sur appareil à prix zéro tant que badge visible.
- La TVA appareil doit rester éditable manuellement.
- Le drawer doit se fermer après ajout réussi, sauf si l'utilisateur choisit d'ajouter plusieurs lignes.

---

## Contrats backend/frontend

- Frontend respecte le schéma public/catalog :
  - `search_heating_appliances` via `supabase.rpc`
  - `search_quote_items_v2` via `catalogDb.rpc`
- Aucun frontend ne dépend de `cost_price`.
- Aucun frontend ne lit `heating_appliances` pour recalculer un devis.
- Aucun frontend ne suppose que `supplier_ref` est une identité produit globale.
- Aucun frontend ne fait de matching fournisseur automatique.
- Aucun frontend ne masque une erreur RPC par des résultats vides sans toast.

---

*Document maintenu par : LIGNIA Engineering*
*À mettre à jour à chaque décision d'architecture majeure.*
