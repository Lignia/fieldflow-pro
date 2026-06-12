# CATALOG — Plan d'exécution V1.1 (non destructif)

> Statut : OFFICIEL — figé juin 2026. Source de séquence pour Claude Exec.
> Modèle cible : voir CATALOG_ITEMS_V1_FINAL.md (vérité métier).
> Principe : aucune destruction avant bascule. Coexistence des versions. Rollback par snapshot + import_batch_id.

---

## 0. Préambule — pourquoi ce plan existe

Le pipeline d'import actuel perd trois informations métier présentes dans la source, entre le
CSV fournisseur et la table `catalog_items`. Constat factuel (détail : voir
`audits/OPENFIRE_PIPELINE_LOSS_AUDIT.md`) :

1. **`item_family`** — la catégorie source (`of_seller_product_category_name`, 127 valeurs chez
   Poujoulat) n'est jamais lue par `map_supplier.py`, donc jamais produite.
2. **`valid_from`** — jamais généré par le pipeline (0 occurrence sur toute la chaîne).
3. **`description_fabricant`** — conservée jusqu'au JSON, puis non persistée dans `catalog_items`
   par la chaîne d'import actuelle.

S'ajoute une quatrième anomalie d'alimentation : **`product_type`** est écrit en valeur
statique par import, au lieu d'être dérivé de la catégorie source. Il doit être dérivé à
l'import (voir Phase 2 et SUPPLIER_MAPPING_STRATEGY_V1).

Conséquence : la correction doit porter sur **trois maillons coordonnés**
(`map_supplier.py` → `import_supplier_direct.py` → RPC `import_supplier_items`). Corriger deux
maillons sur trois ne produit aucun effet en base.

---

## 1. Hypothèses actées (ne plus rediscuter)

- Aucun client/devis/commande/facture réel en base.
- Données Poujoulat/Joncoux/KEMP jetables et réimportables.
- Compatibilité historique NON requise.
- Priorité : simplicité + robustesse.

## 2. Invariants de sécurité (sur tout le plan)

- Aucun `DROP TABLE catalog_items`.
- Aucun vidage de `billing.quote_lines`.
- Aucune suppression d'une RPC ou d'une colonne encore lue.
- Coexistence des versions de RPC (versionnage `_v3`, jamais de modification en place — D-04).
- Rollback par snapshot + `import_batch_id`.
- Bascule frontend (Lovable) AVANT toute suppression de colonne.
- Trigger de recherche recréé SANS `sku` AVANT tout DROP de `sku`.
- Régénération de `types.ts` après toute modification de schéma.

---

## 3. Prérequis bloquants (décision humaine — Thomas)

| Réf | Objet | Décision attendue |
|---|---|---|
| **P-00** | Règle `item_family` Poujoulat | Valider la matrice `of_seller_product_category_name` (127) → `item_family` (13) — voir `suppliers/POUJOULAT_ITEM_FAMILY_MATRIX_V1.md`. Pas de repli silencieux (règle P-00 ci-dessous). |
| **P-00b** | Règle `valid_from` | **ACTÉE — Option A** : date explicite du tarif présente dans le fichier source si disponible ; sinon date d'import (`CURRENT_DATE`) + `data_quality_status='partial'`. |
| **P-00c** | Rotation `SUPABASE_SERVICE_KEY` | La clé service utilisée par `import_supplier_direct.py` doit être tournée avant tout réimport. |
| **P-00d** | Règle de dérivation `product_type` | **ACTÉE — voir SUPPLIER_MAPPING_STRATEGY_V1** : spécification `catégorie source → product_type` par fournisseur. Indéterminable → `data_quality_status='needs_review'`, jamais de défaut statique. |

### Règle P-00 — catégorie source inconnue (pas de fallback silencieux)

