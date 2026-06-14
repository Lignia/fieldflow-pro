#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
map_supplier.py

Usage:
  python map_supplier.py <fichier.csv> <fournisseur> > output.json
  python map_supplier.py <fichier.csv> <fournisseur> --dry-run

Python 3.9+
Dépendances stdlib uniquement :
  csv, json, re, sys, uuid, pathlib, unicodedata, datetime
"""

import csv
import json
import re
import sys
import uuid
import unicodedata
from datetime import date
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


# ─── Matrice Poujoulat : of_seller_product_category_name → (item_family, product_type) ───
#
# Source : POUJOULAT_ITEM_FAMILY_MATRIX_V1.md (figé juin 2026)
# Clé du mapping : of_seller_product_category_name après normalize_columns() puis
#   resolve_category() → re.sub(r"[^a-z0-9]+", "_", cat.lower()).strip("_")
# 126 entrées couvrant 100 % des 16 529 lignes Poujoulat.
#
# item_family : 8 valeurs parmi les 13 autorisées par le CHECK V1 :
#   sortie_toiture | accessoire_fumisterie | systeme_etanche | conduit_principal
#   gaine_technique | tubage_flexible | tubage_rigide | adaptateur_transition
#
# product_type : 'part' (fumisterie physique) ou 'consumable' (consommables explicites).
#   Aucun 'appliance' identifié dans le corpus audité Poujoulat.
#
# Catégorie absente de cette matrice → triplet uncertain dans resolve_category().
# Ne jamais ajouter de valeur item_family hors des 13 officielles.

POUJOULAT_CATEGORY_MAP = {
    # ── A. sortie_toiture — gamme ST.. ──────────────────────────────────────
    "st_tcp":   ("sortie_toiture", "part"),   # ST../TCP  chapeaux terre cuite
    "st_sti":   ("sortie_toiture", "part"),   # ST../STI  sorties inox
    "st_opti":  ("sortie_toiture", "part"),   # ST../OPTI chapeaux Optimale
    "st_trp":   ("sortie_toiture", "part"),   # ST../TRP  chapeaux crépi
    "st_lum":   ("sortie_toiture", "part"),   # ST../LUM  chapeaux France Design
    "st_stb":   ("sortie_toiture", "part"),   # ST../STB  sortie STB
    "st_stf":   ("sortie_toiture", "part"),   # ST../STF  sortie STF
    "st_stp":   ("sortie_toiture", "part"),   # ST../STP  embases étanchéité Provence
    "st_stvr":  ("sortie_toiture", "part"),   # ST../STVR sortie STMP Noirmoutier
    "st_stbp":  ("sortie_toiture", "part"),   # ST../STBP sortie STBP
    "st_stdc":  ("sortie_toiture", "part"),   # ST../STDC embase étanchéité
    "st_stl":   ("sortie_toiture", "part"),   # ST../STL  sortie Languedoc
    "st_stps":  ("sortie_toiture", "part"),   # ST../STPS sortie "S" Provence
    "st_stvf":  ("sortie_toiture", "part"),   # ST../STVF sortie Vendée faîtage
    "st":       ("sortie_toiture", "part"),   # ST.. seul  bandeaux décor sortie
    "st_strp":  ("sortie_toiture", "part"),   # ST../STRP embase étanchéité
    "st_shp":   ("sortie_toiture", "part"),   # ST../SHP  embase multi ardoise
    "st_auc":   ("sortie_toiture", "part"),   # ST../AUC  kit France Classique ST
    # Sous-gammes ST rattachées accessoires / conduit isolé
    "st_inox":  ("accessoire_fumisterie", "part"),  # ST../INOX  pattes, colliers inox
    "st_acdo":  ("accessoire_fumisterie", "part"),  # ST../ACDO  colliers de soutien
    "st_galv":  ("accessoire_fumisterie", "part"),  # ST../GALV  colliers galva
    "st_fiso":  ("conduit_principal",     "part"),  # ST../FISO  conduit isolé Liss-Iso
    "st_acth":  ("accessoire_fumisterie", "part"),  # ST../ACTH  déflecteurs pluie
    "st_fix":   ("accessoire_fumisterie", "part"),  # ST../FIX   cadres de fixation
    "st_fixo":  ("accessoire_fumisterie", "part"),  # ST../FIXO  cadre fixation Optimale
    # ── B. accessoire_fumisterie — gammes THRM, FUMI, CHP, GRLA, OUT, PRO, ──
    #        PPTH, PPMI, ESS, AXAF, WAXC, KITI, SANS ──────────────────────────
    "thrm_acth":  ("accessoire_fumisterie", "part"),      # THRM/ACTH adaptateurs, raccords
    "thrm_thti":  ("accessoire_fumisterie", "part"),      # THRM/THTI carters, silencieux titane
    "thrm_thzi":  ("accessoire_fumisterie", "part"),      # THRM/THZI colliers assemblage zinc
    "thrm_cuiv":  ("accessoire_fumisterie", "part"),      # THRM/CUIV chapeaux cuivre
    "fumi":       ("accessoire_fumisterie", "part"),      # FUMI seul  HV design
    "fumi_emai":  ("accessoire_fumisterie", "part"),      # FUMI/EMAI adaptateurs émaillés
    "fumi_alue":  ("accessoire_fumisterie", "part"),      # FUMI/ALUE chapeaux aluminiés
    "fumi_304s":  ("accessoire_fumisterie", "part"),      # FUMI/304S adaptateurs inox 304
    "fumi_acie":  ("accessoire_fumisterie", "part"),      # FUMI/ACIE adaptateurs acier
    "fumi_soi8":  ("accessoire_fumisterie", "part"),      # FUMI/SOI8 adaptateur conique
    "fumi_si":    ("accessoire_fumisterie", "part"),      # FUMI/SI   cône anticondens
    "chp_chp":    ("accessoire_fumisterie", "part"),      # CHP/CHP   colliers muraux
    "grla_nc":    ("accessoire_fumisterie", "part"),      # GRLA/NC   boîtiers de buse
    "out_bubb":   ("accessoire_fumisterie", "part"),      # OUT/BUBB  hérissons Bubbles
    "out_brou":   ("accessoire_fumisterie", "part"),      # OUT/BROU  brosses ramonage
    "out_colo":   ("accessoire_fumisterie", "part"),      # OUT/COLO  accessoires Colo
    "out_veni":   ("accessoire_fumisterie", "part"),      # OUT/VENI  accessoires Venitian
    "pro_nc":     ("accessoire_fumisterie", "part"),      # PRO/NC    bistre/ramonage
    "pro_dero":   ("accessoire_fumisterie", "part"),      # PRO/DERO  dérouleurs
    "pro_aspi":   ("accessoire_fumisterie", "part"),      # PRO/ASPI  aspirateurs outillage
    "pro":        ("accessoire_fumisterie", "part"),      # PRO seul  bouchons divers
    "ppth_nc":    ("accessoire_fumisterie", "part"),      # PPTH/NC   cache-plinthes
    "ppmi_nc":    ("accessoire_fumisterie", "consumable"),# PPMI/NC   colle (consommable)
    "ess":        ("accessoire_fumisterie", "part"),      # ESS       grilles crème
    "ess_nc":     ("accessoire_fumisterie", "part"),      # ESS/NC    kit air foyer
    "axaf_nc":    ("accessoire_fumisterie", "consumable"),# AXAF/NC   peinture (consommable)
    "waxc_nc":    ("accessoire_fumisterie", "part"),      # WAXC/NC   bride murale
    "kiti":       ("accessoire_fumisterie", "part"),      # KITI      cadres de fixation kit
    "kiti_nc":    ("accessoire_fumisterie", "part"),      # KITI/NC   raccords haut/conduit
    "kiti_actu":  ("accessoire_fumisterie", "part"),      # KITI/ACTU adaptateurs hauteur
    # SANS/SANS_AUC : valeur source explicite — cartographiés (note matrice V1)
    "sans":       ("accessoire_fumisterie", "part"),      # SANS      sans catégorie (repli)
    "sans_auc":   ("accessoire_fumisterie", "part"),      # SANS/AUC  sans catégorie (repli)
    # ── C. systeme_etanche — gammes DUAL, TP3E, KT, KTAC, TFUM ─────────────
    "dual_pgi":   ("systeme_etanche", "part"),  # DUAL/PGI  Dualis concentrique étanche PGI
    "dual_ei":    ("systeme_etanche", "part"),  # DUAL/EI   Dualis étanche intérieur
    "dual_flex":  ("systeme_etanche", "part"),  # DUAL/FLEX Dualis flexible étanche
    "dual_gp":    ("systeme_etanche", "part"),  # DUAL/GP   Dualis grand passage
    "dual_ep":    ("systeme_etanche", "part"),  # DUAL/EP   Dualis colliers platine
    "dual_ga":    ("systeme_etanche", "part"),  # DUAL/GA   Dualis adaptateurs gaz
    "dual_ea":    ("systeme_etanche", "part"),  # DUAL/EA   Dualis colliers
    "dual_3ce":   ("systeme_etanche", "part"),  # DUAL/3CE  conduit liaison 3CE
    "dual_da":    ("systeme_etanche", "part"),  # DUAL/DA   colliers Dualis
    "dual_bf":    ("systeme_etanche", "part"),  # DUAL/BF   joints à lèvre EI
    "dual_ca":    ("systeme_etanche", "part"),  # DUAL/CA   colliers ext.
    "dual_fi":    ("systeme_etanche", "part"),  # DUAL/FI   solin tuile F.I
    "dual_pp":    ("systeme_etanche", "part"),  # DUAL/PP   té de purge PPA
    "dual":       ("systeme_etanche", "part"),  # DUAL seul coudes concentriques
    "tp3e_tpac":  ("systeme_etanche", "part"),  # TP3E/TPAC tubage 3CE étanche membrane
    "tp3e_tpeg":  ("systeme_etanche", "part"),  # TP3E/TPEG adaptations EF PGI
    "tp3e_tpei":  ("systeme_etanche", "part"),  # TP3E/TPEI adaptateurs EF buse
    "kt":         ("systeme_etanche", "part"),  # KT        kits d'étanchéité
    "ktac_nc":    ("systeme_etanche", "part"),  # KTAC/NC   kit air direct étanche
    "tfum_tcle":  ("systeme_etanche", "part"),  # TFUM/TCLE kit Top Clean
    "tfum_cozr":  ("systeme_etanche", "part"),  # TFUM/COZR catalyseur Zéro CO
    # ── D. conduit_principal — gammes COND, THplus, 3CEP, THD ───────────────
    "cond_cosd":    ("conduit_principal", "part"),  # COND/COSD  conduits CD carters
    "cond_cotf":    ("conduit_principal", "part"),  # COND/COTF  conduits CD éléments+trappes
    "cond_vh":      ("conduit_principal", "part"),  # COND/VH    éléments coudés VH
    "cond_casc":    ("conduit_principal", "part"),  # COND/CASC  adaptateurs B23P
    "cond_cde":     ("conduit_principal", "part"),  # COND/CDE   joint condensor
    "cond":         ("conduit_principal", "part"),  # COND seul  élément trappe visite
    "thplus_g050":  ("conduit_principal", "part"),  # THplus/G050 THERM+ GEP50 conduit isolé
    "thplus_g100":  ("conduit_principal", "part"),  # THplus/G100 THERM+ GEP100 conduit isolé
    "3cep_mplusin": ("conduit_principal", "part"),  # 3CEP/MplusIN 3CE Plus Multi+ intérieur
    "3cep_reno":    ("conduit_principal", "part"),  # 3CEP/RENO  3CE Plus rénovation Renoshunt
    "3cep_mplusex": ("conduit_principal", "part"),  # 3CEP/MplusEX 3CE Plus Multi+ extérieur
    "3cep_m_in":    ("conduit_principal", "part"),  # 3CEP/M+IN  3CE solin toit plat
    "3cep":         ("conduit_principal", "part"),  # 3CEP seul  joint 3CETHD
    "thd":          ("conduit_principal", "part"),  # THD        3CETHD bouchons
    "thd_racc":     ("conduit_principal", "part"),  # THD/RACC   conduit raccordement THD
    # ── E. tubage_flexible — gamme TIFL ─────────────────────────────────────
    "tifl_star":  ("tubage_flexible", "part"),  # TIFL/STAR  Starflex lisse
    "tifl_st12":  ("tubage_flexible", "part"),  # TIFL/ST12  Starflex 12/100
    "tifl_kita":  ("tubage_flexible", "part"),  # TIFL/KITA  kit alu tubage
    "tifl_llis":  ("tubage_flexible", "part"),  # TIFL/LLIS  flex lisse
    "tifl_lhrl":  ("tubage_flexible", "part"),  # TIFL/LHRL  flex lisse
    "tifl_flgf":  ("tubage_flexible", "part"),  # TIFL/FLGF  flex inox GF étanche
    "tifl_acou":  ("tubage_flexible", "part"),  # TIFL/ACOU  flexalu acoustique
    "tifl_ther":  ("tubage_flexible", "part"),  # TIFL/THER  flexalu thermique
    "tifl_flis":  ("tubage_flexible", "part"),  # TIFL/FLIS  flexible inox lisse
    "tifl_gfle":  ("tubage_flexible", "part"),  # TIFL/GFLE  flexible air
    "tifl_ala5":  ("tubage_flexible", "part"),  # TIFL/ALA5  flexible alu
    "tifl_valu":  ("tubage_flexible", "part"),  # TIFL/VALU  ventil alu flexible
    "tifl_falu":  ("tubage_flexible", "part"),  # TIFL/FALU  flexalu
    "tifl_phon":  ("tubage_flexible", "part"),  # TIFL/PHON  phoni alu
    "tifl_lisa":  ("tubage_flexible", "part"),  # TIFL/LISA  flexible lisse
    # ── F. tubage_rigide — gamme TIRI ───────────────────────────────────────
    "tiri_tubo":  ("tubage_rigide", "part"),    # TIRI/TUBO  adaptateurs rond/ovale
    # ── G. adaptateur_transition — gammes AXCO, AXTU ────────────────────────
    "axco_nc":    ("adaptateur_transition", "part"),  # AXCO/NC    adaptateurs conduit
    "axco_flac":  ("adaptateur_transition", "part"),  # AXCO/FLAC  adaptateurs sur buse
    "axco_fiso":  ("accessoire_fumisterie", "part"),  # AXCO/FISO  coquilles isolantes
    "axco_point": ("adaptateur_transition", "part"),  # AXCO/.     raccords inox émail
    "axco_regu":  ("accessoire_fumisterie", "part"),  # AXCO/REGU  régulateurs
    "axco_actu":  ("accessoire_fumisterie", "part"),  # AXCO/ACTU  chapeaux cône finition
    "axco_casc":  ("accessoire_fumisterie", "part"),  # AXCO/CASC  cache air comburant
    "axtu_nc":    ("adaptateur_transition", "part"),  # AXTU/NC    adaptateurs tubage clips
    "axtu":       ("adaptateur_transition", "part"),  # AXTU seul  kit raccord tubage
    # ── H. gaine_technique — gammes VENT, ASFU ──────────────────────────────
    "vent_vmc":   ("gaine_technique", "part"),  # VENT/VMC   boîtiers galva VMC
    "vent_vacc":  ("gaine_technique", "part"),  # VENT/VACC  accessoires ventilation
    "vent_gfle":  ("gaine_technique", "part"),  # VENT/GFLE  flexible air ventilation
    "vent_galv":  ("gaine_technique", "part"),  # VENT/GALV  STB I/G ventilation
    "vent":       ("gaine_technique", "part"),  # VENT seul  bande alu adhésive
    "asfu_elec":  ("gaine_technique", "part"),  # ASFU/ELEC  boîtiers relais aspiration
    "asfu_roto":  ("gaine_technique", "part"),  # ASFU/ROTO  adaptateurs aspiration
    "asfu_stat":  ("gaine_technique", "part"),  # ASFU/STAT  aspirateur statique
}


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
        # Clé de catégorie structurée Poujoulat (après normalize_columns)
        # Valeur brute CSV : "of_seller_product_category_name"
        # Après normalisation : minuscules, sans accents, séparateurs → _
        "category_column": "of_seller_product_category_name",
        "category_map": POUJOULAT_CATEGORY_MAP,
        # Date du tarif source pour valid_from (Option A / P-00b)
        # Si None : valid_from = date d'import courante
        "tarif_date": None,
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
    # BLOC 1 — Lorflex : distributeur multi-fabricants
    # manufacturer_name_column = "frs" : le fabricant réel est lu
    # depuis la colonne CSV "frs" et écrase manufacturer_name par ligne.
    "lorflex": {
        "manufacturer_name": "Lorflex",
        "distributor_name": "Lorflex",
        "brand": "Lorflex",
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
        "manufacturer_name_column": "frs",
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


def resolve_category(
    row,
    config,
    fix_encoding,
    item_family_fallback,
):
    """
    CORRECTION 1 + 2 + 3 : lecture catégorie source, dérivation item_family
    et product_type via la matrice fournisseur.

    Retourne un dict avec les clés :
      item_family          : str ou None
      product_type         : str ('part'|'appliance'|'service'|'consumable')
      data_quality_status  : 'complete'|'partial'|'uncertain'
      needs_human_review   : bool
      review_reason        : str ou None
      unmapped_category    : str ou None  (pour le rapport dry-run)

    Règle de résolution data_quality_status (hors valid_from) :
      - catégorie indéterminable ou non cartographiée → 'uncertain'
      - sinon → 'complete'  (valid_from peut upgrader à 'partial' dans map_row)

    Jamais 'needs_review' — ce concept est porté par needs_human_review/review_reason.
    """
    category_column = config.get("category_column")
    category_map = config.get("category_map")

    # Si pas de matrice configurée pour ce fournisseur :
    # utiliser le fallback item_family/family/famille existant
    if not category_column or not category_map:
        return {
            "item_family": item_family_fallback,
            "product_type": "part",  # valeur par défaut safe pour fournisseurs sans matrice
            "data_quality_status": "complete",
            "needs_human_review": False,
            "review_reason": None,
            "unmapped_category": None,
        }

    # Correction 1 : lire la catégorie structurée AVANT le fallback
    raw_category = clean_string(
        row.get(category_column),
        fix_encoding=fix_encoding,
    )

    # Fallback : colonnes génériques si catégorie structurée absente
    if not raw_category:
        if item_family_fallback:
            return {
                "item_family": item_family_fallback,
                "product_type": "part",
                "data_quality_status": "complete",
                "needs_human_review": False,
                "review_reason": None,
                "unmapped_category": None,
            }
        # Aucune source de catégorie disponible
        return {
            "item_family": None,
            "product_type": "part",
            "data_quality_status": "uncertain",
            "needs_human_review": True,
            "review_reason": "catégorie fournisseur non cartographiée",
            "unmapped_category": "(aucune catégorie source)",
        }

    # Correction 2 + 3 : dériver via la matrice
    # Normalisation de la clé : minuscules, sans accents, tout séparateur → _
    cat_key = strip_accents(raw_category.lower())
    cat_key = re.sub(r"[^a-z0-9]+", "_", cat_key).strip("_")
    # Tentative clé composée exacte, puis premier token en fallback
    mapping = category_map.get(cat_key)
    if mapping is None:
        first_token = cat_key.split("_")[0]
        mapping = category_map.get(first_token)

    if mapping is None:
        # Catégorie réellement absente de la matrice → triplet uncertain
        return {
            "item_family": None,
            "product_type": "part",  # valeur conservative
            "data_quality_status": "uncertain",
            "needs_human_review": True,
            "review_reason": "catégorie fournisseur non cartographiée",
            "unmapped_category": raw_category,
        }

    item_family_resolved, product_type_resolved = mapping

    # product_type=None dans la matrice = catégorie ambigüe
    # Pas de devinette → triplet uncertain
    if product_type_resolved is None:
        return {
            "item_family": None,
            "product_type": "part",  # valeur conservative
            "data_quality_status": "uncertain",
            "needs_human_review": True,
            "review_reason": "catégorie fournisseur non cartographiée",
            "unmapped_category": raw_category,
        }

    return {
        "item_family": item_family_resolved,
        "product_type": product_type_resolved,
        "data_quality_status": "complete",
        "needs_human_review": False,
        "review_reason": None,
        "unmapped_category": None,
    }


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

    # R-01 : supplier_ref = code brut fournisseur, jamais uppercasé
    supplier_ref = (
        re.sub(r"\s+", "", supplier_ref_raw.strip())
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

    # item_family fallback générique (colonnes directes)
    # Lue avant resolve_category pour être passée en fallback
    item_family_fallback = clean_string(
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

    # BLOC 2 — description_fabricant : colonne directe ou variante Odoo multi-niveau
    description_fabricant = clean_string(
        row.get("description_fabricant")
        or row.get(
            "product_variant_ids/description_fabricant"
        ),
        fix_encoding=fix_encoding,
    )

    vat_rate = config["vat_default"]

    # ── CORRECTIONS 1+2+3 : catégorie → item_family + product_type + statut qualité ──
    cat_result = resolve_category(
        row=row,
        config=config,
        fix_encoding=fix_encoding,
        item_family_fallback=item_family_fallback,
    )
    item_family         = cat_result["item_family"]
    product_type        = cat_result["product_type"]
    data_quality_status = cat_result["data_quality_status"]
    needs_human_review  = cat_result["needs_human_review"]
    review_reason       = cat_result["review_reason"]
    unmapped_category   = cat_result["unmapped_category"]

    # ── CORRECTION 4 : valid_from (Option A / P-00b) ─────────────────────────────
    # Priorité : date tarif source (config["tarif_date"]) > colonne CSV > date import
    # R-04 / I-03 : jamais NULL en sortie.
    tarif_date_config = config.get("tarif_date")
    if tarif_date_config:
        # Date du tarif explicitement connue dans la config fournisseur
        valid_from = tarif_date_config
        if data_quality_status == "complete":
            data_quality_status = "complete"  # date connue, source = tarif
    else:
        # Chercher une colonne de date dans le CSV
        date_col_val = clean_string(
            row.get("date_tarif")
            or row.get("tarif_date")
            or row.get("valid_from")
            or row.get("date_validite")
        )
        if date_col_val:
            valid_from = date_col_val
            if data_quality_status == "complete":
                data_quality_status = "complete"
        else:
            # Fallback : date d'import courante → data_quality_status = 'partial'
            # sauf si déjà 'uncertain' (priorité : uncertain > partial)
            valid_from = date.today().isoformat()
            if data_quality_status == "complete":
                data_quality_status = "partial"
            # 'uncertain' reste 'uncertain' même si valid_from est la date du jour

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
        # BLOC 2
        "description_fabricant": description_fabricant,
        "source_file": source_file,
        "source_system": "CSV_SUPPLIER_IMPORT",
        "import_batch_id": import_batch_id,
        "normalization_status": "needs_review",
        "normalization_source": "csv_mapping_v1",
        "parser_version": "supplier_mapper_v2",
        "ignored_field_names": detect_ignored_field_names(row),
        # CORRECTIONS 2+3 : catégorie dérivée
        "item_family": item_family,
        "product_type": product_type,
        # CORRECTION 4 : valid_from (jamais NULL)
        "valid_from": valid_from,
        # Statut qualité : triplet cohérent, jamais 'needs_review'
        "data_quality_status": data_quality_status,
        "needs_human_review": needs_human_review,
        "review_reason": review_reason,
        # Pour dry-run rapport seulement (filtré par SAFE_FIELDS à l'import)
        "_unmapped_category": unmapped_category,
    }

    # BLOC 3 — manufacturer_name_column : écrase manufacturer_name par ligne
    if config.get("manufacturer_name_column"):
        col = config["manufacturer_name_column"]
        val = clean_string(
            row.get(col),
            fix_encoding=fix_encoding
        )
        if val and val not in ("#N/A", "N/A", ""):
            item["manufacturer_name"] = val

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
    unmapped_categories = {}  # catégorie_source → count (pour rapport dry-run)

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

        # Comptage des catégories non cartographiées pour le rapport
        uncat = item.get("_unmapped_category")
        if uncat:
            unmapped_categories[uncat] = unmapped_categories.get(uncat, 0) + 1

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

        uncertain_count = sum(
            1 for it in items
            if it.get("data_quality_status") == "uncertain"
        )
        partial_count = sum(
            1 for it in items
            if it.get("data_quality_status") == "partial"
        )
        complete_count = sum(
            1 for it in items
            if it.get("data_quality_status") == "complete"
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

        stderr(f"  data_quality : complete={complete_count} partial={partial_count} uncertain={uncertain_count}")

        if unmapped_categories:
            stderr(f"  catégories non cartographiées ({len(unmapped_categories)}) :")
            for cat, cnt in sorted(unmapped_categories.items(), key=lambda x: -x[1]):
                stderr(f"    {cat!r} : {cnt} articles")
        else:
            stderr("  catégories non cartographiées : aucune")

        stderr(f"  raisons skips    : {reasons}")
        stderr(f"  batch_id (prévu) : {import_batch_id}")
        stderr(f"  skipped          : {skipped_path}")
        sys.exit(0)

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
