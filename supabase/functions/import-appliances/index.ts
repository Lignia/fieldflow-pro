import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-brand-name, x-catalog-year",
};

const respond = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// ================================================================
// RÈGLES MÉTIER ABSOLUES (ne jamais déroger dans cette fonction)
// ----------------------------------------------------------------
// data_source depuis un catalogue fabricant  = 'manufacturer'
// ademe_fonds_air_bois_status                = 'unknown'
// flamme_verte_status                        = 'to_verify'
// Ces statuts ne passent à 'confirmed' QUE via le pipeline
// de matching ADEME / Flamme Verte officiel, jamais ici.
// "7★ / A+" dans un catalogue = classe énergie EcoDesign,
// PAS le label Flamme Verte.
// ================================================================

// ── Utilitaires ──────────────────────────────────────────────────

const toNum = (s: string | undefined): number | null => {
  if (!s || s.trim() === "" || s.trim() === "-") return null;
  const n = parseFloat(s.replace(",", ".").replace(/\s/g, ""));
  return isNaN(n) ? null : n;
};

const toBool = (s: string | undefined): boolean | null => {
  if (!s) return null;
  const v = s.trim().toLowerCase();
  if (["oui","yes","true","1","o","de série","de serie"].includes(v)) return true;
  if (["non","no","false","0"].includes(v)) return false;
  return null;
};

const toInt = (s: string | undefined): number | null => {
  const n = toNum(s);
  return n !== null ? Math.round(n) : null;
};

const parseRange = (s: string | undefined): [number|null, number|null] => {
  if (!s) return [null, null];
  const m = s.replace(",",".").match(/(\d+\.?\d*)\s*(?:à|-)\s*(\d+\.?\d*)/);
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  const single = toNum(s);
  return [single, single];
};

const parseFinitions = (s: string | undefined): string[] | null => {
  if (!s || s.trim() === "") return null;
  return s.split(/[,;/]/).map(f => f.trim()).filter(Boolean);
};

const normalizeFlueExit = (s: string | undefined): string | null => {
  if (!s) return null;
  const v = s.toLowerCase();
  if (v.includes("concentrique")) return "Concentrique";
  if (v.includes("dessus") && v.includes("arr")) return "D/A";
  if (v.includes("dessus")) return "D";
  if (v.includes("arri")) return "A";
  if (v.includes("bas") || v.includes("bottom")) return "B";
  return s.trim();
};

const normalizeApplianceType = (s: string | undefined): string => {
  if (!s) return "poele";
  const v = s.toLowerCase();
  if (v.includes("insert") || v.includes("foyer")) return "insert";
  if (v.includes("chaudiere") || v.includes("chaudière") ||
      v.includes("cuisiniere") || v.includes("cuisinière")) return "chaudiere";
  return "poele";
};

const normalizeFuelType = (s: string | undefined, isHybrid: boolean): string => {
  if (isHybrid) return "mixte";
  if (!s) return "autre";
  const v = s.toLowerCase();
  if (v.includes("granul") || v.includes("pellet")) return "granules";
  if (v.includes("bois") || v.includes("buche") || v.includes("bûche")) return "bois_buche";
  if (v.includes("mixte") || v.includes("hybrid")) return "mixte";
  return "autre";
};

const normalizeText = (s: string): string =>
  s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// ── Parser CSV générique ──────────────────────────────────────────

function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.replace(/\r\n/g,"\n").replace(/\r/g,"\n").split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };
  const sample = lines[0];
  const sep = sample.includes("\t") ? "\t"
    : sample.split(";").length > sample.split(",").length ? ";" : ",";
  const parseRow = (line: string): string[] =>
    line.split(sep).map(c => c.replace(/^"|"$/g,"").trim());
  const headers = parseRow(lines[0]).map(h =>
    h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9_]/g,"_"));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? ""; });
    rows.push(row);
  }
  return { headers, rows };
}

// ── Mapper une ligne CSV → mapped_payload ─────────────────────────

