#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
import_supplier_direct.py

Importe un fichier JSON généré par map_supplier.py vers Supabase
via la RPC catalog.import_supplier_items.

Usage:
  python scripts/import_supplier_direct.py <fichier.json> <supplier_name> <tenant_id>

Exemple:
  python scripts/import_supplier_direct.py poujoulat_import.json Poujoulat dbd5a19f-9d11-4ba8-93f7-046b642192ed

Pré-requis:
  pip install supabase python-dotenv
  Fichier .env avec VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY
"""

import json
import sys
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    print("[ERREUR] python-dotenv non installé. Lancer : pip install python-dotenv")
    sys.exit(1)

try:
    from supabase import create_client
except ImportError:
    print("[ERREUR] supabase non installé. Lancer : pip install supabase")
    sys.exit(1)


CHUNK_SIZE = 200
SAFE_FIELDS = {
    "ean",
    "supplier_ref",
    "name",
    "tarif_price",
    "vat_rate",
    "manufacturer_name",
    "distributor_name",
    "brand",
    "normalized_name",
    "search_keywords",
    "diameter_inner_mm",
    "diameter_outer_mm",
    "length_mm",
    "angle_deg",
    "supplier_range",
    "technology_type",
    "component_role",
    "finish_color",
    "description_fabricant",
    "source_file",
    "source_system",
    "import_batch_id",
    "normalization_status",
    "normalization_source",
    "parser_version",
    "ignored_field_names",
    "tarif_price_source_column",
    "item_family",
    "catalog_domain",
}

FORBIDDEN_FIELDS = {
    "cost_price",
    "net_price",
    "prix_net",
    "prix_achat",
    "purchase_price",
    "discount_pct",
    "remise",
    "net_client",
}


def err(msg):
    print(f"[ERREUR] {msg}", file=sys.stderr)


def info(msg):
    print(msg)


def load_env():
    load_dotenv()
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
    if not url or not url.startswith("https://"):
        err("VITE_SUPABASE_URL manquant ou invalide dans .env")
        sys.exit(1)
    if not key:
        err("VITE_SUPABASE_PUBLISHABLE_KEY manquant dans .env")
        sys.exit(1)
    return url, key


def load_json(path):
    p = Path(path)
    if not p.exists():
        err(f"Fichier introuvable : {path}")
        sys.exit(1)
    if p.stat().st_size == 0:
        err(f"Fichier vide : {path}")
        sys.exit(1)
    with open(p, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            err(f"JSON invalide : {e}")
            sys.exit(1)
    if not isinstance(data, list):
        err("Le fichier JSON doit contenir une liste d'articles.")
        sys.exit(1)
    if len(data) == 0:
        err("Le fichier JSON est vide (liste vide).")
        sys.exit(1)
    return data


def check_forbidden_fields(items):
    """Vérifie qu'aucun article ne contient de champ sensible non nul."""
    violations = []
    for i, item in enumerate(items):
        for field in FORBIDDEN_FIELDS:
            val = item.get(field)
            if val is not None:
                violations.append(f"  Article {i+1} (ref={item.get('supplier_ref','?')}) : {field}={val!r}")
    if violations:
        err("STOP — champs sensibles détectés (cost_price ou équivalent) :")
        for v in violations[:10]:
            print(v, file=sys.stderr)
        if len(violations) > 10:
            print(f"  ... et {len(violations)-10} autres violations.", file=sys.stderr)
        sys.exit(1)


def strip_unknown_fields(item):
    """Ne conserve que les champs connus. Retire les champs hors liste blanche."""
    return {k: v for k, v in item.items() if k in SAFE_FIELDS}


def chunks(lst, size):
    for i in range(0, len(lst), size):
        yield lst[i:i + size]


def extract_batch_id(items):
    """Extrait le batch_id du premier article."""
    for item in items:
        bid = item.get("import_batch_id")
        if bid:
            return bid
    return None


