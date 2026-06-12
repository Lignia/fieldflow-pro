# DEVELOPER HANDOFF — LIGNIA Catalogue V1

> Statut : OFFICIEL — figé juin 2026. Document de passation pour tout développeur ou agent reprenant le catalogue.
> À lire AVANT toute intervention sur `catalog.catalog_items`, le pipeline d'import ou la recherche d'articles.
> Décisions sources : DECISION_LOG D-01 à D-32, D-25_TVA_catalogue_doctrine.

---

## 1. Contexte projet en 10 lignes

LIGNIA est un CRM bois-énergie (conduits de fumée, tubage, fumisterie, appareils). Stack :
Supabase PostgreSQL multi-tenant (RLS), frontend React/TS/Vite + Tailwind/shadcn généré via
Lovable, PWA. Le cœur métier est le **catalogue d'articles** (`catalog.catalog_items`), qui
alimente la création de devis (`billing.quote_lines`).

État à la reprise : modèle V1 figé, données actuelles **jetables** (aucun client, devis ou
commande réel ; aucune rétrocompatibilité requise). On repart de zéro par réimport propre. Le
modèle doit être jugé sur sa capacité à accueillir de futurs imports propres, pas sur ce qu'il
contient aujourd'hui.

## 2. Les documents de référence (à lire dans cet ordre)

1. `catalog/CATALOG_ITEMS_V1_FINAL.md` — **le quoi** : structure de la table, axes
   `product_type`/`item_family`, invariants. Vérité métier.
2. `catalog/CATALOG_EXECUTION_PLAN_V1_FINAL.md` — **le comment** : séquence d'exécution non
   destructive en 7 phases, prérequis P-00/P-00b/P-00c/P-00d, critères de validation end-to-end.
3. `catalog/suppliers/SUPPLIER_MAPPING_STRATEGY_V1.md` — **la méthode** : comment mapper
   n'importe quel fournisseur (priorité catégorie > libellé, dérivation des axes).
4. `catalog/suppliers/POUJOULAT_ITEM_FAMILY_MATRIX_V1.md` — **les données** : matrice 127
   catégories → 13 familles pour Poujoulat.
5. `catalog/audits/OPENFIRE_PIPELINE_LOSS_AUDIT.md` — **la preuve** : où le pipeline jette
   l'information.
6. `catalog/D-25_TVA_catalogue_doctrine.md` — doctrine TVA (suggestion surchargeable).
7. `project/DECISION_LOG.md` — l'historique des décisions (D-01 à D-32).

## 3. Les deux axes du catalogue (à comprendre avant tout)

Le catalogue a **deux axes complémentaires, jamais concurrents** :

- **`product_type`** (D-31) — axe **universel** de nature : `appliance`, `part`, `service`,
  `consumable`. C'est l'axe de navigation niveau 1. **Cible V1** : tout article doit en porter un
  après import propre, jamais NULL. **État actuel** : non sémantique (alimenté en valeur statique
  par les imports historiques) ; il est corrigé par la dérivation à l'import (voir section 4 et
  SUPPLIER_MAPPING_STRATEGY_V1). La cible est l'objectif ; l'état actuel n'est pas la cible.
- **`item_family`** (D-32) — **sous-classification fumisterie** (13 valeurs). Obligatoire pour la
  fumisterie uniquement ; `NULL` pour appareils, pièces d'appareil et consommables non
  fumisterie. Jamais NOT NULL global.

Navigation : `product_type` (niveau 1) → `item_family` pour la fumisterie / `appliance_type`
pour les appareils (niveau 2) → `manufacturer_name` et `fuel_type` en filtres transverses.

## 4. Invariant fondamental : la nature d'un produit ne se déduit JAMAIS du fabricant ni du fournisseur

C'est l'erreur la plus tentante et la plus dangereuse pour un repreneur.

**`product_type` se dérive de la catégorie source** (`of_seller_product_category_name` ou
équivalent), conformément à SUPPLIER_MAPPING_STRATEGY_V1 (Niveau C-1) — **jamais** du
`supplier_name`, **jamais** du `manufacturer_name`.

Raison : un même fabricant ou fournisseur commercialise des natures de produits différentes. Un
même fabricant peut commercialiser :
- des appareils (`product_type='appliance'`),
- des pièces détachées (`product_type='part'`),
- des consommables (`product_type='consumable'`),
- des prestations (`product_type='service'`).

Un distributeur fumisterie (Lorflex) distribue à la fois des conduits (`part`) et des appareils
(`appliance`). Déduire `product_type='appliance'` parce que « c'est un fournisseur d'appareils »
produirait un catalogue faux.

Conséquence pratique : ne jamais écrire `product_type = f(supplier_name)` ni
`product_type = f(manufacturer_name)`. Toujours `product_type = dérivation(catégorie source)`,
avec, pour une catégorie indéterminable, `data_quality_status='needs_review'` et import bloqué
jusqu'à arbitrage (`product_type` ne prend jamais la valeur `'needs_review'`).