function mapRow(
  row: Record<string, string>,
  brandName: string,
  sourceCatalog: string
): { raw_brand: string; raw_model: string; normalized_brand: string;
     normalized_model: string; fuel_type: string; nominal_power_kw: number | null;
     payload: Record<string, unknown> } | null {

  const name =
    row["product_name"] || row["designation"] || row["nom"] ||
    row["modele"] || row["model"] || "";
  if (!name || name.length < 2) return null;

  const description = row["product_description"] || row["description"] || null;
  const isHybrid = !!(toBool(row["is_hybrid"]) ||
    (description && description.toLowerCase().includes("hybride")) ||
    (name.toLowerCase().includes("hybride")));

  const applianceTypeRaw =
    row["product_category_raw"] || row["designation_categorie"] ||
    row["type"] || row["categorie"] || "";
  const fuelRaw =
    row["type_combustible"] || row["combustible"] ||
    description || applianceTypeRaw;

  const [powerMin, powerMax] = parseRange(
    row["modulation_de_puissance_kw"] || row["puissance_min_max_kw"] ||
    row["puissance_min"] || "");
  const [consumMin, consumMax] = parseRange(
    row["consommation_horaire"] || row["consommation"] || "");
  const [autonomyMin, autonomyMax] = parseRange(
    row["autonomie"] || row["autonomie_combustion_prolongee"] || "");
  const [surfaceMin, surfaceMax] = parseRange(
    row["surface_de_chauffe_m2"] || row["surface_chauffe"] || row["surface"] || "");
  const [volumeMin, volumeMax] = parseRange(
    row["volume_de_chauffe_m3"] || row["volume_chauffe"] || "");

  const nominalPower = toNum(
    row["puissance_optimale_kw"] || row["puissance_nominale_kw"] ||
    row["puissance_kw"] || row["puissance"]);

  const fuelType = normalizeFuelType(fuelRaw, isHybrid);

  const aideText = (toBool(row["eligible_aides"] || row["eligible_aide"]) === true)
    ? "Éligible aides (à vérifier avec registre ADEME officiel)"
    : null;

  const payload: Record<string, unknown> = {
    data_source: "manufacturer",
    source_catalog: sourceCatalog,
    source_confidence: 1.0,
    raw_brand: brandName,
    raw_model: name,
    normalized_brand: brandName.toUpperCase(),
    normalized_model: name,
    commercial_name: name,
    appliance_type: normalizeApplianceType(applianceTypeRaw),
    fuel_type: fuelType,
    is_hybrid: isHybrid,
    product_category_raw: applianceTypeRaw || null,
    manufacturer_ref:
      row["ref"] || row["reference"] || row["code"] || row["ref_fabricant"] || null,
    nominal_power_kw: nominalPower,
    power_min_kw: powerMin,
    power_max_kw: powerMax,
    efficiency_pct: toNum(row["rendement_percent"] || row["rendement"]),
    eco_design_iee_pct:
      toNum(row["eco_design_iee_percent"] || row["eco_design_iee"] || row["iee"]),
    energy_class:
      row["flamme_verte_classe_energie"] || row["classe_energie"] ||
      row["etiquette_energie"] || row["energie"] || null,
    heating_capacity_m3: volumeMin !== null ? Math.round(volumeMin) :
      toInt(row["volume_de_chauffe_m3"] || row["volume_chauffe"] || row["volume"]),
    heating_capacity_m3_max: volumeMax !== null && volumeMax !== volumeMin
      ? Math.round(volumeMax) : null,
    heating_surface_m2_min: surfaceMin ? Math.round(surfaceMin) : null,
    heating_surface_m2_max: surfaceMax ? Math.round(surfaceMax) : null,
    co_emission_mg_nm3:
      toNum(row["taux_de_co_mg_nm3"] || row["co_mg_nm3"] || row["taux_co"]),
    particles_emission_mg_nm3:
      toNum(row["poussieres_mg_nm3"] || row["poussieres"] || row["particules"]),
    cov_ogc_emission_mg_nm3:
      toNum(row["cog_mg_nm3"] || row["ogc_mg_nm3"] || row["cov"] || row["cog"]),
    nox_emission_mg_nm3: toNum(row["nox_mg_nm3"] || row["nox"]),
    en_standard: row["normes"] || row["norme"] || row["standard"] || null,
    flue_diameter_mm:
      toInt(row["diametre_buse_ext"] || row["diametre_buse"] ||
            row["diametre_conduit"] || row["o_conduit"] || row["_conduit"]),
    flue_exit_position:
      normalizeFlueExit(row["sortie_des_fumees"] || row["sortie_fumees"] || row["sortie"]),
    flue_height_from_floor_mm:
      toInt(row["hauteur_de_buse_sol"] || row["hauteur_buse"] || row["hauteur_sortie"]),
    air_intake_diameter_mm:
      toInt(row["o_prise_d_air"] || row["prise_air"] || row["air_intake"]),
    sealed_combustion:
      toBool(row["etanche_rt2012_re2020"] || row["etanche"] || row["combustion_etanche"]),
    is_rt2012_re2020_compatible:
      toBool(row["etanche_rt2012_re2020"] || row["rt2012"] || row["re2020"]),
    is_raccordable: toBool(row["raccordable"]),
    pellet_tank_volume_kg:
      toNum(row["capacite_du_reservoir"] || row["reservoir"] || row["capacite_reservoir"]),
    hourly_consumption_min: consumMin,
    hourly_consumption_max: consumMax,
    autonomy_hours_min: autonomyMin ? Math.round(autonomyMin) : null,
    autonomy_hours_max: autonomyMax ? Math.round(autonomyMax) : null,
    is_canalisable:
      toBool(row["canalise"] || row["canalisable"] || row["is_canalisable"]),
    max_log_length_cm:
      toInt(row["taille_buches"] || row["longueur_buches"] || row["max_log"]),
    log_length_min_cm: null,
    has_post_combustion:
      toBool(row["post_combustion"] || row["postcombustion"]),
    has_extended_combustion:
      toBool(row["combustion_prolongee"] || row["combustion_prolongee"]),
    air_secondary_adjustable:
      toBool(row["air_secondaire_reglable"] || row["air_secondaire"]),
    has_shaker_grate: toBool(row["secoue_grille"] || row["grille"]),
    height_mm: toInt(row["hauteur"]),
    width_mm: toInt(row["largeur"]),
    depth_mm: toInt(row["profondeur"]),
    weight_kg: toNum(row["poids"]),
    has_ash_drawer: toBool(row["tiroir_cendres"] || row["cendrier"]),
    has_wifi: toBool(row["wi_fi"] || row["wifi"]),
    wifi_standard: row["wi_fi"] || row["wifi"] || null,
    has_bluetooth: toBool(row["bluetooth"]),
    has_app_control:
      toBool(row["pilotage_application"] || row["application"] || row["app"]),
    has_thermostat_remote:
      toBool(row["telecommande"] || row["thermostat_deporte"] || row["sonde_deportee"]),
    insert_height_mm:
      toInt(row["hauteur_encastrement"] || row["encombrement_h"]),
    insert_width_mm:
      toInt(row["largeur_encastrement"] || row["encombrement_l"]),
    insert_depth_mm:
      toInt(row["profondeur_encastrement"] || row["encombrement_p"]),
    finish_options:
      parseFinitions(row["finition"] || row["finitions"] || row["couleur"]),
    product_description: description,
    marketing_description: null,
    warranty_years: toInt(row["garantie"]?.replace(/[^0-9]/g, "")),
    warranty_extension_available:
      toBool(row["extension_de_garantie"] || row["extension_garantie"]),
    // RÈGLE ABSOLUE : jamais 'confirmed' depuis un catalogue fabricant
    ademe_fonds_air_bois_status: "unknown",
    flamme_verte_status: "to_verify",
    flamme_verte_stars: null,
    eligible_aides_text: aideText,
    dtu_reference: row["dtu"] || null,
  };

  return {
    raw_brand: brandName,
    raw_model: name,
    normalized_brand: brandName.toUpperCase(),
    normalized_model: normalizeText(name),
    fuel_type: fuelType,
    nominal_power_kw: nominalPower,
    payload,
  };
}