def run_import(supabase, tenant_id, supplier_name, items):
    total = len(items)
    all_chunks = list(chunks(items, CHUNK_SIZE))
    n_chunks = len(all_chunks)
    imported = 0

    info(f"\n[IMPORT] {supplier_name} — {total} articles — {n_chunks} chunks de {CHUNK_SIZE}")
    info(f"[IMPORT] tenant_id = {tenant_id}")
    info("")

    for idx, chunk in enumerate(all_chunks, start=1):
        safe_chunk = [strip_unknown_fields(item) for item in chunk]

        try:
            response = supabase.rpc(
                "import_supplier_items",
                {
                    "p_tenant_id": tenant_id,
                    "p_supplier_name": supplier_name,
                    "p_items": safe_chunk,
                    "p_margin_pct": None,
                }
            ).execute()
        except Exception as e:
            err(f"Chunk {idx}/{n_chunks} — exception RPC : {e}")
            err("STOP. L'import est interrompu. Relancer depuis le début (idempotent).")
            sys.exit(1)

        if hasattr(response, 'error') and response.error:
            err(f"Chunk {idx}/{n_chunks} — erreur RPC : {response.error}")
            err("STOP. L'import est interrompu. Relancer depuis le début (idempotent).")
            sys.exit(1)

        imported += len(chunk)
        pct = int(imported / total * 100)
        bar = ("█" * (pct // 5)).ljust(20)
        print(f"  Chunk {idx:>3}/{n_chunks} |{bar}| {imported:>6}/{total} ({pct}%)", flush=True)

    info(f"\n[OK] {imported} articles envoyés à Supabase.")
    return imported


def verify_import(supabase, supplier_name):
    info("\n[VÉRIFICATION] Comptage en base...")

    try:
        result = supabase.rpc(
            "execute_sql",
            {"query": f"""
                SELECT
                  COUNT(*) AS total,
                  COUNT(cost_price) AS cost_price_non_null,
                  MIN(unit_price_ht) AS prix_min,
                  MAX(unit_price_ht) AS prix_max
                FROM catalog.catalog_items
                WHERE supplier_name = '{supplier_name}'
            """}
        ).execute()
    except Exception:
        # La RPC execute_sql peut ne pas exister — fallback via table directe
        result = None

    if result is None or (hasattr(result, 'error') and result.error):
        # Fallback : requête via la table
        try:
            count_result = (
                supabase.table("catalog_items")
                .select("id", count="exact")
                .eq("supplier_name", supplier_name)
                .execute()
            )
            total = count_result.count if hasattr(count_result, 'count') else "?"
            info(f"  Total {supplier_name} en base : {total}")
            info("  (vérification MIN/MAX prix non disponible via cette méthode)")
            info("  Vérifier manuellement dans Supabase :")
            info(f"  SELECT COUNT(*), MIN(unit_price_ht), MAX(unit_price_ht)")
            info(f"  FROM catalog.catalog_items WHERE supplier_name = '{supplier_name}';")
            return total
        except Exception as e:
            err(f"Impossible de vérifier le comptage : {e}")
            info("  Vérifier manuellement dans Supabase :")
            info(f"  SELECT COUNT(*) FROM catalog.catalog_items WHERE supplier_name = '{supplier_name}';")
            return None

    data = result.data
    if data and len(data) > 0:
        row = data[0]
        total = row.get("total", "?")
        cost_price_non_null = int(row.get("cost_price_non_null", 0) or 0)
        prix_min = row.get("prix_min", "?")
        prix_max = row.get("prix_max", "?")

        info(f"  Total articles {supplier_name} : {total}")
        info(f"  cost_price non null        : {cost_price_non_null}  (doit être 0)")
        info(f"  Prix min                   : {prix_min}€")
        info(f"  Prix max                   : {prix_max}€")

        if cost_price_non_null > 0:
            err(f"ALERTE — {cost_price_non_null} articles ont un cost_price non null !")
            err("Cela ne devrait pas être possible avec la contrainte CHECK.")
            err("Vérifier immédiatement.")
        else:
            info("  ✅ cost_price = NULL sur 100% des articles")

        return total
    else:
        info("  (résultat de vérification indisponible)")
        return None


def main():
    args = sys.argv[1:]
    if len(args) != 3:
        print("Usage: python scripts/import_supplier_direct.py <fichier.json> <supplier_name> <tenant_id>")
        print("")
        print("Exemple:")
        print("  python scripts/import_supplier_direct.py poujoulat_import.json Poujoulat dbd5a19f-9d11-4ba8-93f7-046b642192ed")
        sys.exit(1)

    json_path, supplier_name, tenant_id = args

    # 1. Charger l'env
    url, key = load_env()

    # 2. Charger le JSON
    info(f"[CHARGEMENT] {json_path}...")
    items = load_json(json_path)
    info(f"  {len(items)} articles chargés.")

    # 3. Vérifier les champs sensibles AVANT tout envoi
    info("[SÉCURITÉ] Vérification champs sensibles (cost_price, net_price...)...")
    check_forbidden_fields(items)
    info("  ✅ Aucun champ sensible détecté.")

    # 4. Afficher le batch_id prévu
    batch_id = extract_batch_id(items)
    if batch_id:
        info(f"  batch_id : {batch_id}")
        info(f"  (rollback possible : DELETE FROM catalog.catalog_items WHERE import_batch_id = '{batch_id}';)")

    # 5. Connexion Supabase
    info("[CONNEXION] Supabase...")
    try:
        supabase = create_client(url, key)
        info("  ✅ Connecté.")
    except Exception as e:
        err(f"Impossible de se connecter à Supabase : {e}")
        sys.exit(1)

    # 6. Import
    run_import(supabase, tenant_id, supplier_name, items)

    # 7. Vérification post-import
    total = verify_import(supabase, supplier_name)

    # 8. Rapport final
    info("")
    info("═" * 50)
    info(f"RAPPORT FINAL — {supplier_name}")
    info("═" * 50)
    info(f"  Articles dans le JSON : {len(items)}")
    info(f"  Articles en base      : {total if total is not None else '(vérifier manuellement)'}")
    if batch_id:
        info(f"  batch_id              : {batch_id}")
        info(f"  Rollback si nécessaire :")
        info(f"    DELETE FROM catalog.catalog_items")
        info(f"    WHERE import_batch_id = '{batch_id}';")
    info("═" * 50)
    info("")

    if total is not None and isinstance(total, int):
        if total < len(items) * 0.95:
            err(f"ALERTE — Seulement {total} articles en base pour {len(items)} dans le JSON.")
            err("L'import semble incomplet. Vérifier les logs RPC et relancer.")
            sys.exit(1)
        else:
            info("✅ Import terminé avec succès.")
    else:
        info("Import terminé. Vérifier le COUNT manuellement dans Supabase.")


if __name__ == "__main__":
    main()
