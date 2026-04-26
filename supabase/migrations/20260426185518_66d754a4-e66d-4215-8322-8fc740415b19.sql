-- Ensure RLS is enabled on catalog.catalogs
ALTER TABLE catalog.catalogs ENABLE ROW LEVEL SECURITY;

-- Drop existing DELETE policy if any (idempotent)
DROP POLICY IF EXISTS catalogs_delete_tenant ON catalog.catalogs;

-- Allow tenant users to delete their own (non-global) catalogs
CREATE POLICY catalogs_delete_tenant
  ON catalog.catalogs
  FOR DELETE
  TO authenticated
  USING (tenant_id = core.current_tenant_id() AND tenant_id IS NOT NULL);

-- RPC: delete a catalog and all its items atomically
CREATE OR REPLACE FUNCTION catalog.delete_catalog_with_items(p_catalog_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = catalog, core, public
AS $$
DECLARE
  v_tenant_id uuid;
  v_current_tenant uuid;
BEGIN
  v_current_tenant := core.current_tenant_id();

  IF v_current_tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant context' USING ERRCODE = '42501';
  END IF;

  SELECT tenant_id INTO v_tenant_id
  FROM catalog.catalogs
  WHERE id = p_catalog_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Cannot delete a global catalog' USING ERRCODE = '42501';
  END IF;

  IF v_tenant_id <> v_current_tenant THEN
    RAISE EXCEPTION 'Catalog does not belong to current tenant' USING ERRCODE = '42501';
  END IF;

  DELETE FROM catalog.catalog_items WHERE catalog_id = p_catalog_id;
  DELETE FROM catalog.catalogs WHERE id = p_catalog_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Allow authenticated users to call the RPC
GRANT EXECUTE ON FUNCTION catalog.delete_catalog_with_items(uuid) TO authenticated;