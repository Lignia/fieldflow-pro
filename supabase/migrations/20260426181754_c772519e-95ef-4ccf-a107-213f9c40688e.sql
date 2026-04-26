-- ============================================================
-- catalog.catalog_items : lecture des articles inactifs du tenant
-- ============================================================
DROP POLICY IF EXISTS catalog_items_select ON catalog.catalog_items;

CREATE POLICY catalog_items_select
  ON catalog.catalog_items
  FOR SELECT
  TO authenticated
  USING (
    -- Catalogue privé du tenant : tous les articles (actifs + inactifs)
    tenant_id = core.current_tenant_id()
    OR
    -- Catalogue global : seulement les articles actifs
    (tenant_id IS NULL AND is_active = true)
  );

-- ============================================================
-- catalog.catalog_items : INSERT / UPDATE / DELETE pour le tenant
-- ============================================================
DROP POLICY IF EXISTS catalog_items_insert ON catalog.catalog_items;
CREATE POLICY catalog_items_insert
  ON catalog.catalog_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = core.current_tenant_id()
    AND tenant_id IS NOT NULL
  );

DROP POLICY IF EXISTS catalog_items_update ON catalog.catalog_items;
CREATE POLICY catalog_items_update
  ON catalog.catalog_items
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = core.current_tenant_id()
    AND tenant_id IS NOT NULL
  )
  WITH CHECK (
    tenant_id = core.current_tenant_id()
    AND tenant_id IS NOT NULL
  );

DROP POLICY IF EXISTS catalog_items_delete ON catalog.catalog_items;
CREATE POLICY catalog_items_delete
  ON catalog.catalog_items
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = core.current_tenant_id()
    AND tenant_id IS NOT NULL
  );

-- ============================================================
-- catalog.catalogs : INSERT / UPDATE / DELETE pour le tenant
-- (les catalogues globaux tenant_id IS NULL sont protégés)
-- ============================================================
DROP POLICY IF EXISTS catalogs_insert ON catalog.catalogs;
CREATE POLICY catalogs_insert
  ON catalog.catalogs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = core.current_tenant_id()
    AND tenant_id IS NOT NULL
  );

DROP POLICY IF EXISTS catalogs_update ON catalog.catalogs;
CREATE POLICY catalogs_update
  ON catalog.catalogs
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = core.current_tenant_id()
    AND tenant_id IS NOT NULL
  )
  WITH CHECK (
    tenant_id = core.current_tenant_id()
    AND tenant_id IS NOT NULL
  );

DROP POLICY IF EXISTS catalogs_delete ON catalog.catalogs;
CREATE POLICY catalogs_delete
  ON catalog.catalogs
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = core.current_tenant_id()
    AND tenant_id IS NOT NULL
  );