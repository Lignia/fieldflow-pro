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
  Fichier .env avec :
    VITE_SUPABASE_URL
    SUPABASE_SERVICE_KEY   ← clé service_role (jamais la clé anon/publishable)

IMPORTANT — Sécurité :
  Ce script utilise la clé service_role pour bypass l'auth JWT.
  C'est un outil d'administration batch interne, pas une opération frontend.
  Ne jamais committer SUPABASE_SERVICE_KEY dans Git.
  Ne jamais exposer cette clé dans des logs ou des écrans partagés.
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

# ─── Liste blanche des champs autorisés à franchir la RPC ────────────────────────
# Règle : tout champ produit par map_supplier.py ET attendu par la RPC
# doit être explicitement nommé ici. Les champs hors liste sont silencieusement
# supprimés par strip_unknown_fields() avant envoi.
#
# CORRECTION 5 (Phase 2) — Ajouts pour pipeline V1 :
#   valid_from         : date du tarif source ou date import (R-04/I-03/P-00b)
#                        AJOUTÉ : manquait, aurait été silencieusement supprimé
#   product_type       : dérivé par resolve_category() / C-1
#                        AJOUTÉ : manquait, dérivation sans effet sans ce champ
#   data_quality_status: triplet qualité (complete/partial/uncertain) / I-11
#                        AJOUTÉ : manquait, statut qualité perdu à l'import
#   needs_human_review : bool du triplet (catégorie non cartographiée)
#                        AJOUTÉ : manquait, revue humaine bloquée en base
#   review_reason      : texte du triplet
#                        AJOUTÉ : manquait, contexte de revue perdu
#   appliance_type     : pour appareils (C-3, fournisseurs appareil futurs)
#                        AJOUTÉ : ne pas bloquer au passage même si Poujoulat
#                        (fumisterie) ne le produit pas actuellement
#   item_family        : déjà présent — non modifié, non dupliqué

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
    "item_family",        # déjà présent avant Phase 2
    "catalog_domain",
    # ── CORRECTION 5 : champs ajoutés en Phase 2 ──
    "valid_from",         # date tarif ou date import (R-04 / I-03 / P-00b)
    "product_type",       # dérivé catégorie (C-1 / SUPPLIER_MAPPING)
    "data_quality_status",# triplet qualité : complete | partial | uncertain
    "needs_human_review", # bool : catégorie non cartographiée (I-11)
    "review_reason",      # texte du triplet (complète needs_human_review)
    "appliance_type",     # appareil type (C-3, fournisseurs appareil futurs)
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
    # P0.1 — utiliser service_role, pas la clé anon/publishable
    # La RPC import_supplier_items n'accorde pas EXECUTE au rôle anon.
    # GRANT EXECUTE existe pour : authenticated, service_role, postgres.
    # Un script batch administratif doit utiliser service_role.
    key = os.getenv("SUPABASE_SERVICE_KEY")

    if not url or not url.startswith("https://"):
        err("VITE_SUPABASE_URL manquant ou invalide dans .env")
        sys.exit(1)
    if not key:
        err("SUPABASE_SERVICE_KEY manquant dans .env")
        err("Ce script nécessite la clé service_role (pas la clé anon).")
        err("Ajouter SUPABASE_SERVICE_KEY=eyJ... dans le fichier .env")
        err("Trouver cette clé dans : Supabase Dashboard > Project Settings > API > service_role key")
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
                violations.append(
                    f"  Article {i+1} (ref={item.get('supplier_ref','?')}) : {field}={val!r}"
                )
    if violations:
        err("STOP — champs sensibles détectés (cost_price ou équivalent) :")
        for v in violations[:10]:
            print(v, file=sys.stderr)
        if len(violations) > 10:
            print(f"  ... et {len(violations)-10} autres violations.", file=sys.stderr)
        sys.exit(1)


