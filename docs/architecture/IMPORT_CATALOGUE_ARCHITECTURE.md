# Architecture d'import catalogue LIGNIA
> Claude Analytics — Mai 2026
> Basé sur : audit Supabase, lecture complète de map_supplier.py, roadmap v3.4
> Objectif : 100 fournisseurs, 50 000 références chacun, mise à jour annuelle
> Compatible solo founder non-développeur

---

## 1. ARCHITECTURE CIBLE

### Vue d'ensemble

```
FICHIER FOURNISSEUR
(CSV/XLSX livré par le fournisseur)
      ↓
  [CODESPACES]
  map_supplier.py
  (transformation + validation)
      ↓
  supplier_import.json
  (fichier intermédiaire validé)
      ↓
  import_supplier_direct.py
  (envoi par chunks vers Supabase)
      ↓
  [SUPABASE]
  RPC catalog.import_supplier_items
  (upsert idempotent par supplier_ref)
      ↓
  catalog.catalog_items
  (table unique, multi-fournisseurs, multi-tenants)
      ↓
  catalog.import_runs
  (log de chaque import — à créer en V2)
```

### Principes invariants

```
INVARIANT 1   supplier_ref = code brut fournisseur, jamais modifié
INVARIANT 2   cost_price = NULL toujours (contrainte SQL CHECK active)
INVARIANT 3   unit_price_ht = prix public uniquement
INVARIANT 4   import_batch_id UUID unique par campagne d'import
INVARIANT 5   Upsert idempotent : réimporter = safe
INVARIANT 6   Articles disparus : is_active=false (jamais DELETE)
```

### Table centrale : catalog.catalog_items

```
Champs identité :
  supplier_ref          CODE BRUT fournisseur (unique par supplier_name)
  supplier_name         Distributeur (ex: Lorflex, Poujoulat)
  manufacturer_name     Fabricant réel (ex: Joncoux, Dinak)
  catalog_domain        FUMISTERIE | APPAREIL | PRESTATION | PIECE_DETACHEE
  import_batch_id       UUID de la campagne d'import
  is_active             true = visible, false = archivé

Champs prix :
  unit_price_ht         Prix public HT (INVARIANT 3)
  cost_price            TOUJOURS NULL (contrainte CHECK)
  vat_rate              TVA (20% ou 5.5%)

Champs recherche :
  normalized_name       Libellé normalisé
  search_keywords       Concaténation pour fulltext
  search_vector         tsvector (généré auto)
  technology_type       Techno construction (double paroi, concentrique...)
  diameter_inner_mm     Diamètre intérieur en mm
  angle_deg             Angle en degrés
  supplier_family_code  Famille commerciale fournisseur
  catalog_domain        Domaine produit

Champs traçabilité :
  import_batch_id       UUID de la campagne
  normalization_status  needs_review | ai_normalized | validated
  created_at            Date de création
  updated_at            Date de mise à jour
```

### Table de log : catalog.import_runs (à créer V2)

```
Champs :
  id UUID
  supplier_name text
  batch_id UUID
  started_at timestamptz
  finished_at timestamptz
  status text  -- running | completed | failed | rolled_back
  count_inserted int
  count_updated int
  count_archived int
  count_skipped int
  price_min numeric
  price_max numeric
  operator text  -- qui a lancé l'import
  notes text
```

### Remises : catalog.tenant_supplier_discounts

```
Champs :
  tenant_id UUID
  supplier_name text
  manufacturer_name text
  family_label text
  bareme_code text
  discount_pct numeric
  is_active boolean

Hiérarchie de fallback dans resolve_item_price :
  1. Remise par article exact (supplier_ref)
  2. Remise par famille (family_label)
  3. Remise par distributeur (distributor_name)
  4. Remise globale fournisseur (supplier_name)
```

---

## 2. WORKFLOW OPÉRATEUR

### Vue globale (non-développeur)

