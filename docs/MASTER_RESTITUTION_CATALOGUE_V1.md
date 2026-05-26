# MASTER RESTITUTION LIGNIA — Catalogue V1 (Analyse Critique)

> Produit par Claude Analytics — post-LOT 0 — 26 mai 2026  
> Référence pour les prochaines semaines. Lecture en 10 minutes.

---

## 1. Vision et Objectif V1

LIGNIA catalogue V1 = un pipeline fiable CSV fournisseur → `catalog_items` → devis artisan.  
L'objectif n'est pas un PIM complet ni un ERP. C'est un catalogue exploitable pour trois opérations : recherche rapide d'un article, création d'une ligne devis avec snapshot de prix, et futur bon de commande fournisseur.  
Tout ce qui dépasse ce périmètre est Phase 2 ou Phase 3.

---

## 2. Invariants Runtime à préserver absolument

1. `catalog_items.unit_price_ht` = prix public uniquement. Jamais prix achat.
2. `catalog_items.cost_price` = NULL à l'import. Toujours. Jamais écrit par `import_supplier_items`.
3. `resolve_item_price` = source unique du calcul du prix net artisan. Ne jamais dupliquer cette logique ailleurs.
4. `quote_lines` = snapshots immuables. Une ligne de devis ne se recalcule jamais depuis le catalogue.
5. `supplier_ref` = identité commerciale fournisseur. Pas d'équivalence cross-distributeur en V1.
6. Doublons cross-distributeurs = acceptés. Un même produit physique peut avoir N lignes si N distributeurs.
7. TVA = décidée au runtime devis. Jamais à l'import. `vat_rate` dans le catalogue = valeur indicative par défaut.
8. `search_quote_items_v2` = intouchable. RPC de recherche stable.
9. `replace_quote_lines` = intouchable. Seul point d'écriture des devis.
10. `import_supplier_items` = pipeline JSON → row. Pas un moteur de décision métier.

---

## 3. État actuel du projet

### Scripts Python
- `scripts/map_supplier.py` — SHA `5b22bbd4` — **commité, stable, frozen**.
- Couvre : joncoux, modinox, bofill, poujoulat, dixneuf, tubest, dinak, kemp (dry-run only), jeremias (hors scope).
- Produit un JSON aligné avec le contrat RPC post-LOT 0.

### Supabase — LOT 0 appliqué
- Migration `lot0_uq_catalog_items_tenant_supplier_ref` : index unique `(tenant_id, supplier_name, supplier_ref)` partiel — ✅ appliqué.
- Migration `lot0_import_supplier_items_v2` : RPC réécrite, 6/6 tests verts — ✅ appliqué.
- `resolve_item_price` : signature `(p_item_id uuid, p_tenant_id uuid, p_purchase_supplier_name text DEFAULT NULL)` — intact, non modifié.

### Données en base
- 6 093 articles Joncoux existants importés via un autre chemin (non via `import_supplier_items`).
- Leur `supplier_ref` = EAN barcode Lorflex. Pas le Code interne Joncoux.
- Archive `_archive_joncoux_legacy_20260520` présente comme filet de sécurité.

---

## 4. Problèmes critiques identifiés

### 🚨 Critiques — bloquants avant import réel

**C1 — Doublon garanti sur les 6 093 Joncoux lors du premier import réel**  
Les 6 093 Joncoux existants ont `supplier_ref = EAN_BARCODE`. Le script enverra `supplier_ref = code_interne_joncoux` (ex: `A APA060035`). Aucun match en base → 6 093 INSERTs supplémentaires → 12 186 articles Joncoux.  
Vérification avant import :
```sql
SELECT supplier_ref, COUNT(*)
FROM catalog.catalog_items
WHERE supplier_name = 'Joncoux' AND tenant_id IS NOT NULL
GROUP BY supplier_ref LIMIT 10;
```
Si les `supplier_ref` sont des EAN → incompatibilité confirmée. Décision à prendre : archiver les anciens ou aligner les clés.

**C2 — Colonne `description` peut être NOT NULL sans default dans `catalog_items`**  
La nouvelle RPC ne l'inclut plus dans l'INSERT. Si NOT NULL sans default → chaque INSERT en production plantera.  
Vérification :
```sql
SELECT is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'catalog'
  AND table_name = 'catalog_items'
  AND column_name = 'description';
```

**C3 — `CONTINUE WHEN v_supplier_ref_key IS NULL` non compté dans `v_skipped`**  
Si une ligne du JSON n'a ni `supplier_ref` ni `ean`, elle est silencieusement ignorée. Le résultat retourné montrera `skipped: 0` mais des lignes auront disparu.  
Correction minimale : ajouter `v_skipped := v_skipped + 1;` avant ce CONTINUE.