De même, `manufacturer_name ≠ supplier_name` (D-09, D-21) : le fournisseur est le canal d'achat
qui facture l'artisan, le fabricant est celui qui fabrique réellement. Les deux peuvent coïncider
ou non.

## 5. Décisions figées (ne pas rouvrir)

- `supplier_ref` **immuable** : jamais `.upper()`, jamais de `strip` destructif, jamais préfixé
  par le code applicatif (R-01).
- `cost_price` **jamais stocké** dans le catalogue (CHECK en base + filtrage pipeline ; D-25,
  R-02). Le coût artisan vit dans `quote_lines.unit_cost_price`, saisi manuellement.
- `product_type` **doit être obligatoire après import propre** ; il est dérivé de la catégorie
  source, jamais statique (D-31).
- `item_family` **obligatoire pour la fumisterie uniquement**, NULL ailleurs, jamais NOT NULL
  global, aucune valeur nouvelle en V1 (D-32).
- `valid_from` **obligatoire** : date du tarif source si disponible, sinon date d'import +
  `data_quality_status='partial'` (P-00b, Option A).
- `supplier_name` = canal d'achat (D-09, D-21) ; `manufacturer_name` = fabricant réel, **NULL si
  inconnu, jamais 'unknown'** (I-08 ; D-13 superseded — voir section 9).
- `supplier_range` : source explicite ou NULL — jamais inféré d'un préfixe de catégorie.
- TVA : source unique = `catalog_items.vat_rate` (suggestion surchargeable au devis ; D-24).
  Aucune logique TVA côté frontend.
- Prestations : `product_type='service'` fait foi pour le filtrage ; `is_labor=true` = sous-cas
  main-d'œuvre ; `item_family='service'`/`'labor'` autorisés pour les prestations liées au
  chauffage bois (R-12 ; D-18).
- Suppression interdite : on **archive** (`is_active=false`), on ne DELETE jamais un article
  (R-05).
- Pricing runtime : via `resolve_item_price` uniquement (ne pas la réécrire ; D-05).
- RPC : **versionner** (`_v3`), jamais modifier une RPC en place (D-04).

## 6. Invariants de sécurité (sur toute intervention)

- Aucun `DROP TABLE catalog_items`. Aucun vidage de `billing.quote_lines`.
- Aucune suppression d'une colonne ou RPC **encore lue**.
- Bascule frontend (Lovable) **avant** toute suppression de colonne.
- Trigger de recherche recréé **sans `sku`** avant tout DROP de `sku`.
- Snapshot Supabase **avant** toute purge/réimport et avant tout DROP de colonnes.
- Régénérer `types.ts` après toute modification de schéma.

## 7. Le piège central : le pipeline perd de l'information

Le pipeline `CSV → map_supplier.py → JSON → import_supplier_direct.py → RPC
import_supplier_items → catalog_items` **jette trois informations présentes dans la source**
(détail et preuve : OPENFIRE_PIPELINE_LOSS_AUDIT) :

1. `item_family` — la catégorie source n'est jamais lue par `map_supplier.py`.
2. `valid_from` — jamais produit par la chaîne d'import actuelle.
3. `description_fabricant` — survit jusqu'au JSON puis non persistée dans `catalog_items`.

S'ajoute `product_type` écrit en valeur statique au lieu d'être dérivé. Conséquence : toute
correction touche **trois maillons coordonnés**. Corriger un script sans corriger la RPC ne
change rien en base. C'est l'erreur la plus probable pour un repreneur. Les chiffres et les
mesures de remplissage qui prouvent ces pertes sont dans OPENFIRE_PIPELINE_LOSS_AUDIT.

## 8. Pièges connus vérifiés (à ne pas redécouvrir à ses dépens)

- **Le trigger de recherche lit `sku`** : `t9_refresh_item_search_vector` référence `sku`.
  Droper `sku` sans recréer le trigger d'abord casse l'indexation (Phase 7 du plan).
- **`suggestedVat()` dépend de `product_type`** : à découpler en Phase 6 avec `vat_rate` comme
  source unique. Ne pas retirer `product_type` du front avant.
- **`replace_quote_lines` ne lit pas `catalog_items`** : `customer_label` vient du JSON des
  lignes de devis.
- **Lignes à `supplier_ref` NULL/vide** : existent (exclues des index uniques partiels).
  Vérifier « 0 NULL `supplier_ref` » avant de poser ce NOT NULL.
- **Prestations LIGNIA `ADMIN_UPLOAD`** (ramonage, sans `supplier_ref`) : non réimportables par
  le pipeline fournisseur. Exclues de la purge, archivées via `is_active=false` (Phase 5). Voir
  D-18 pour l'`import_batch_id` exact et le détail de ces lignes.
