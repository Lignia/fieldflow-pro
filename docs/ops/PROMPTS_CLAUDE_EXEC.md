# Prompts Claude Exec LIGNIA
> À utiliser dans l'ordre. Ne jamais fusionner audit et exécution.
> Un prompt = une tâche = un rapport = STOP.

---

## COMMENT UTILISER CES PROMPTS

```
RÈGLE ABSOLUE : Ne jamais donner le PROMPT EXÉCUTION
sans avoir lu et validé le rapport du PROMPT AUDIT.

Séquence obligatoire :
  1. Copier PROMPT AUDIT → nouvelle conversation Claude Exec
  2. Lire le rapport
  3. Si ÉTAT = PRÊT : copier PROMPT EXÉCUTION → nouvelle conversation Claude Exec
  4. Si ÉTAT = BLOQUAGE : résoudre le blocage d'abord

Chaque prompt se termine par STOP.
Claude Exec ne doit jamais enchaîner spontanément sur la tâche suivante.
C'est toi qui décides de continuer.
```

---

## S1-T1 — PROMPT AUDIT (lecture seule)

> Copier-coller tel quel dans une nouvelle conversation Claude Exec.

```
Tu es Claude Exec LIGNIA.
Projet Supabase : hejxvqghsyaauwzkfikg
Repo GitHub : Lignia/fieldflow-pro
LECTURE SEULE. Aucune modification. Aucun import. Aucune création.

MISSION : Audit S1-T1 avant import Poujoulat.
Exécute les 6 vérifications suivantes dans cet ordre.

━━━━━━━━━━━━━━━━━━━━━━
VÉRIFICATION 1 — Articles Poujoulat en base
━━━━━━━━━━━━━━━━━━━━━━

SELECT supplier_name, COUNT(*) AS n,
       MIN(unit_price_ht) AS prix_min,
       MAX(unit_price_ht) AS prix_max
FROM catalog.catalog_items
WHERE LOWER(supplier_name) = 'poujoulat'
GROUP BY supplier_name;

Attente : n entre 16 000 et 17 000.
Si n = 3 : import non terminé.

━━━━━━━━━━━━━━━━━━━━━━
VÉRIFICATION 2 — Dernier import_batch_id Poujoulat
━━━━━━━━━━━━━━━━━━━━━━

SELECT import_batch_id, COUNT(*) AS n,
       MIN(created_at)::date AS date_import
FROM catalog.catalog_items
WHERE LOWER(supplier_name) = 'poujoulat'
GROUP BY import_batch_id
ORDER BY MIN(created_at) DESC
LIMIT 3;

━━━━━━━━━━━━━━━━━━━━━━
VÉRIFICATION 3 — Contrainte cost_price
━━━━━━━━━━━━━━━━━━━━━━

SELECT conname
FROM pg_constraint
WHERE conrelid = 'catalog.catalog_items'::regclass
  AND conname LIKE '%cost%';

Attente : 1 ligne avec chk_catalog_items_cost_price_null.
Si 0 ligne : contrainte absente.

━━━━━━━━━━━━━━━━━━━━━━
VÉRIFICATION 4 — RPC import_supplier_items
━━━━━━━━━━━━━━━━━━━━━━

SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'catalog'
  AND routine_name = 'import_supplier_items';

Attente : 1 ligne.

━━━━━━━━━━━━━━━━━━━━━━
VÉRIFICATION 5 — Remise Poujoulat configurée
━━━━━━━━━━━━━━━━━━━━━━

SELECT tenant_id, supplier_name, discount_pct, is_active
FROM catalog.tenant_supplier_discounts
WHERE LOWER(supplier_name) = 'poujoulat'
  AND tenant_id = 'dbd5a19f-9d11-4ba8-93f7-046b642192ed';

Attente : discount_pct = 40, is_active = true.
Si 0 ligne : remise non configurée (à faire après import).

━━━━━━━━━━━━━━━━━━━━━━
VÉRIFICATION 6 — Scripts dans GitHub
━━━━━━━━━━━━━━━━━━━━━━

Vérifier dans Lignia/fieldflow-pro, branche main :
  - scripts/import_supplier_direct.py
  - scripts/map_supplier.py
  - poujoulat_import.json (racine du repo)

━━━━━━━━━━━━━━━━━━━━━━
RAPPORT — Format exact obligatoire
━━━━━━━━━━━━━━━━━━━━━━

---
S1-T1 AUDIT — [DATE]

1. Articles Poujoulat : [N] articles | MIN [X]€ | MAX [Y]€
2. Dernier batch_id : [UUID ou "aucun"] | [date] | [N articles]
3. Contrainte cost_price : [présente / absente]
4. RPC import_supplier_items : [présente / absente]
5. Remise 40% Poujoulat : [configurée / absente]
6. Scripts :
   import_supplier_direct.py : [✅ présent / ❌ absent]
   map_supplier.py : [✅ présent / ❌ absent]
   poujoulat_import.json : [✅ présent / ❌ absent]

ÉTAT GLOBAL : [PRÊT À IMPORTER / BLOQUAGE]
Si BLOQUAGE : [raison exacte en 1 phrase]
PROCHAINE ACTION : [1 phrase]
---

STOP après le rapport. Ne rien modifier.
```

