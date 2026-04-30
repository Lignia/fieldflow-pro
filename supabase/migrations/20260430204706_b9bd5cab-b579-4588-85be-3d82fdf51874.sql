-- 1) Ajouter les nouvelles colonnes
ALTER TABLE catalog.heating_appliances
  ADD COLUMN IF NOT EXISTS commercial_name text,
  ADD COLUMN IF NOT EXISTS flamme_verte_status text NOT NULL DEFAULT 'not_found',
  ADD COLUMN IF NOT EXISTS source_catalog text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_confidence numeric(4,3);

-- 2) Contraintes de domaine (CHECK immutables, valeurs fermées)
ALTER TABLE catalog.heating_appliances
  DROP CONSTRAINT IF EXISTS heating_appliances_ademe_status_check;

ALTER TABLE catalog.heating_appliances
  ADD CONSTRAINT heating_appliances_ademe_status_check
  CHECK (ademe_fonds_air_bois_status IN ('confirmed','not_found','probable','to_verify'));

ALTER TABLE catalog.heating_appliances
  DROP CONSTRAINT IF EXISTS heating_appliances_flamme_verte_status_check;

ALTER TABLE catalog.heating_appliances
  ADD CONSTRAINT heating_appliances_flamme_verte_status_check
  CHECK (flamme_verte_status IN ('confirmed','not_found','probable','to_verify','expired'));

ALTER TABLE catalog.heating_appliances
  DROP CONSTRAINT IF EXISTS heating_appliances_source_catalog_check;

ALTER TABLE catalog.heating_appliances
  ADD CONSTRAINT heating_appliances_source_catalog_check
  CHECK (source_catalog IN ('manufacturer','ademe','flamme_verte','manual'));

ALTER TABLE catalog.heating_appliances
  DROP CONSTRAINT IF EXISTS heating_appliances_source_confidence_check;

ALTER TABLE catalog.heating_appliances
  ADD CONSTRAINT heating_appliances_source_confidence_check
  CHECK (source_confidence IS NULL OR (source_confidence >= 0 AND source_confidence <= 1));

ALTER TABLE catalog.heating_appliances
  DROP CONSTRAINT IF EXISTS heating_appliances_flamme_verte_stars_check;

ALTER TABLE catalog.heating_appliances
  ADD CONSTRAINT heating_appliances_flamme_verte_stars_check
  CHECK (flamme_verte_stars IS NULL OR flamme_verte_stars BETWEEN 1 AND 7);

-- 3) Index pour filtrage par statut réglementaire
CREATE INDEX IF NOT EXISTS idx_heating_appliances_ademe_status
  ON catalog.heating_appliances (ademe_fonds_air_bois_status)
  WHERE ademe_fonds_air_bois_status <> 'not_found';

CREATE INDEX IF NOT EXISTS idx_heating_appliances_flamme_verte_status
  ON catalog.heating_appliances (flamme_verte_status)
  WHERE flamme_verte_status <> 'not_found';

CREATE INDEX IF NOT EXISTS idx_heating_appliances_source_catalog
  ON catalog.heating_appliances (source_catalog);

-- 4) Backfill : les lignes ADEME existantes (data_source='ademe') doivent
--    refléter source_catalog='ademe' et confidence=1 (import direct registre).
UPDATE catalog.heating_appliances
SET source_catalog = 'ademe',
    source_confidence = 1.000
WHERE data_source = 'ademe'
  AND source_catalog = 'manual';

-- 5) Commentaires de documentation
COMMENT ON COLUMN catalog.heating_appliances.commercial_name IS
  'Nom commercial affiché sur le devis (ex: "Ravelli LINE STEEL BRONZE"). Distinct du raw_model technique.';
COMMENT ON COLUMN catalog.heating_appliances.flamme_verte_status IS
  'Statut Flamme Verte: confirmed (match exact), probable (fuzzy), to_verify (incertain), not_found (absent), expired (label expiré).';
COMMENT ON COLUMN catalog.heating_appliances.ademe_fonds_air_bois_status IS
  'Statut ADEME Fonds Air Bois: confirmed (registre), probable (fuzzy), to_verify (incertain), not_found.';
COMMENT ON COLUMN catalog.heating_appliances.source_catalog IS
  'Origine de la fiche: manufacturer (catalogue marque), ademe (registre ADEME), flamme_verte (registre FV), manual (saisie).';
COMMENT ON COLUMN catalog.heating_appliances.source_confidence IS
  'Score de confiance du matching (0..1). 1 = exact, ~0.7 = fuzzy probable, NULL = manuel.';