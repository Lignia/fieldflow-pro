-- Étape 1.1 : enrichissement schéma
ALTER TABLE catalog.catalog_items
  ADD COLUMN IF NOT EXISTS item_family text
    CHECK (item_family IN ('appliance','flue','spare_part','service','labor','kit')),
  ADD COLUMN IF NOT EXISTS distributor_name text,
  ADD COLUMN IF NOT EXISTS bareme_code text,
  ADD COLUMN IF NOT EXISTS valid_from date,
  ADD COLUMN IF NOT EXISTS valid_until date,
  ADD COLUMN IF NOT EXISTS replaced_by_item_id uuid REFERENCES catalog.catalog_items(id),
  ADD COLUMN IF NOT EXISTS is_central boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN catalog.catalog_items.is_central IS
  'true = article du référentiel central LIGNIA (partagé, tenant_id NULL). false = article privé tenant.';
COMMENT ON COLUMN catalog.catalog_items.distributor_name IS
  'Distributeur officiel pour articles centraux (ex: Joncoux, Poujoulat). Sert au matching des barèmes de remise.';
COMMENT ON COLUMN catalog.catalog_items.bareme_code IS
  'Code barème tarifaire distributeur. Couplé à distributor_name pour calcul prix net.';
COMMENT ON COLUMN catalog.catalog_items.valid_from IS 'Début de validité commerciale.';
COMMENT ON COLUMN catalog.catalog_items.valid_until IS 'Fin de validité commerciale (NULL = en cours).';
COMMENT ON COLUMN catalog.catalog_items.replaced_by_item_id IS 'Article successeur si obsolète.';

-- Étape A : contrainte stricte central ↔ tenant
ALTER TABLE catalog.catalog_items
  DROP CONSTRAINT IF EXISTS check_central_consistency;

ALTER TABLE catalog.catalog_items
  ADD CONSTRAINT check_central_consistency
  CHECK (
    (is_central = true  AND tenant_id IS NULL)
    OR
    (is_central = false AND tenant_id IS NOT NULL)
  );

-- Étape B : index pricing (non-CONCURRENTLY car en transaction)
CREATE INDEX IF NOT EXISTS idx_catalog_items_pricing
  ON catalog.catalog_items (distributor_name, bareme_code)
  WHERE is_central = true;