-- Extension trigram pour fuzzy matching futur
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Schéma catalog (déjà existant normalement, mais idempotent)
CREATE SCHEMA IF NOT EXISTS catalog;

-- ==========================================================
-- Table : catalog.heating_appliances
-- Registre poêles / inserts / chaudières (ADEME + futurs)
-- ==========================================================
CREATE TABLE catalog.heating_appliances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NULL, -- NULL = registre global

  -- Source
  data_source TEXT NOT NULL CHECK (data_source IN ('ademe', 'flamme_verte', 'manual', 'manufacturer')),

  -- Identité (brut + normalisé)
  raw_brand TEXT NOT NULL,
  raw_model TEXT NOT NULL,
  normalized_brand TEXT NOT NULL,
  normalized_model TEXT NOT NULL,

  -- Type appareil
  appliance_type TEXT NOT NULL CHECK (appliance_type IN ('poele', 'insert', 'chaudiere', 'autre')),
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('bois_buche', 'granules', 'mixte', 'autre')),

  -- Performances
  nominal_power_kw NUMERIC(6,2),
  efficiency_pct NUMERIC(5,2),
  cov_ogc_emission_mg_nm3 NUMERIC(8,2),
  co_emission_mg_nm3 NUMERIC(8,2),
  particles_emission_mg_nm3 NUMERIC(8,2),
  nox_emission_mg_nm3 NUMERIC(8,2),

  -- Conformité
  en_standard TEXT,
  standard_obsolete BOOLEAN NOT NULL DEFAULT false,
  ademe_fonds_air_bois_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (ademe_fonds_air_bois_status IN ('confirmed', 'pending', 'unknown', 'not_eligible')),
  flamme_verte_stars SMALLINT CHECK (flamme_verte_stars BETWEEN 0 AND 7),

  -- Audit registre
  registry_entry_date DATE,
  registry_valid_until DATE,

  -- Photos
  manufacturer_image_url TEXT,
  storage_image_path TEXT,
  image_source TEXT CHECK (image_source IN ('manufacturer', 'manual', 'imported')),
  image_updated_at TIMESTAMPTZ,

  -- Audit standard
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique composite : empêche doublons multi-import
  CONSTRAINT heating_appliances_unique_natural_key
    UNIQUE (data_source, normalized_brand, normalized_model, nominal_power_kw, fuel_type)
);

-- ==========================================================
-- Fonction de normalisation (lowercase + unaccent + trim)
-- ==========================================================
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION catalog.normalize_appliance_text(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, catalog
AS $$
  SELECT trim(regexp_replace(
    lower(unaccent(coalesce(input, ''))),
    '\s+', ' ', 'g'
  ));
$$;

-- ==========================================================
-- Trigger : normalisation auto + updated_at
-- ==========================================================
CREATE OR REPLACE FUNCTION catalog.heating_appliances_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, catalog
AS $$
BEGIN
  NEW.normalized_brand := catalog.normalize_appliance_text(NEW.raw_brand);
  NEW.normalized_model := catalog.normalize_appliance_text(NEW.raw_model);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_heating_appliances_before_write
BEFORE INSERT OR UPDATE ON catalog.heating_appliances
FOR EACH ROW EXECUTE FUNCTION catalog.heating_appliances_before_write();

-- ==========================================================
-- Index
-- ==========================================================
CREATE INDEX idx_heating_appliances_tenant ON catalog.heating_appliances (tenant_id);
CREATE INDEX idx_heating_appliances_appliance_type ON catalog.heating_appliances (appliance_type);
CREATE INDEX idx_heating_appliances_fuel_type ON catalog.heating_appliances (fuel_type);
CREATE INDEX idx_heating_appliances_ademe_status ON catalog.heating_appliances (ademe_fonds_air_bois_status);
CREATE INDEX idx_heating_appliances_data_source ON catalog.heating_appliances (data_source);

-- Index trigram pour fuzzy matching
CREATE INDEX idx_heating_appliances_brand_trgm
  ON catalog.heating_appliances USING gin (normalized_brand gin_trgm_ops);
CREATE INDEX idx_heating_appliances_model_trgm
  ON catalog.heating_appliances USING gin (normalized_model gin_trgm_ops);

-- ==========================================================
-- RLS
-- ==========================================================
ALTER TABLE catalog.heating_appliances ENABLE ROW LEVEL SECURITY;

-- Lecture : registre global (tenant_id NULL) accessible à tout authentifié
-- + données du tenant courant
CREATE POLICY "heating_appliances_select_global_or_tenant"
ON catalog.heating_appliances
FOR SELECT
TO authenticated
USING (
  tenant_id IS NULL
  OR tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid)
);

-- Écriture tenant : seuls les utilisateurs du tenant peuvent écrire
-- sur leurs propres entrées (jamais sur le global)
CREATE POLICY "heating_appliances_insert_tenant_only"
ON catalog.heating_appliances
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IS NOT NULL
  AND tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid)
);

CREATE POLICY "heating_appliances_update_tenant_only"
ON catalog.heating_appliances
FOR UPDATE
TO authenticated
USING (
  tenant_id IS NOT NULL
  AND tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid)
)
WITH CHECK (
  tenant_id IS NOT NULL
  AND tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid)
);

CREATE POLICY "heating_appliances_delete_tenant_only"
ON catalog.heating_appliances
FOR DELETE
TO authenticated
USING (
  tenant_id IS NOT NULL
  AND tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid)
);

-- Le service_role bypasse RLS automatiquement (imports backend = OK).

-- ==========================================================
-- Commentaires
-- ==========================================================
COMMENT ON TABLE catalog.heating_appliances IS
  'Registre des appareils de chauffage (poêles, inserts, chaudières). Source ADEME + futurs (Flamme Verte, manuel). Séparé de catalog_items (fumisterie).';
COMMENT ON COLUMN catalog.heating_appliances.tenant_id IS
  'NULL = registre global (lisible par tous, écrit par service_role). Sinon = entrée tenant.';
COMMENT ON COLUMN catalog.heating_appliances.cov_ogc_emission_mg_nm3 IS
  'Émission COV (français) / OGC (anglais) — même mesure, mg/Nm3.';
COMMENT ON COLUMN catalog.heating_appliances.standard_obsolete IS
  'Calculé à l''import : true si en_standard est obsolète vs version courante (ex: EN 13240:2001).';