```
Étape 1 — Réception du fichier fournisseur
  Poujoulat envoie : poujoulat_2027.csv (ou .xlsx)
  Convertir si xlsx : Fichier > Enregistrer sous > CSV UTF-8 dans Excel
  Placer dans Codespaces à la racine du projet

Étape 2 — Vérification préalable (dry-run)
  python scripts/map_supplier.py poujoulat_2027.csv poujoulat --dry-run
  Lire le rapport sur 5 lignes :
    items valides    : 16 529
    items ignorés    : 12
    taux ignoré      : 0.1%
    prix min         : 2.17
    prix max         : 8096.50
  Si taux ignoré > 10% → STOP, investiguer le fichier source

Étape 3 — Génération du JSON
  python scripts/map_supplier.py poujoulat_2027.csv poujoulat > poujoulat_2027.json
  Le batch_id est généré automatiquement et unique

Étape 4 — Import en base
  python scripts/import_supplier_direct.py \
    poujoulat_2027.json Poujoulat [tenant_id]
  Progression affichée chunk par chunk (200 articles)
  STOP automatique si erreur RPC

Étape 5 — Vérification post-import
  Le script affiche automatiquement :
    COUNT total = 16 529
    COUNT cost_price = 0
    MIN unit_price_ht = 2.17€
    MAX unit_price_ht = 8096.50€
  Comparer avec les valeurs du dry-run : doivent correspondre

Étape 6 — Activer (si mise à jour)
  Les prix sont actifs immédiatement après l'import
  Les articles archivés (is_active=false) sont invisibles dans la recherche
```

### Un fournisseur inconnu — première intégration

```
Prérequis :
  1. Ouvrir le CSV dans Excel, identifier les colonnes
  2. Ajouter le fournisseur dans SUPPLIER_CONFIGS (map_supplier.py)
     — copier-coller un bloc existant (ex: poujoulat)
     — ajuster les noms de colonnes
     — tester avec --dry-run
  3. Valider le dry-run (taux ignoré < 10%)
  4. Importer
  5. Configurer la remise dans tenant_supplier_discounts
  Effort : 1-2h pour un fournisseur au format standard

Formats supportés :
  CSV UTF-8 ou UTF-8-sig, séparateur virgule ou point-virgule
  XLSX : convertir en CSV d'abord (map_supplier.py le détecte et guide)
  Encodage mojibake : géré automatiquement si fix_mojibake_labels=True
```

---

## 3. PROCESSUS DE MISE À JOUR TARIFAIRE

### Cycle annuel (le cas le plus fréquent)

```
Chaque année, le fournisseur envoie son nouveau tarif.
Exemple : Poujoulat 2027 arrive en janvier 2027.

Processus :
  1. Dry-run du nouveau fichier → vérifier volumes et prix
  2. Générer poujoulat_2027.json (nouveau batch_id)
  3. Comparer V2 : voir section détaillée ci-dessous
  4. Valider et importer
  5. Les articles du batch précédent restent visibles
     (leur import_batch_id est simplement plus ancien)
  6. Articles disparus du nouveau tarif → is_active=false automatique
```

### Comparaison N vs N+1 (V2)

```
Objectif :
  Avant d'activer un nouveau tarif, l'opérateur voit :
    - Articles nouveaux : 127 nouvelles références
    - Articles archivés : 43 références disparues
    - Hausses > 15% : 8 articles (alerte)
    - Hausses < 15% : 234 articles
    - Baisses : 12 articles
    - Inchangés : 16 115 articles

Implémentation V2 — commande unique :
  python scripts/compare_tariffs.py \
    batch_2026=f90d6354 \
    batch_2027=5cb97563 \
    --supplier=Poujoulat
  → rapport JSON + rapport CSV lisible dans Excel

Règles de décision :
  Si hausses > 15% sur plus de 5% des articles : alerte opérateur
  Si taux articles disparus > 10% : alerte (mise à jour partielle ?)
  Si tout OK : GO automatique, activer le nouveau batch

Donnees disponibles dès V1 (pas besoin de migration) :
  import_batch_id sur chaque article ✅
  is_active sur chaque article ✅
  unit_price_ht sur chaque article ✅
  supplier_ref (clé de jointure entre les deux batches) ✅
```

### Rollback

```
Si un import produit des résultats incorrects :

  -- Rollback du batch concerné
  UPDATE catalog.catalog_items
    SET is_active = false
    WHERE import_batch_id = 'batch_uuid_à_annuler';

  -- Réactiver le batch précédent
  UPDATE catalog.catalog_items
    SET is_active = true
    WHERE import_batch_id = 'batch_uuid_précédent'
      AND supplier_name = 'Poujoulat';

  Les devis signés ne sont pas affectés (snapshots immuables).
  Les devis en brouillon reprennent les prix au prochain recalcul.
```

---

## 4. GESTION DES ERREURS

### Erreurs en phase map_supplier.py