---

## S1-T1 + S1-T2 + S1-T3 — PROMPT EXÉCUTION

> À donner UNIQUEMENT après avoir validé le rapport d'audit.
> Copier-coller tel quel dans une NOUVELLE conversation Claude Exec.

```
Tu es Claude Exec LIGNIA.
Projet Supabase : hejxvqghsyaauwzkfikg
Repo GitHub : Lignia/fieldflow-pro
Tenant Ambiance Chaleur : dbd5a19f-9d11-4ba8-93f7-046b642192ed

CONTEXTE :
  L'audit S1-T1 est terminé et valide.
  Tu dois exécuter S1-T1 → S1-T2 → S1-T3 dans cet ordre strict.
  Si une étape échoue → STOP immédiat, ne pas passer à la suivante.

RÈGLES ABSOLUES :
  Ne rien refactoriser.
  Ne rien réécrire.
  Ne toucher à aucun fichier frontend.
  Ne pas modifier resolve_item_price, search_quote_items_v2, replace_quote_lines.
  Si COUNT post-import < 16 000 → STOP et reporter l'écart.

━━━━━━━━━━━━━━━━━━━━━━
ÉTAPE 1 — S1-T1 : Import Poujoulat
━━━━━━━━━━━━━━━━━━━━━━

Le fichier poujoulat_import.json est à la racine du repo.
Importer via RPC catalog.import_supplier_items par chunks de 200.

VÉRIFICATIONS POST-IMPORT obligatoires — toutes les 4 doivent passer :
  a. COUNT articles Poujoulat ≥ 16 000
  b. COUNT(cost_price IS NOT NULL) = 0
  c. MIN(unit_price_ht) entre 1€ et 15€
  d. MAX(unit_price_ht) entre 5 000€ et 15 000€

Si a, b, c ou d échoue → STOP + reporter l'anomalie.
Rollback possible : DELETE FROM catalog.catalog_items
                   WHERE import_batch_id = '[batch utilisé]';

━━━━━━━━━━━━━━━━━━━━━━
ÉTAPE 2 — S1-T2 : Remise Poujoulat 40%
━━━━━━━━━━━━━━━━━━━━━━

Exécuter uniquement si S1-T1 est validé.

INSERT INTO catalog.tenant_supplier_discounts
  (tenant_id, supplier_name, discount_pct, is_active)
VALUES
  ('dbd5a19f-9d11-4ba8-93f7-046b642192ed', 'Poujoulat', 40, true)
ON CONFLICT (tenant_id, supplier_name) DO UPDATE
  SET discount_pct = 40, is_active = true;

VÉRIFICATION :
  SELECT discount_pct, is_active
  FROM catalog.tenant_supplier_discounts
  WHERE tenant_id = 'dbd5a19f-9d11-4ba8-93f7-046b642192ed'
    AND supplier_name = 'Poujoulat';
  → discount_pct = 40, is_active = true

━━━━━━━━━━━━━━━━━━━━━━
ÉTAPE 3 — S1-T3 : CHECK cost_price IS NULL
━━━━━━━━━━━━━━━━━━━━━━

Exécuter uniquement si S1-T1 et S1-T2 sont validés.
Utiliser apply_migration (DDL).

ALTER TABLE catalog.catalog_items
  ADD CONSTRAINT chk_catalog_items_cost_price_null
  CHECK (cost_price IS NULL);

VÉRIFICATION :
  SELECT conname FROM pg_constraint
  WHERE conrelid = 'catalog.catalog_items'::regclass
    AND conname = 'chk_catalog_items_cost_price_null';
  → 1 ligne attendue

━━━━━━━━━━━━━━━━━━━━━━
RAPPORT FINAL — Format exact obligatoire
━━━━━━━━━━━━━━━━━━━━━━

---
S1-T1/T2/T3 EXÉCUTION — [DATE]

S1-T1 Import Poujoulat
  Statut : [✅ terminé / ❌ raison]
  batch_id : [UUID]
  COUNT : [N] articles
  cost_price = NULL : [✅ 100% / ❌ N anomalies]
  Prix MIN/MAX : [X€ / Y€]

S1-T2 Remise 40%
  Statut : [✅ configurée / ❌ raison]

S1-T3 Contrainte cost_price
  Statut : [✅ active / ❌ raison]

PROCHAINE TÂCHE : S1-T4 — Brancher onglet Appareils (Lovable)
INSTRUCTION POUR TOI : [1 phrase]
---

STOP après le rapport.
```

---

## RÈGLES GÉNÉRALES POUR TOUS LES PROMPTS CLAUDE EXEC LIGNIA

```
1. Toujours commencer par l'audit (lecture seule) avant l'exécution
2. Un prompt = une tâche = un rapport = STOP
3. Jamais fusionner audit et exécution dans le même prompt
4. Toujours inclure : projet Supabase + tenant_id + repo GitHub
5. Toujours terminer par STOP après le rapport
6. Format rapport toujours le même → copier-collable dans un log
7. Claude Exec ne décide jamais de la prochaine tâche — c'est toi
8. Si blocage → reporter exactement le message d'erreur, pas une paraphrase
```
