#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
map_supplier.py

Usage:
  python map_supplier.py <fichier.csv> <fournisseur> > output.json
  python map_supplier.py <fichier.csv> <fournisseur> --dry-run

Python 3.9+
Dépendances stdlib uniquement :
  csv, json, re, sys, uuid, pathlib, unicodedata
"""

import csv
import json
import re
import sys
import uuid
import unicodedata
from pathlib import Path


DANGEROUS_EXACT = [
    "prix_achat",
    "net_client",
    "remise_raw",
    "of_seller_pp_ht",
    "seller_ids/price",
    "seller_ids/pp_ht",
    "cost_price",
    "net_price",
    "prix_net",
    "discount_pct",
    "purchase_price",
    "of_seller_price",
    "of_import_remise",
    "of_sale_coeff",
    "remise",
    "remise_1",
]

DANGEROUS_WORD = [
    r"\bnet\b",
    r"\bremise\b",
    r"\bmarge\b",
    r"\bcout\b",
    r"\bcost\b",
    r"\bachat\b",
    r"\bpurchase\b",
    r"\bdiscount\b",
]


SUPPLIER_CONFIGS = {
    "joncoux": {
        "manufacturer_name": "Joncoux",
        "distributor_name": "Lorflex",
        "brand": "Joncoux",
        "ean_candidates": [
            "ean/upc",
            "code_interne_joncoux",
        ],
        "supplier_ref_candidates": [
            "code_interne_joncoux",
            "ean/upc",
        ],
        "name_column": "designation_article",
        "name_fallback_candidates": [
            "designation_hp",
            "name",
            "designation",
            "libelle",
        ],
        "tarif_price_candidates": [
            "prix_tarif_2026",
            "prix_public",
            "tarif_price",
        ],
        "vat_default": 20,
        "fix_mojibake_labels": True,
    },
    "modinox": {
        "manufacturer_name": "Modinox",
        "distributor_name": None,
        "brand": "Modinox",
        "ean_candidates": ["default_code"],
        "supplier_ref_candidates": ["default_code"],
        "name_column": "name",
        "name_fallback_candidates": [
            "description",
            "description_fabricant",
        ],
        "tarif_price_candidates": [
            "list_price",
            "lst_price",
        ],
        "vat_default": 20,
        "fix_mojibake_labels": False,
    },
    "bofill": {
        "manufacturer_name": "Bofill",
        "distributor_name": None,
        "brand": "Bofill",
        "ean_candidates": ["default_code"],
        "supplier_ref_candidates": ["default_code"],
        "name_column": "name",
        "name_fallback_candidates": [
            "supplier_label",
            "description",
            "description_fabricant",
        ],
        "tarif_price_candidates": [
            "list_price",
            "unit_price_ht",
            "lst_price",
        ],
        "vat_default": 20,
        "fix_mojibake_labels": False,
    },
    "poujoulat": {
        "manufacturer_name": "Poujoulat",
        "distributor_name": None,
        "brand": "Poujoulat",
        "ean_candidates": ["default_code"],
        "supplier_ref_candidates": ["default_code"],
        "name_column": "name",
        "name_fallback_candidates": [
            "description",
            "description_fabricant",
        ],
        "tarif_price_candidates": [
            "list_price",
            "lst_price",
        ],
        "vat_default": 20,
        "fix_mojibake_labels": False,
    },
    "dix-neuf": {
        "manufacturer_name": "Dix-Neuf",
        "distributor_name": None,
        "brand": "Dix-Neuf",
        "ean_candidates": ["default_code"],
        "supplier_ref_candidates": ["default_code"],
        "name_column": "name",
        "name_fallback_candidates": [
            "description",
            "description_fabricant",
        ],
        "tarif_price_candidates": [
            "list_price",
            "unit_price_ht",
            "lst_price",
        ],
        "vat_default": 20,
        "fix_mojibake_labels": False,
    },
    "dixneuf": {
        "manufacturer_name": "Dix-Neuf",
        "distributor_name": None,
        "brand": "Dix-Neuf",
        "ean_candidates": ["default_code"],
        "supplier_ref_candidates": ["default_code"],
        "name_column": "name",
        "name_fallback_candidates": [
            "description",
            "description_fabricant",
        ],
        "tarif_price_candidates": [
            "list_price",
            "unit_price_ht",
            "lst_price",
        ],
        "vat_default": 20,
        "fix_mojibake_labels": False,
    },
    "tubest": {
        "manufacturer_name": "Tubest",
        "distributor_name": None,
        "brand": "Tubest",
        "ean_candidates": ["default_code"],
        "supplier_ref_candidates": ["default_code"],
        "name_column": "name",
        "name_fallback_candidates": [
            "description",
            "description_fabricant",
        ],
        "tarif_price_candidates": [
            "list_price",
            "unit_price_ht",
            "lst_price",
        ],
        "vat_default": 20,
        "fix_mojibake_labels": False,
    },
    # MODIFICATION 1 — dinak sans read_vat_rate_from_file
    "dinak": {
        "manufacturer_name": "Dinak",
        "distributor_name": None,
        "brand": "Dinak",
        "ean_candidates": ["supplier_ref"],
        "supplier_ref_candidates": ["supplier_ref"],
        "name_column": "normalized_name",
        "name_fallback_candidates": ["raw_label"],
        "tarif_price_candidates": ["unit_price_ht"],
        "vat_default": 20,
        "fix_mojibake_labels": False,
    },
    "kemp": {
        "manufacturer_name": "KEMP",
        "distributor_name": None,
        "brand": "KEMP",
        "dry_run_only": True,
        "ean_candidates": [
            "default_code",
            "supplier_ref",
            "reference",
            "ref",
            "code",
        ],
        "supplier_ref_candidates": [
            "default_code",
            "supplier_ref",
            "reference",
            "ref",
            "code",
        ],
        "name_column": "name",
        "name_fallback_candidates": [
            "designation",
            "description",
            "description_fabricant",
        ],
        "tarif_price_candidates": [
            "list_price",
            "prix_public",
            "unit_price_ht",
            "tarif_price",
            "lst_price",
        ],
        "vat_default": 20,
        "fix_mojibake_labels": False,
    },
    "jeremias": {
        "manufacturer_name": "Jeremias",
        "distributor_name": None,
        "brand": "Jeremias",
        "unsupported": True,
        "unsupported_reason": (
            "Jeremias multi-variantes : 1 ligne source = N diamètres."
        ),
    },
}


def stderr(msg):
    sys.stderr.write(f"{msg}\n")


def strip_accents(value):
    return "".join(
        c for c in unicodedata.normalize("NFKD", value)
        if not unicodedata.combining(c)
    )


def normalize_columns(row):
    result = {}

    for k, v in row.items():
        if k is None:
            stderr("[WARNING] ligne CSV avec colonnes supplémentaires hors header")
            result["_extra_columns"] = v
            continue

        original_key = str(k)
        key = original_key.strip()
        key = key.lower()
        key = strip_accents(key)
        key = re.sub(r"[^a-z0-9_/]+", "_", key)
        key = key.strip("_")

        if key in result:
            stderr(
                f"[WARNING] header normalisé dupliqué: "
                f"{original_key!r} -> {key!r}"
            )
            continue

        result[key] = v

    return result


def fix_mojibake(value):
    if value is None:
        return None

    s = str(value)

    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return s


def autodetect_delimiter(sample):
    if sample.count(";") > sample.count(","):
        return ";"
    return ","


def read_csv(path):
    suffix = Path(path).suffix.lower()

    if suffix in {".xlsx", ".xls"}:
        stderr(
            "[ERROR] fichier Excel détecté. "
            "Ce script lit uniquement des CSV UTF-8-sig. "
            "Convertir d'abord le fichier Excel en CSV UTF-8-sig "
            "(Fichier > Enregistrer sous > CSV UTF-8 dans Excel), "
            f"puis relancer : "
            f"python map_supplier.py {Path(path).with_suffix('.csv').name} <fournisseur>. "
            "Alternative hors scope : utiliser un script séparé de conversion "
            "avec openpyxl/pandas."
        )
        sys.exit(1)

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        sample = f.read(4096)
        f.seek(0)

        delimiter = autodetect_delimiter(sample)
        reader = csv.DictReader(f, delimiter=delimiter)

        for row in reader:
            yield normalize_columns(row)


def clean_string(value, fix_encoding=False):
    if value is None:
        return None

    if fix_encoding:
        value = fix_mojibake(value)

    value = str(value).strip()
    value = re.sub(r"\s+", " ", value)

    if value == "":
        return None

    return value


def parse_float(value):
    if value is None:
        return None

    value = str(value).strip()

    cleaned = (
        value
        .replace("€", "")
        .replace(" ", "")
        .replace("\xa0", "")
    )

    if "." in cleaned and "," in cleaned:
        dot_pos = cleaned.find(".")
        comma_pos = cleaned.find(",")

        if dot_pos < comma_pos:
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            return None
    else:
        cleaned = cleaned.replace(",", ".")

    if not re.match(r"^\d+(\.\d+)?$", cleaned):
        return None

    try:
        result = round(float(cleaned), 2)

        if result <= 0:
            return None

        return result

    except Exception:
        return None


def parse_int(value):
    if value is None:
        return None

    match = re.search(r"\d+", str(value))

    if not match:
        return None

    try:
        return int(match.group(0))
    except Exception:
        return None


def parse_mm(value):
    if value is None:
        return None

    cleaned = str(value).strip().lower()
    cleaned = cleaned.replace(" ", "")
    cleaned = cleaned.replace(",", ".")

    if re.match(r"^\d+$", cleaned):
        return int(cleaned)

    if re.match(r"^\d+mm$", cleaned):
        return int(cleaned.replace("mm", ""))

    if re.match(r"^\d+\.0$", cleaned):
        return int(float(cleaned))

    return None


def pick_first_non_empty(row, candidates):
    for col in candidates:
        if col not in row:
            continue

        val = clean_string(row.get(col))

        if val:
            return val

    return None


def pick_first_valid_price(row, candidates):
    for col in candidates:
        if col not in row:
            continue

        val = parse_float(row.get(col))

        if val and val > 0:
            return val, col

    return None, None


def normalize_name(name):
    if not name:
        return None

    return re.sub(r"\s+", " ", name.strip())


def build_search_keywords(
    normalized_name,
    supplier_range,
    technology_type,
    component_role,
    diameter_inner_mm,
    item_family,
):
    parts = [
        normalized_name,
        supplier_range,
        technology_type,
        component_role,
    ]

    if diameter_inner_mm is not None:
        parts.append(f"Ø{diameter_inner_mm}")

    parts.append(item_family)

    cleaned = []

    for p in parts:
        if p is None:
            continue

        p = str(p).strip()

        if p:
            cleaned.append(p)

    return " ".join(cleaned)


def detect_ignored_field_names(row):
    names = []

    for k, v in row.items():
        lk = k.lower()
        matched = False

        for p in DANGEROUS_EXACT:
            if p in lk:
                matched = True
                break

        if not matched:
            for p in DANGEROUS_WORD:
                if re.search(p, lk):
                    matched = True
                    break

        if matched:
            names.append(k)

    return names


def warn_missing_columns(
    row,
    config,
    supplier_key,
    source_file,
):
    if config.get("unsupported"):
        return

    if not any(col in row for col in config["ean_candidates"]):
        stderr(
            f"[WARNING][{supplier_key}] "
            f"{source_file}"
            f" - aucune colonne référence trouvée parmi: "
            f"{config['ean_candidates']}"
        )

    name_candidates = (
        [config["name_column"]]
        + config.get("name_fallback_candidates", [])
    )

    if not any(col in row for col in name_candidates):
        stderr(
            f"[WARNING][{supplier_key}] "
            f"{source_file}"
            f" - aucune colonne libellé trouvée parmi: "
            f"{name_candidates}"
        )

    if not any(col in row for col in config["tarif_price_candidates"]):
        stderr(
            f"[WARNING][{supplier_key}] "
            f"{source_file}"
            f" - aucune colonne prix tarif trouvée parmi: "
            f"{config['tarif_price_candidates']}"
        )


def write_json_file(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(
            data,
            f,
            ensure_ascii=False,
            indent=2
        )


def write_skipped_file(csv_path, source_file, skipped, dry_run=False):
    suffix = ".dry-run.skipped.json" if dry_run else ".skipped.json"
    skipped_path = f"{csv_path}{suffix}"

    try:
        write_json_file(skipped_path, skipped)
        return skipped_path
    except OSError:
        fallback_path = f"{source_file}{suffix}"
        write_json_file(fallback_path, skipped)
        return fallback_path


def map_row(
    row,
    config,
    source_file,
    import_batch_id,
):
    ean = pick_first_non_empty(
        row,
        config["ean_candidates"]
    )

    if ean:
        ean = re.sub(r"\s+", "", ean.strip()).upper()

    supplier_ref_raw = pick_first_non_empty(
        row,
        config.get(
            "supplier_ref_candidates",
            config["ean_candidates"]
        )
    )

    supplier_ref = (
        re.sub(r"\s+", "", supplier_ref_raw.strip()).upper()
        if supplier_ref_raw
        else ean
    )

    fix_encoding = bool(config.get("fix_mojibake_labels"))

    name_raw = clean_string(
        row.get(config["name_column"]),
        fix_encoding=fix_encoding,
    )

    if not name_raw:
        for col in config.get("name_fallback_candidates", []):
            name_raw = clean_string(
                row.get(col),
                fix_encoding=fix_encoding,
            )
            if name_raw:
                break

    tarif_price, tarif_price_col = pick_first_valid_price(
        row,
        config["tarif_price_candidates"]
    )

    if not ean:
        return None, "missing_ean"

    if not name_raw:
        return None, "missing_name"

    if tarif_price is None or tarif_price <= 0:
        return None, "missing_tarif_price"

    normalized_name = normalize_name(name_raw)

    supplier_range = clean_string(
        row.get("supplier_range")
        or row.get("range")
        or row.get("gamme")
    )

    technology_type = clean_string(
        row.get("technology_type")
        or row.get("technologie")
    )

    component_role = clean_string(
        row.get("component_role")
        or row.get("product_kind")
        or row.get("component_type")
    )

    item_family = clean_string(
        row.get("item_family")
        or row.get("family")
        or row.get("famille")
    )

    diameter_inner_mm = parse_mm(
        row.get("diameter_inner_mm")
        or row.get("diametre")
        or row.get("dn")
    )

    diameter_outer_mm = parse_mm(
        row.get("diameter_outer_mm")
        or row.get("diametre_ext")
    )

    length_mm = parse_mm(
        row.get("length_mm")
        or row.get("longueur")
        or row.get("lg")
    )

    angle_deg = parse_int(
        row.get("angle_deg")
        or row.get("angle")
    )

    finish_color = clean_string(
        row.get("finish_color")
        or row.get("couleur")
        or row.get("color")
    )

    # MODIFICATION 2 — vat_rate depuis config uniquement (read_vat_rate_from_file supprimé)
    vat_rate = config["vat_default"]

    search_keywords = build_search_keywords(
        normalized_name=normalized_name,
        supplier_range=supplier_range,
        technology_type=technology_type,
        component_role=component_role,
        diameter_inner_mm=diameter_inner_mm,
        item_family=item_family,
    )

    item = {
        "ean": ean,
        "supplier_ref": supplier_ref,
        "name": name_raw,
        "tarif_price": tarif_price,
        # À valider côté RPC LOT 0.
        "tarif_price_source_column": tarif_price_col,
        "vat_rate": vat_rate,
        "manufacturer_name": config["manufacturer_name"],
        "distributor_name": config["distributor_name"],
        "brand": config["brand"],
        "normalized_name": normalized_name,
        "search_keywords": search_keywords,
        "diameter_inner_mm": diameter_inner_mm,
        "diameter_outer_mm": diameter_outer_mm,
        "length_mm": length_mm,
        "angle_deg": angle_deg,
        "supplier_range": supplier_range,
        "technology_type": technology_type,
        "component_role": component_role,
        "finish_color": finish_color,
        "source_file": source_file,
        "source_system": "CSV_SUPPLIER_IMPORT",
        "import_batch_id": import_batch_id,
        "normalization_status": "needs_review",
        "normalization_source": "csv_mapping_v1",
        "parser_version": "supplier_mapper_v2",
        # À valider côté RPC LOT 0 : nom exact attendu.
        "ignored_field_names": detect_ignored_field_names(row),
    }

    return item, None


def main():
    dry_run = "--dry-run" in sys.argv
    args = [arg for arg in sys.argv[1:] if arg != "--dry-run"]

    if len(args) != 2:
        stderr(
            "Usage: python map_supplier.py "
            "<fichier.csv> <fournisseur> [--dry-run]"
        )
        sys.exit(1)

    csv_path = args[0]
    supplier_key = args[1].lower()

    if not Path(csv_path).exists():
        stderr(f"[ERROR] fichier introuvable: {csv_path}")
        sys.exit(1)

    if supplier_key not in SUPPLIER_CONFIGS:
        stderr(f"[ERROR] fournisseur inconnu: {supplier_key}")
        sys.exit(1)

    config = SUPPLIER_CONFIGS[supplier_key]

    if config.get("unsupported"):
        stderr(
            f"[ERROR] fournisseur hors scope: "
            f"{supplier_key} - {config.get('unsupported_reason')}"
        )
        sys.exit(1)

    if config.get("dry_run_only") and not dry_run:
        stderr(
            f"[ERROR] {supplier_key} : "
            f"dry-run obligatoire pour ce fournisseur. "
            f"Relancer avec --dry-run."
        )
        sys.exit(1)

    if config.get("dry_run_only"):
        stderr(
            f"[DRY-RUN ONLY] {supplier_key} : "
            f"fournisseur non validé pour import réel. "
            f"Inspecter les résultats avant tout import."
        )

    source_file = Path(csv_path).name
    import_batch_id = str(uuid.uuid4())

    items = []
    skipped = []
    seen_ean = set()

    rows = list(read_csv(csv_path))

    if not rows:
        stderr("[ERROR] fichier vide")
        sys.exit(1)

    if len(rows) > 50000:
        stderr(f"[WARNING] fichier volumineux : {len(rows)} lignes")

    warn_missing_columns(
        rows[0],
        config,
        supplier_key,
        source_file,
    )

    for idx, row in enumerate(rows, start=1):
        raw_ean = pick_first_non_empty(
            row,
            config["ean_candidates"]
        )

        cleaned_ean = (
            re.sub(r"\s+", "", raw_ean.strip()).upper()
            if raw_ean
            else None
        )

        ean_key = cleaned_ean

        if ean_key and ean_key in seen_ean:
            skipped.append({
                "row": idx,
                "original_ref": raw_ean,
                "reason": "duplicate_ean_in_file",
            })
            continue

        item, reason = map_row(
            row=row,
            config=config,
            source_file=source_file,
            import_batch_id=import_batch_id,
        )

        if reason:
            skipped.append({
                "row": idx,
                "original_ref": (
                    cleaned_ean
                    or row.get("supplier_ref")
                    or row.get("reference")
                    or row.get("default_code")
                    or ""
                ),
                "reason": reason,
            })
            continue

        items.append(item)

        if ean_key:
            seen_ean.add(ean_key)

    if dry_run:
        prices = [
            item["tarif_price"]
            for item in items
            if item.get("tarif_price") is not None
        ]

        reasons = {}

        for s in skipped:
            reasons[s["reason"]] = reasons.get(s["reason"], 0) + 1

        # MODIFICATION 3 — taux d'ignorés calculé une seule fois, affiché dans dry-run
        total = len(items) + len(skipped)
        skip_rate = (len(skipped) / total) if total else 0

        if len(items) == 0:
            stderr("[DRY-RUN][ABORT WOULD TRIGGER] aucun item valide généré")

        if total > 0 and len(skipped) / total > 0.5:
            stderr(
                f"[DRY-RUN][ABORT WOULD TRIGGER] "
                f"trop de lignes ignorées : {len(skipped)}/{total}"
            )

        skipped_path = write_skipped_file(
            csv_path,
            source_file,
            skipped,
            dry_run=True,
        )

        stderr("[DRY-RUN] résultats sans import :")
        stderr(f"  items valides    : {len(items)}")
        stderr(f"  items ignorés    : {len(skipped)}")
        stderr(f"  taux ignoré      : {skip_rate:.1%}")

        if prices:
            stderr(f"  prix min         : {min(prices):.2f}")
            stderr(f"  prix max         : {max(prices):.2f}")
            stderr(f"  prix moyen       : {sum(prices) / len(prices):.2f}")
        else:
            stderr("  prix min         : N/A")
            stderr("  prix max         : N/A")
            stderr("  prix moyen       : N/A")

        stderr(f"  raisons skips    : {reasons}")
        stderr(f"  batch_id (prévu) : {import_batch_id}")
        stderr(f"  skipped          : {skipped_path}")
        sys.exit(0)

    # MODIFICATION 4 — taux d'ignorés calculé une seule fois, affiché en exécution réelle
    total = len(items) + len(skipped)
    skip_rate = (len(skipped) / total) if total else 0

    if len(items) == 0:
        stderr("[ABORT] aucun item valide généré")
        sys.exit(1)

    if total > 0 and len(skipped) / total > 0.5:
        stderr(f"[ABORT] trop de lignes ignorées : {len(skipped)}/{total}")
        sys.exit(2)

    skipped_path = write_skipped_file(
        csv_path,
        source_file,
        skipped,
        dry_run=False,
    )

    json.dump(
        items,
        sys.stdout,
        ensure_ascii=False,
        indent=2
    )

    stderr(f"[OK] {source_file}")
    stderr(f"  items générés  : {len(items)}")
    stderr(f"  items ignorés  : {len(skipped)}")
    stderr(f"  taux ignoré    : {skip_rate:.1%}")

    reasons = {}

    for s in skipped:
        reasons[s["reason"]] = reasons.get(s["reason"], 0) + 1

    for reason, count in reasons.items():
        stderr(f"  {reason} : {count}")

    stderr(f"  batch_id       : {import_batch_id}")
    stderr(f"  skipped        : {skipped_path}")


if __name__ == "__main__":
    main()