```
ERREUR                      SYMPTOME                CORRECTION
missing_ean                 Article ignoré           Vérifier supplier_ref_candidates
missing_name                Article ignoré           Vérifier name_column
missing_tarif_price         Article ignoré           Vérifier tarif_price_candidates
duplicate_ean_in_file       Article ignoré           Doublon dans le CSV source
Taux ignoré > 10%          ABORT                    Mapping à corriger
Fichier XLSX                ABORT avec guide         Convertir en CSV d'abord
Encodage mojibake           Libéllés corrompus       fix_mojibake_labels=True
```

### Erreurs en phase import_supplier_direct.py

```
ERREUR                      SYMPTOME                CORRECTION
RPC retourne erreur         STOP immédiat           Lire le message Supabase
cost_price non NULL         STOP immédiat           Bloqué par contrainte CHECK
COUNT post-import incorrect STOP + alerte           Rollback, relancer
Chunk partiel               Idempotent, relancer    Relancer le même fichier
Time-out Supabase           Chunk à retenter        Idempotent, relancer
```

### Comportement idempotent

```
Règle fondamentale : importer deux fois le même fichier = safe.
La RPC import_supplier_items fait un UPSERT sur supplier_ref + supplier_name.
Si l'article existe : prix mis à jour, import_batch_id mis à jour.
Si l'article n'existe pas : créé.
Si chunk 34/83 échoue : relancer depuis le début, zéro risque de doublon.
```

### Champs sensibles protégés

```
Liste DANGEROUS_EXACT dans map_supplier.py :
  prix_achat, net_client, remise_raw, cost_price, net_price,
  prix_net, discount_pct, purchase_price, remise...

Détection automatique : si une colonne CSV ressemble à un prix d'achat,
elle est signalée dans ignored_field_names du JSON.
Contrainte SQL CHECK garantit que cost_price ne peut jamais être rempli.
```

---

## 5. PLAN V1 PUIS V2

### V1 — Opérationnel maintenant (ce qui existe ou presque)

```
PIPELINE EXISTANT :
  map_supplier.py        ✅ codé, 9 fournisseurs configurés
  import_supplier_direct.py  ❌ à créer (30 min, prompt Claude Exec)
  import_supplier_items RPC  ✅ opérationnelle (catalog + public)
  catalog_items table    ✅ 112 colonnes, prête
  CHECK cost_price=NULL  ✅ active
  tenant_supplier_discounts  ✅ prête

FONCTIONNALITÉS V1 :
  Import d'un nouveau fournisseur en 3 commandes
  Mise à jour annuelle en 3 commandes (même pipeline)
  Rollback par batch_id (manuel, 2 UPDATE SQL)
  Validation dry-run avant import
  Détection automatique champs sensibles
  Rapport post-import (COUNT + MIN/MAX prix)

LIMITES V1 acceptées :
  Pas de comparaison N/N+1 automatisée (manuelle par Excel)
  Pas de log des imports (audit manuel)
  Pas de catalog_domain dans map_supplier.py (valeur par défaut 'FUMISTERIE')
  XLSX : conversion manuelle requise
```

### V2 — Après validation 5 pilotes

```
FONCTIONNALITÉS V2 (ordre de priorité) :

  1. catalog.import_runs
     Table de log de chaque import
     Qui, quand, combien, statut, batch_id
     Effort : S (migration + 5 lignes dans import_supplier_direct.py)

  2. catalog_domain dans map_supplier.py
     Ajouter catalog_domain dans SUPPLIER_CONFIGS
     DEFAULT 'FUMISTERIE' pour tous les fournisseurs fumisterie
     Effort : S (patch 10 lignes)

  3. compare_tariffs.py
     Script de comparaison batch N vs N+1
     Rapport : nouveaux, archivés, hausses, baisses, inchangés
     Effort : M (script Python nouveau, 2-3h)

  4. supplier_family_code dans map_supplier.py
     Lire la famille commerciale depuis le CSV
     Permet les remises par famille (Lorflex : 15 familles)
     Effort : S (ajout colonne dans SUPPLIER_CONFIGS)

  5. Normalisation technology_type
     Aujourd'hui null pour Poujoulat
     Job de normalisation batch post-import
     Effort : M (script + table de correspondance)

  6. Support XLSX natif
     Ajouter openpyxl dans requirements.txt
     Lire .xlsx directement dans map_supplier.py
     Effort : S (20 lignes)

  7. Archivage automatique articles disparus
     Si supplier_ref présent dans l'ancien batch
     mais absent du nouveau → is_active=false automatique
     Actuellement : archivage manuel
     Effort : S (option dans import_supplier_direct.py)

  8. UI SUPER_ADMIN monitoring
     Tableau de bord : fournisseur | articles | dernier import | batch_id
     Source : catalog.import_runs
     Effort : M (page Lovable)
```