def strip_unknown_fields(item):
    """Ne conserve que les champs de la liste blanche.

    Note : le champ interne '_unmapped_category' (préfixé '_') produit par
    map_supplier.py pour le rapport dry-run est automatiquement exclu ici
    car il n'est pas dans SAFE_FIELDS. Il ne franchit jamais la RPC.
    """
    return {k: v for k, v in item.items() if k in SAFE_FIELDS}


def chunks(lst, size):
    for i in range(0, len(lst), size):
        yield lst[i:i + size]


def extract_batch_id(items):
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
                "import_supplier_items_v2",
                {
                    "p_tenant_id": tenant_id,
                    "p_supplier_name": supplier_name,
                    "p_items": safe_chunk,
                    "p_margin_pct": 0,  # DEFAULT 0, ne pas envoyer NULL
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
    """
    Vérification post-import via le schéma catalog.
    P0.2 — execute_sql n'existe pas dans cette base.
    On interroge directement catalog.catalog_items via postgrest schema switching.
    """
    info("\n[VÉRIFICATION] Comptage en base...")

    try:
        # supabase-py >= 2.0 : .schema("catalog") pour cibler le bon schéma
        count_result = (
            supabase.schema("catalog")
            .table("catalog_items")
            .select("id", count="exact")
            .eq("supplier_name", supplier_name)
            .execute()
        )
        total = count_result.count if hasattr(count_result, "count") and count_result.count is not None else None

        if total is not None:
            info(f"  Total {supplier_name} en base : {total}")
            info("")
            info("  Pour MIN/MAX prix, lancer dans Supabase :")
            info(f"  SELECT COUNT(*), MIN(unit_price_ht), MAX(unit_price_ht)")
            info(f"  FROM catalog.catalog_items WHERE supplier_name = '{supplier_name}';")
            return total
        else:
            raise ValueError("count est None")

    except Exception as e:
        # Fallback texte : guider l'opérateur
        info(f"  (comptage automatique indisponible : {e})")
        info("")
        info("  Vérifier manuellement dans Supabase Dashboard > SQL Editor :")
        info(f"  SELECT COUNT(*), MIN(unit_price_ht), MAX(unit_price_ht)")
        info(f"  FROM catalog.catalog_items")
        info(f"  WHERE supplier_name = '{supplier_name}';")
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

    # 1. Charger l'env (service_role requis)
    url, key = load_env()

    # 2. Charger le JSON
    info(f"[CHARGEMENT] {json_path}...")
    items = load_json(json_path)
    info(f"  {len(items)} articles chargés.")

    # 3. Vérifier les champs sensibles AVANT tout envoi
    info("[SÉCURITÉ] Vérification champs sensibles (cost_price, net_price...)...")
    check_forbidden_fields(items)
    info("  ✅ Aucun champ sensible détecté.")

    # 4. Afficher le batch_id
    batch_id = extract_batch_id(items)
    if batch_id:
        info(f"  batch_id : {batch_id}")
        info(f"  Rollback si nécessaire :")
        info(f"    DELETE FROM catalog.catalog_items WHERE import_batch_id = '{batch_id}';")

    # 5. Connexion Supabase (service_role)
    info("[CONNEXION] Supabase (service_role)...")
    try:
        supabase = create_client(url, key)
        info("  ✅ Connecté.")
    except Exception as e:
        err(f"Impossible de se connecter à Supabase : {e}")
        sys.exit(1)

    # 6. Import par chunks
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
        info(f"  Rollback :")
        info(f"    DELETE FROM catalog.catalog_items")
        info(f"    WHERE import_batch_id = '{batch_id}';")
    info("═" * 50)
    info("")

    if total is not None and isinstance(total, int):
        if total < len(items) * 0.95:
            err(f"ALERTE — Seulement {total} articles en base pour {len(items)} dans le JSON.")
            err("L'import semble incomplet. Relancer (idempotent).")
            sys.exit(1)
        else:
            info("✅ Import terminé avec succès.")
    else:
        info("Import terminé. Vérifier le COUNT manuellement dans Supabase.")


if __name__ == "__main__":
    main()