- **`categ_id/id` est mono-valeur** dans l'export Odoo Poujoulat (inutile). La vraie taxonomie
  est `of_seller_product_category_name`.
- **`appliance_type` est contraint par CHECK** `catalog_items_appliance_type_check` (8 valeurs +
  NULL). Une valeur hors liste fait échouer l'INSERT.
- **Catégorie fumisterie inconnue à l'import** : règle P-00 = stop + `needs_review` + rapport.
  Jamais de repli silencieux vers une famille par défaut.

## 9. Dette reportée (hors périmètre V1, à traiter plus tard)

- **Lien `catalog_items → heating_appliances`** via `heating_appliance_id` : **P1 READY —
  colonne non encore créée en base** (D-30). Ne pas l'utiliser tant que la migration P1 n'existe
  pas. Prépare la prescription produit et la note de calcul.
- **D-13 superseded** : la règle d'origine imposait `manufacturer_name = 'unknown'` à l'import.
  Elle est **superseded** (pas amendée in-place) ; la doctrine actuelle est `NULL si inconnu`
  (I-08 de CATALOG_ITEMS_V1_FINAL). Voir DECISION_LOG D-13 (statut Superseded) pour l'historique
  préservé.
- **Raffinement des familles MOYENNE/FAIBLE** : certaines catégories Poujoulat (gamme THRM
  titane/cuivre) classées par gamme et non par fonction. Raffinement par mot-clé `name` possible
  ultérieurement. Non bloquant.
- **Dimensions non extraites** : diamètre/longueur/angle présents dans `description_fabricant`
  mais non parsés. Extraction Niveau D optionnelle.
- **Fournisseurs non finalisés** : Bofill (config prête, jamais importé), KEMP (dry-run only),
  Modinox/Dix-Neuf/Tubest/Dinak (configs présentes, fichiers non audités), Jeremias
  (multi-variantes, profil spécifique requis), format centralisé multi-marques (profil de parsing
  dédié, hors pilote).
- **Pièces détachées d'appareil** : importables en V1 avec `product_type='part'`. Ce qui est
  reporté en V2 n'est pas l'import des pièces elles-mêmes, mais la **relation structurée
  pièce→appareil** (recherche d'une pièce par appareil compatible). En V1, les pièces se
  recherchent en texte libre. Recommandation pilote : importer les pièces seulement si un besoin
  SAV le justifie dans les 60 premiers jours, pour éviter la pollution de recherche.
- **Colonnes EXTRA mortes** : colonnes orphelines en base, à droper en Phase 7 après bascule
  frontend.

## 10. Ordre d'intervention recommandé

Suivre strictement `CATALOG_EXECUTION_PLAN_V1_FINAL.md`. Résumé :
Phase 1 (ajouts sûrs en base) → 2 (corriger les scripts : item_family, product_type, valid_from)
→ 3 (corriger la RPC) → 4 (dry-run) → 5 (réimport + `_v3` + validation, PUIS NOT NULL) →
6 (bascule Lovable) → 7 (nettoyage).
Prérequis humains avant Phase 2+ : P-00 (matrice fumisterie ✔), P-00b (règle `valid_from` ✔
Option A), P-00c (rotation clé service), P-00d (spec dérivation `product_type` ✔).

**Ordre d'import recommandé pour le pilote, pas une règle structurelle. L'ordre peut varier selon
la disponibilité des fichiers sources.** À titre indicatif, pour atteindre le premier devis
pilote au plus tôt : Joncoux (conduits, mapping prouvé) → LIGNIA prestations (pose) → Poujoulat
(conduits, matrice prête) → un fournisseur d'appareils dès que son fichier source arrive (maillon
manquant du devis complet).

## 11. Définition du « done » (critères de validation end-to-end)

Le succès ne se mesure pas en COUNT. Avant de déclarer un import réussi, les 5 critères du plan
(section 6 du plan d'exécution) doivent être verts : distribution `product_type` non constante +
`item_family` fumisterie à 100 % + `valid_from` à 100 % ; recherche catalogue pertinente ; devis
créé et sauvegardé end-to-end ; remise fournisseur appliquée par `resolve_item_price` ; rapport
P-00 vide.

## 12. Sécurité d'accès (à traiter en priorité)

`import_supplier_direct.py` utilise `SUPABASE_SERVICE_KEY` (clé à privilèges élevés). Cette clé
doit être **tournée** (P-00c) et ne jamais être committée. Vérifier l'historique Git et les
variables d'environnement avant toute reprise.

## 13. En cas de doute

Le modèle est figé : pas de nouveau champ, pas de nouvelle architecture, pas de nouveau périmètre
P1/V2 sans décision explicite. En cas d'ambiguïté, se référer aux documents de la section 2 et au
`DECISION_LOG`. Ne pas reconstruire : auditer d'abord, agir ensuite, snapshot toujours.

---

Figé juin 2026. Document de passation de référence pour le catalogue LIGNIA V1.