### V3 — Hors scope maintenant

```
  LIGNIA Manufacturer : portail fournisseur publie lui-même
  API push temps réel (webhooks fournisseurs)
  Normalisation IA (GPT-4 pour technology_type depuis le libellé)
  Catalogue SAV fabricants (MCZ, Edilkamin... 200k+ références)
```

---

## VOLUMES ET PERFORMANCES

```
VOLUMES CIBLES :
  100 fournisseurs max
  20 actifs par artisan en moyenne
  50 000 références par fournisseur max
  5 000 000 lignes au maximum absolu

PERFORMANCES ATTENDUES :
  Import 16 529 articles Poujoulat : < 5 minutes (83 chunks × 200)
  Import 50 000 articles : < 15 minutes
  Recherche catalog_items : < 500ms (index search_vector + catalog_domain)
  resolve_item_price : < 300ms par article

INDEX CRITIQUES (actifs ou à créer) :
  search_vector (GIN, fulltext) ✅
  (catalog_domain, supplier_name, is_active) — à créer S2-T1
  (tenant_id, supplier_name) sur tenant_supplier_discounts ✅
  (supplier_ref, supplier_name) unicité ✅

POSTGRES SUPABASE :
  5 000 000 lignes dans catalog.catalog_items = gérable sans architecture spéciale
  Le filtre catalog_domain divise le volume de recherche par 4
  Le filtre fournisseurs actifs par tenant divise encore par 5
  Volume effectif par requête : 100k-200k lignes max
```

---

## MATRICE FOURNISSEURS SUPPORTÉS

```
FOURNISSEUR        STATUT V1    DISTRIBUTOR       MOJIBAKE    NOTES
Poujoulat          ✅ prêt       —                 non         Format Odoo standard
Joncoux            ✅ prêt       Lorflex           oui         Prix 2026 configuré
Lorflex            ✅ prêt       Lorflex           oui         manufacturer_name_column="frs"
Modinox            ✅ prêt       —                 non         Format Odoo
Bofill             ✅ prêt       —                 non         Format Odoo
Dix-Neuf           ✅ prêt       —                 non         Format Odoo
Tubest             ✅ prêt       —                 non         Format Odoo
Dinak              ✅ prêt       —                 non         supplier_ref=supplier_ref
KEMP               ⚠️ dry-run    —                 non         dry_run_only=True
Jérémias           ❌ non supporté  —                non         Multi-variantes incompatible

SUIVANTS À INTÉGRER :
  Chaque nouveau fournisseur = 1 bloc dans SUPPLIER_CONFIGS
  Test dry-run obligatoire avant tout import réel
  Effort : 30 min (format standard) à 2h (format exotique)
```

---

## COMMANDES DE RÉFÉRENCE

```bash
# Vérification avant import (toujours commencer par là)
python scripts/map_supplier.py poujoulat_2027.csv poujoulat --dry-run

# Génération JSON
python scripts/map_supplier.py poujoulat_2027.csv poujoulat > poujoulat_2027.json

# Import en base
python scripts/import_supplier_direct.py \
  poujoulat_2027.json Poujoulat dbd5a19f-9d11-4ba8-93f7-046b642192ed

# Vérification post-import
SELECT supplier_name, COUNT(*), MIN(unit_price_ht), MAX(unit_price_ht)
FROM catalog.catalog_items
WHERE supplier_name = 'Poujoulat' AND is_active = true
GROUP BY supplier_name;

# Rollback d'un batch
UPDATE catalog.catalog_items
  SET is_active = false
  WHERE import_batch_id = 'uuid-du-batch-à-annuler';

# Vérifier les articles archivés
SELECT supplier_name, COUNT(*)
FROM catalog.catalog_items
WHERE is_active = false
GROUP BY supplier_name;

# Configurer une remise
INSERT INTO catalog.tenant_supplier_discounts
  (tenant_id, supplier_name, discount_pct, is_active)
VALUES
  ('tenant-uuid', 'Poujoulat', 40, true)
ON CONFLICT (tenant_id, supplier_name) DO UPDATE
  SET discount_pct = 40, is_active = true;
```