// ── Validation minimale ───────────────────────────────────────────

function validateMappedRow(m: ReturnType<typeof mapRow>): string[] {
  if (!m) return ["row_empty"];
  const errors: string[] = [];
  const p = m.payload;
  if (!p.nominal_power_kw) errors.push("nominal_power_kw manquant");
  if (!p.appliance_type)   errors.push("appliance_type non déterminé");
  if (p.fuel_type === "autre") errors.push("fuel_type non reconnu");
  if (!p.flue_diameter_mm) errors.push("flue_diameter_mm manquant");
  return errors;
}

// ── Handler principal ─────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { status: 200, headers: CORS });
  if (req.method !== "POST")
    return respond({ error: "Method not allowed" }, 405);

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const brandName   = req.headers.get("x-brand-name")   || "Fabricant";
    const catalogYear = req.headers.get("x-catalog-year") || null;
    const sourceCatalog = brandName.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]/g,"_");

    const importBatchId = crypto.randomUUID();

    const ct = req.headers.get("content-type") ?? "";
    let fileContent = "";
    let filename = "unknown";

    if (ct.includes("multipart")) {
      const fd = await req.formData();
      const file = fd.get("file") as File | null;
      if (!file) return respond({ error: "Fichier manquant" }, 400);
      filename = file.name;
      const buf = await file.arrayBuffer();
      const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      fileContent = utf8.includes("\uFFFD")
        ? new TextDecoder("latin1").decode(buf)
        : utf8;
    } else {
      fileContent = await req.text();
    }

    if (!fileContent || fileContent.length < 20)
      return respond({ error: "Fichier vide ou trop court" }, 400);

    const { headers: csvHeaders, rows } = parseCSV(fileContent);
    if (rows.length === 0)
      return respond({ error: "Aucune ligne trouvée dans le fichier" }, 400);

    console.log(`[import-appliances v2] batch=${importBatchId}`);
    console.log(`  brand=${brandName} year=${catalogYear} rows=${rows.length}`);
    console.log(`  headers: ${csvHeaders.slice(0, 8).join(", ")}`);

    const stagingRows: Record<string, unknown>[] = [];
    const rejected: Array<{ line: number; reason: string; raw?: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const mapped = mapRow(rows[i], brandName, sourceCatalog);
      if (!mapped) {
        rejected.push({ line: i + 2, reason: "Nom vide ou ligne invalide",
          raw: rows[i]["product_name"] || rows[i]["designation"] || "" });
        continue;
      }
      const errors = validateMappedRow(mapped);
      stagingRows.push({
        import_batch_id:  importBatchId,
        source_file:      filename,
        source_catalog:   sourceCatalog,
        catalog_year:     catalogYear,
        data_source:      "manufacturer",
        source_page:      null,
        source_row:       i + 2,
        raw_payload:      rows[i],
        mapped_payload:   mapped.payload,
        raw_brand:        mapped.raw_brand,
        raw_model:        mapped.raw_model,
        normalized_brand: mapped.normalized_brand,
        normalized_model: mapped.normalized_model,
        fuel_type:        mapped.fuel_type,
        nominal_power_kw: mapped.nominal_power_kw,
        status:           errors.length === 0 ? "mapped" : "staged",
        validation_errors: errors.length > 0 ? errors : null,
        mapping_notes:    errors.length > 0
          ? `${errors.length} avertissement(s) — vérification manuelle recommandée`
          : null,
      });
    }

    if (stagingRows.length === 0)
      return respond({
        error: "Aucune ligne valide après parsing",
        rejected: rejected.slice(0, 5),
      }, 400);

    // JAMAIS dans heating_appliances directement
    const BATCH = 100;
    let staged = 0;
    const batchErrors: string[] = [];

    for (let i = 0; i < stagingRows.length; i += BATCH) {
      const batch = stagingRows.slice(i, i + BATCH);
      const { error } = await supabase
        .schema("catalog")
        .from("heating_appliance_import_rows")
        .insert(batch);
      if (error) {
        console.error(`Batch ${Math.floor(i/BATCH)} error:`, error.message);
        batchErrors.push(error.message);
      } else {
        staged += batch.length;
      }
    }

    const mappedOk   = stagingRows.filter(r => r.status === "mapped").length;
    const mappedWarn = stagingRows.filter(r => r.status === "staged").length;

    return respond({
      success: true,
      batch_id:       importBatchId,
      brand:          brandName,
      source_catalog: sourceCatalog,
      catalog_year:   catalogYear,
      filename,
      csv_rows:       rows.length,
      staged,
      staged_ok:      mappedOk,
      staged_warn:    mappedWarn,
      rejected:       rejected.length,
      batch_errors:   batchErrors.length,
      rejected_samples: rejected.slice(0, 5),
      applied_rules: [
        "data_source = manufacturer",
        "ademe_fonds_air_bois_status = unknown",
        "flamme_verte_status = to_verify",
        "Aucune insertion dans heating_appliances",
      ],
      sample: stagingRows.slice(0, 3).map(r => ({
        raw_model:        r.raw_model,
        normalized_model: r.normalized_model,
        fuel_type:        r.fuel_type,
        nominal_power_kw: r.nominal_power_kw,
        status:           r.status,
        warnings:         r.validation_errors ?? [],
      })),
    });

  } catch (err) {
    console.error("Unhandled error:", String(err));
    return respond({ error: String(err) }, 500);
  }
});