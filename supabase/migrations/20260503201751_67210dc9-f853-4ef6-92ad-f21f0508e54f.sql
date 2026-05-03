ALTER TABLE catalog.tenant_supplier_discounts
  ADD COLUMN IF NOT EXISTS distributor_name text,
  ADD COLUMN IF NOT EXISTS bareme_code text,
  ADD COLUMN IF NOT EXISTS family_label text;