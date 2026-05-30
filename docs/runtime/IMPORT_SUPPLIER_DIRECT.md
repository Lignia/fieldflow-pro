# import_supplier_direct.py — Guide d'utilisation

Script pour importer un fichier JSON fournisseur (généré par `map_supplier.py`) dans Supabase.

---

## Pré-requis

```bash
pip install supabase python-dotenv
```

Fichier `.env` à la racine du projet :
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

---

## Commande d'usage

```bash
python scripts/import_supplier_direct.py <fichier.json> <supplier_name> <tenant_id>
```

---

## Exemple Poujoulat complet

```bash
# Étape 1 — Dry-run (toujours commencer par là)
python scripts/map_supplier.py poujoulat_2026.csv poujoulat --dry-run

# Étape 2 — Générer le JSON
python scripts/map_supplier.py poujoulat_2026.csv poujoulat > poujoulat_import.json

# Étape 3 — Importer
python scripts/import_supplier_direct.py \
  poujoulat_import.json \
  Poujoulat \
  dbd5a19f-9d11-4ba8-93f7-046b642192ed

# Étape 4 — Vérifier dans Supabase
SELECT COUNT(*), MIN(unit_price_ht), MAX(unit_price_ht)
FROM catalog.catalog_items
WHERE supplier_name = 'Poujoulat';
-- Attendu : ~16 529 articles, MIN ~2€, MAX ~8000€
```

---

## Comportement

- **Idempotent** : relancer le même fichier = safe. Aucun doublon créé.
- **Chunks de 200** : progression affichée en temps réel.
- **STOP immédiat** si erreur RPC sur un chunk.
- **Vérification auto** après import : COUNT, cost_price = 0, MIN/MAX prix.
- **Sécurité** : vérifie l'absence de `cost_price`, `net_price` et équivalents avant tout envoi.

---

## Erreurs fréquentes

| Erreur | Cause | Solution |
|---|---|---|
| `VITE_SUPABASE_URL manquant` | `.env` absent ou mal configuré | Vérifier le fichier `.env` |
| `Fichier introuvable` | Mauvais chemin | Vérifier le nom du fichier JSON |
| `JSON invalide` | Fichier corrompu | Régénérer avec `map_supplier.py` |
| `champs sensibles détectés` | `cost_price` présent dans le JSON | Ne jamais inclure dans le CSV source |
| `erreur RPC` | Problème Supabase ou RPC | Lire le message d'erreur exact |
| `Import incomplet` | Moins de 95% des articles importés | Relancer (idempotent) |

---

## Rollback manuel

Si l'import produit des résultats incorrects, désactiver le batch :

```sql
-- Désactiver les articles du batch concerné
UPDATE catalog.catalog_items
  SET is_active = false
  WHERE import_batch_id = 'uuid-du-batch-à-annuler';

-- Vérifier
SELECT COUNT(*)
FROM catalog.catalog_items
WHERE import_batch_id = 'uuid-du-batch-à-annuler'
  AND is_active = true;
-- Attendu : 0
```

Le `batch_id` est affiché au début de l'import et dans le rapport final.

---

## Commande de vérification rapide

```sql
SELECT supplier_name, COUNT(*), MIN(unit_price_ht), MAX(unit_price_ht)
FROM catalog.catalog_items
WHERE is_active = true
GROUP BY supplier_name
ORDER BY COUNT(*) DESC;
```