### ⚠️ Moyens — à corriger avant mise en production commerciale

**M1 — `unit = 'u'` pour tous les articles au mètre**  
Les conduits flexibles vendus au mètre seront importés avec `unit = 'u'`. Les bons de commande générés depuis les devis auront des quantités fausses ("3 unités" au lieu de "3 mètres").  
Correction : le script peut progressivement envoyer `"unit": "m"` pour les articles concernés. La RPC valide déjà contre l'enum.

**M2 — Pas de rollback par batch opérationnel**  
`import_batch_id` est écrit en base mais aucune fonction de rollback n'existe. Si un import produit des données fausses, la correction est manuelle via Supabase Studio.

**M3 — `source_file` représente le dernier import, pas le premier**  
À l'UPDATE, `source_file = COALESCE(nouveau, existant)` écrase l'ancien si le nouveau est fourni. L'historique d'origine est perdu. Acceptable V1 mais à documenter.

**M4 — `sku` et `sku_code` NULL sur tous les articles importés**  
Le script n'envoie pas `article_ref` ni `article_code`. Ces colonnes seront NULL. Si des queries utilisent `WHERE sku IS NOT NULL`, les articles importés n'apparaîtront pas.

**M5 — Remises à configurer avant les premiers devis réels**  
`resolve_item_price` retourne `no_discount_configured` si aucune remise n'est dans `tenant_supplier_discounts`. L'artisan verra le prix public sans remise. Les remises doivent être saisies avant le premier devis client.

### 🟡 Mineurs — dettes acceptées V1

**m1 — `ean` obligatoire comme condition de skip dans le script Python**  
`if not ean: return None, "missing_ean"`. Des articles sans EAN mais avec `supplier_ref` valide seront perdus. Affecte les imports futurs de fournisseurs sans EAN systématique.

**m2 — `ignored_field_names` répété sur chaque ligne du JSON**  
Payload RPC inutilement verbeux sur les imports massifs. Non bloquant.

**m3 — `product_type = 'part'` pour tous les articles sans exception**  
Un poêle Poujoulat importé via le script aura `product_type = 'part'`. Les filtres futurs par type de produit seront faux jusqu'à enrichissement manuel.

**m4 — Voix future : doublons Joncoux = deux résultats pour un même conduit**  
Si le doublon C1 n'est pas résolu, `search_quote_items_v2` retournera deux versions du même conduit. Le moteur voix ne pourra pas choisir.

---

## 5. Recommandations d'action immédiate

### LOT 0 — Déjà fait ✅
- Index unique tenant appliqué.
- RPC réécrite, alignée avec le script Python.
- 6/6 tests verts.

### P1 — Avant tout import réel (cette semaine)

1. Vérifier C2 : `description` nullable — 1 SELECT, 2 minutes.
2. Corriger C3 : ajouter `v_skipped := v_skipped + 1` avant le CONTINUE — patch chirurgical RPC.
3. Vérifier C1 : `supplier_ref` des 6 093 Joncoux — 1 SELECT, décision architecture.
4. Si C1 confirmé : archiver les 6 093 Joncoux ou aligner les clés avant import.

### P2 — Avant premier client réel

5. Configurer les remises dans `tenant_supplier_discounts` pour chaque fournisseur.
6. Identifier les articles au mètre et corriger `unit` dans le script ou via update SQL.
7. Créer une fonction `rollback_import_batch(batch_id uuid, tenant_id uuid)` simple.

---

## 6. Champs à anticiper maintenant (nullable, Pareto)

Ces colonnes n'existent peut-être pas encore dans `catalog_items`. Elles sont utiles sans être urgentes. Toutes nullable, aucune logique métier.

| Champ | Type | Utilité | Priorité |
|---|---|---|---|
| `distributor_name` | text | Pricing multi-distributeur | P1 — dans la RPC déjà |
| `manufacturer_name` | text | Recherche par fabricant | P1 — dans la RPC déjà |
| `import_batch_id` | uuid | Rollback par batch | P1 — dans la RPC déjà |
| `source_file` | text | Audit import | P1 — dans la RPC déjà |
| `tarif_price_source_column` | text | Debug import | P2 — RPC l'ignore en V1 |
| `unit` | unit_type | Bon de commande | P1 — dans la RPC déjà |

---

## 7. Ce qui doit rester hors V1

