-- =========================================================
-- BLOC 1 : Champs techniques fabricant
-- =========================================================
ALTER TABLE catalog.heating_appliances
  ADD COLUMN IF NOT EXISTS power_min_kw            numeric(5,2),
  ADD COLUMN IF NOT EXISTS power_max_kw            numeric(5,2),
  ADD COLUMN IF NOT EXISTS heating_capacity_m3     integer,
  ADD COLUMN IF NOT EXISTS flue_diameter_mm        smallint,
  ADD COLUMN IF NOT EXISTS flue_exit_position      text,
  ADD COLUMN IF NOT EXISTS sealed_combustion       boolean,
  ADD COLUMN IF NOT EXISTS direct_air              boolean,
  ADD COLUMN IF NOT EXISTS has_wifi                boolean,
  ADD COLUMN IF NOT EXISTS energy_class            text,
  ADD COLUMN IF NOT EXISTS weight_kg               numeric(7,2),
  ADD COLUMN IF NOT EXISTS dimensions_raw          text,
  ADD COLUMN IF NOT EXISTS max_log_length_cm       smallint,
  ADD COLUMN IF NOT EXISTS rear_clearance_mm       smallint,
  ADD COLUMN IF NOT EXISTS side_clearance_mm       smallint,
  ADD COLUMN IF NOT EXISTS notes                   text;

-- Cohérence plage de puissance
ALTER TABLE catalog.heating_appliances
  DROP CONSTRAINT IF EXISTS chk_heating_appliances_power_range;
ALTER TABLE catalog.heating_appliances
  ADD CONSTRAINT chk_heating_appliances_power_range
  CHECK (
    power_min_kw IS NULL
    OR power_max_kw IS NULL
    OR power_min_kw <= power_max_kw
  );

-- Index utiles recherche fabricant
CREATE INDEX IF NOT EXISTS idx_heating_appliances_flue_diameter
  ON catalog.heating_appliances (flue_diameter_mm)
  WHERE flue_diameter_mm IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_heating_appliances_energy_class
  ON catalog.heating_appliances (energy_class)
  WHERE energy_class IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_heating_appliances_power_range
  ON catalog.heating_appliances (power_min_kw, power_max_kw)
  WHERE power_min_kw IS NOT NULL OR power_max_kw IS NOT NULL;

COMMENT ON COLUMN catalog.heating_appliances.power_min_kw IS
  'Puissance min kW (modèles à plage type "4-7 kW"). nominal_power_kw reste prioritaire.';
COMMENT ON COLUMN catalog.heating_appliances.power_max_kw IS
  'Puissance max kW. NULL si puissance unique.';
COMMENT ON COLUMN catalog.heating_appliances.flue_exit_position IS
  'Position sortie fumée: D (dessus), A (arrière), D/A, B (bas).';
COMMENT ON COLUMN catalog.heating_appliances.dimensions_raw IS
  'Dimensions brutes texte (ex: "903x450x447"). Pas de parsing H/L/P.';
COMMENT ON COLUMN catalog.heating_appliances.energy_class IS
  'Classe énergétique européenne (A++, A+, A, B, ...).';

-- =========================================================
-- BLOC 2 : Flamme Verte au niveau modèle
-- =========================================================
ALTER TABLE catalog.heating_appliances
  ADD COLUMN IF NOT EXISTS flamme_verte_status          text DEFAULT 'not_found',
  ADD COLUMN IF NOT EXISTS flamme_verte_stars           smallint,
  ADD COLUMN IF NOT EXISTS flamme_verte_certificate_url text,
  ADD COLUMN IF NOT EXISTS flamme_verte_checked_at      timestamptz,
  ADD COLUMN IF NOT EXISTS flamme_verte_source          text,
  ADD COLUMN IF NOT EXISTS flamme_verte_notes           text;

-- Statut Flamme Verte
ALTER TABLE catalog.heating_appliances
  DROP CONSTRAINT IF EXISTS chk_heating_appliances_flamme_verte_status;
ALTER TABLE catalog.heating_appliances
  ADD CONSTRAINT chk_heating_appliances_flamme_verte_status
  CHECK (
    flamme_verte_status IN (
      'confirmed',
      'probable',
      'not_found',
      'expired',
      'to_verify'
    )
  );

-- Étoiles Flamme Verte (1 à 7)
ALTER TABLE catalog.heating_appliances
  DROP CONSTRAINT IF EXISTS chk_heating_appliances_flamme_verte_stars;
ALTER TABLE catalog.heating_appliances
  ADD CONSTRAINT chk_heating_appliances_flamme_verte_stars
  CHECK (
    flamme_verte_stars IS NULL
    OR flamme_verte_stars BETWEEN 1 AND 7
  );

CREATE INDEX IF NOT EXISTS idx_heating_appliances_flamme_verte_status
  ON catalog.heating_appliances (flamme_verte_status);

COMMENT ON COLUMN catalog.heating_appliances.flamme_verte_status IS
  'Statut Flamme Verte au niveau MODÈLE (pas marque). Jamais bloquant côté UX.';
COMMENT ON COLUMN catalog.heating_appliances.flamme_verte_stars IS
  'Nombre d''étoiles Flamme Verte (1 à 7). NULL si non labellisé.';