Une catégorie source absente de la matrice ne doit JAMAIS être classée silencieusement.
Comportement imposé : (1) l'item n'est pas importé comme famille « devinée » ;
(2) `data_quality_status='needs_review'` ; (3) rapport d'import listant toute catégorie
non cartographiée (valeur brute + nombre d'articles), à traiter avant verrouillage de phase.
Cette règle vaut pour les **articles fumisterie**. Les appareils et pièces d'appareil ne sont
pas concernés par l'obligation `item_family` (voir R-03 / I-04 du modèle).

Tant que P-00 et P-00c ne sont pas tranchés, les phases 2+ restent NO GO.

---

## 4. Séquence d'exécution

### PHASE 1 — Ajouts sûrs en base (Exec) — GO indépendant des prérequis
- Ajouter les 5 colonnes V1 manquantes : `is_obsolete`, `review_reason`, `image_url`,
  `technical_doc_url`, `raw_metadata`.
- Ajouter les 2 CHECK de longueur prévus au modèle (`warning_message`, `review_reason` ≤ 200).
- Passer NOT NULL les colonnes sans aucune valeur nulle. État vérifié en lecture seule
  (juin 2026) : `name`, `unit_price_ht`, `vat_rate`, `unit`, `is_sellable`, `is_purchasable`,
  `is_labor`, `is_kit`, `discount_allowed`, `supplier_name` — 0 NULL. Re-vérifier ces comptages
  juste avant d'appliquer la contrainte si des imports ont eu lieu entre-temps.
- Passer NULLABLE `catalog_id` et `has_dta` (V1 les veut optionnels).
- **NO GO** sur NOT NULL de `item_family`, `valid_from`, `supplier_ref` à ce stade.

### PHASE 2 — Correction pipeline, étape script (Script) — après P-00 / P-00b / P-00d
- `map_supplier.py` : LIRE `of_seller_product_category_name`, appliquer la matrice,
  SÉRIALISER `item_family` dans le dict `item`. Catégorie inconnue (fumisterie) → règle P-00.
- `map_supplier.py` : DÉRIVER `product_type` depuis la catégorie source selon la spec de
  mapping (SUPPLIER_MAPPING_STRATEGY_V1, C-1). Ne plus écrire de valeur statique.
- `map_supplier.py` : DÉRIVER `appliance_type` pour les appareils (valeurs contraintes par
  le CHECK `catalog_items_appliance_type_check`).
- `map_supplier.py` : PRODUIRE `valid_from` selon P-00b (Option A : date source sinon date
  d'import + `data_quality_status='partial'`).
- `import_supplier_direct.py` : ajouter `valid_from` à `SAFE_FIELDS` (`item_family` y est déjà).

### PHASE 3 — Correction pipeline, étape base (Exec)
- Versionner la RPC d'import pour qu'elle PERSISTE `item_family`, `valid_from`, `product_type`
  (et, si décidé, `description_fabricant`). Nouvelle version, ancienne conservée.

### PHASE 4 — Validation à blanc (Script)
- Dry-run Joncoux puis Poujoulat : vérifier dans le JSON la présence de `item_family`
  (fumisterie), `valid_from`, un `product_type` dérivé (non constant), et l'absence de
  catégorie fumisterie non cartographiée. Aucune écriture base.

### PHASE 5 — Réimport + validation + verrouillage (Exec + Script) — snapshot obligatoire avant
Ordre strict (le verrouillage NOT NULL vient APRÈS la validation par `_v3`) :
1. Snapshot Supabase + conservation du JSON d'import et de l'`import_batch_id` sortant.
2. Purger le lot existant (`import_batch_id` connu) puis réimporter via la chaîne corrigée.
   **Les lignes `source_system='ADMIN_UPLOAD'` (prestations LIGNIA sans `supplier_ref` ; voir
   D-18 pour l'`import_batch_id` exact) sont exclues de la purge par `import_batch_id` et
   archivées séparément via `is_active=false`.** Elles ne sont pas réimportables par le
   pipeline fournisseur (pas de CSV source, pas de `supplier_ref`).
3. Créer `search_quote_items_v3` (sur `item_family` + `product_type` + `appliance_type` +
   dimensions), en coexistence avec `_v2`. Validation de `item_family` portée à 100 % sur la
   fumisterie ; dimensions best-effort nullable.
4. **Valider les données via `_v3`** : couverture `item_family` fumisterie à 100 %,
   `product_type` réparti (plus jamais constant), rapport P-00 vide. Tant que cette validation
   n'est pas concluante, le schéma reste déverrouillé.
5. SEULEMENT APRÈS validation concluante : passer `valid_from` et `supplier_ref` NOT NULL
   (vérifier d'abord « 0 NULL `supplier_ref` tous fournisseurs », les lignes `supplier_ref`
   vide connues doivent être traitées). **`item_family` n'est PAS rendue NOT NULL globalement** :
   son obligation reste conditionnée à la fumisterie (voir R-03 / I-04 du modèle) ; la clause
   `OR item_family IS NULL` du CHECK est **conservée**.

### PHASE 6 — Bascule frontend (Lovable) — AVANT toute suppression de colonne
- `useCatalogSearch` → `search_quote_items_v3`.
- Retirer les lectures de `cost_price` et `sku` côté frontend.
- `deleteItem` → archivage (`is_obsolete=true` / `is_active=false`), suppression de la
  suppression physique.
- **TVA — règle figée** : seule source du taux = `catalog_items.vat_rate` (valeur par défaut
  surchargeable au devis). Aucune logique TVA côté frontend, aucune heuristique, aucune
  déduction depuis `product_type`. `suggestedVat()` est découplé de `product_type` et ne fait
  que lire `vat_rate`. Voir `D-25_TVA_catalogue_doctrine.md` et D-24.
- Régénérer `types.ts` puis rebuild.

### PHASE 7 — Nettoyage (Exec) — ordre strict
- Recréer le trigger `t9_refresh_item_search_vector` SANS référence à `sku`.
- SEULEMENT ENSUITE : DROP des colonnes EXTRA devenues mortes.
- Archiver les RPC legacy (`search_quote_items`, ancienne version d'import).
- Phase irréversible : snapshot dédié avant exécution.

---

## 5. Tableau GO / NO GO par phase

| Phase | Dépend de | Destructif ? | Snapshot requis ? |
|---|---|---|---|
| 1 | — | Non | Non |
| 2 | P-00, P-00b, P-00d | Non (script) | Non |
| 3 | Phase 2 | Non (versionnage) | Non |
| 4 | Phase 3 | Non (dry-run) | Non |
| 5 | Phases 1-4, P-00c | Oui (purge/réimport, NOT NULL) | **Oui** |
| 6 | Phase 5 | Non (frontend) | Non |
| 7 | Phase 6 | Oui (DROP colonnes) | **Oui** |

---

## 6. Critères de validation end-to-end (définition du « done »)

Le succès ne se mesure pas seulement en COUNT. Avant de déclarer une phase d'import réussie :

1. **Distribution** : `product_type` n'est plus constant ; `item_family` couvre 100 % de la
   fumisterie importée ; `valid_from` renseigné à 100 %.
2. **Recherche** : une recherche catalogue sur un terme fumisterie (ex. « conduit 150 »)
   renvoie des résultats pertinents via `search_quote_items_v3`.
3. **Devis end-to-end** : un devis peut être créé, une ligne ajoutée depuis le catalogue, et
   sauvegardé sans erreur.
4. **Pricing** : la remise fournisseur (ex. Joncoux) est correctement appliquée par
   `resolve_item_price` sur une ligne de devis.
5. **Rapport P-00** vide (aucune catégorie fumisterie non cartographiée non traitée).

Tant que ces 5 critères ne sont pas tous verts, le déploiement n'est pas « done ».

---

## 7. Points de rupture connus (à respecter absolument)

- Le trigger de recherche lit `sku` : NE PAS droper `sku` avant recréation du trigger (Phase 7).
- `resolve_item_price` est conforme V1 et intacte : ne pas la modifier (D-05).
- `replace_quote_lines` ne lit pas `catalog_items` : `customer_label` vient du jsonb, sa
  suppression côté catalogue est sans risque.
- `suggestedVat()` dépend aujourd'hui de `product_type` : à découpler en Phase 6, avec
  `vat_rate` comme source unique.
- Lignes à `supplier_ref` vide connues : à traiter avant le NOT NULL `supplier_ref` (Phase 5).

---

Figé juin 2026. Référence de séquence unique pour l'exécution V1.1.