- **Matching cross-distributeurs** : équivalence automatique entre un article Poujoulat et le même chez Joncoux.
- **Moteur de compatibilité dimensions** : vérification automatique qu'un Ø150 s'assemble avec un Ø150.
- **Classification automatique** : `product_type`, `item_family` déduits par IA depuis le libellé.
- **Jeremias multi-variantes** : script dédié `map_jeremias.py` requis, hors scope générique.
- **ServiceTitan sync** : API pricebook V2 documentée, Phase 3 minimum.
- **installed-equipment tracking** : suivi des appareils posés chez les clients, Phase 3.
- **Prix achat dans le catalogue** : `cost_price` reste NULL. Toujours.
- **TVA intelligente à l'import** : déduction TVA depuis le type de produit ou le chantier.
- **search_keywords enrichi côté SQL** : le script construit les keywords, la RPC persiste.

---

## 8. Prompts à poser à Claude Read (lecture seule Supabase + GitHub)

**Avant import Joncoux :**
```
Lire catalog.catalog_items.
Pour supplier_name = 'Joncoux' et tenant_id IS NOT NULL,
afficher les 10 premières valeurs de supplier_ref.
Sont-elles des EAN barcodes ou des codes type 'A APA060035' ?
Compter combien ont supplier_ref NULL.
```

**Vérifier description nullable :**
```
Exécuter :
SELECT is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'catalog'
  AND table_name = 'catalog_items'
  AND column_name = 'description';
```

**Vérifier la RPC après correction C3 :**
```
Lire le corps de catalog.import_supplier_items.
Vérifier que le bloc CONTINUE WHEN v_supplier_ref_key IS NULL
incrémente v_skipped avant de continuer.
```

**Vérifier l'état du catalogue après premier import test :**
```
SELECT supplier_name, COUNT(*), COUNT(cost_price),
  MIN(unit_price_ht), MAX(unit_price_ht),
  COUNT(DISTINCT supplier_ref)
FROM catalog.catalog_items
WHERE tenant_id = 'TON_TENANT_UUID'
GROUP BY supplier_name;
```

**Vérifier resolve_item_price sur un article réel Joncoux :**
```
SELECT catalog.resolve_item_price(
  ci.id, ci.tenant_id, 'Joncoux'
)
FROM catalog.catalog_items ci
WHERE supplier_name = 'Joncoux'
  AND tenant_id = 'TON_TENANT_UUID'
LIMIT 1;
```

---

## 9. Roadmap V1 — 5 lots chronologiques

### LOT 0 — Alignement RPC ✅ FAIT
Index unique + RPC réécrite + 6 tests verts.  
*Durée réelle : 1 session.*

### LOT 1 — Corrections P1 pré-import
- Corriger C2 (description nullable).
- Corriger C3 (skipped counter).
- Résoudre C1 (doublon Joncoux) : archiver ou aligner.
- 1 migration SQL. 1 session Claude Exec.

### LOT 2 — Premier import réel (dry-run + 20 lignes)
- Convertir un fichier fournisseur en CSV UTF-8-sig.
- Lancer `map_supplier.py --dry-run`.
- Valider taux ignoré < 5%, prix cohérents.
- Importer 20 lignes sur un tenant de staging.
- Valider `resolve_item_price` sur 3 articles réels.

### LOT 3 — Import massif fournisseurs
- Ordre : Joncoux → Modinox → Bofill → Poujoulat → Dixneuf → Tubest → Dinak.
- Dry-run obligatoire par fournisseur avant import.
- Inspecter `.skipped.json` avant chaque import.
- Configurer remises dans `tenant_supplier_discounts` après chaque fournisseur.

### LOT 4 — Frontend catalogue et devis
- `AddLineDrawer` : branchement articles fumisterie.
- Afficher : libellé, référence fournisseur, fournisseur/distributeur, prix public, prix achat calculé, marge, TVA éditable.
- Ne pas exposer : `import_batch_id`, `source_file`, colonnes techniques.
- Snapshot obligatoire à l'ajout de ligne.

### LOT 5 — Backfill et enrichissement
- Backfill `search_keywords` sur les 6 093 Joncoux existants.
- Formule canonique SQL :
```sql
TRIM(CONCAT_WS(' ',
  normalized_name, supplier_range, technology_type,
  component_role,
  CASE WHEN diameter_inner_mm IS NOT NULL
    THEN 'Ø' || diameter_inner_mm::text ELSE NULL END,
  item_family
))
```
- Corriger `unit` sur les articles au mètre.
- Enrichissement progressif `product_type` par famille.

---

## Règle d'or

```
Backend = stable, bête, idempotent
Script   = mapping explicite par fournisseur
Frontend = UX simple pour l'artisan
Devis    = snapshot fort, jamais recalculé
IA/voix  = plus tard
```

---

*Document vivant — à mettre à jour après chaque LOT complété.*
