CREATE OR REPLACE FUNCTION catalog.search_quote_items(
  p_tenant_id uuid,
  p_query text,
  p_active_supplier_names text[] DEFAULT NULL::text[],
  p_quote_context text DEFAULT 'fumisterie'::text,
  p_include_low_priority boolean DEFAULT false,
  p_limit integer DEFAULT 12
)
RETURNS TABLE(
  id uuid,
  name text,
  normalized_name text,
  sku text,
  supplier_ref text,
  supplier_name text,
  supplier_range text,
  product_kind text,
  product_type text,
  technology_type text,
  diameter_inner_mm smallint,
  diameter_outer_mm smallint,
  length_mm smallint,
  angle_deg smallint,
  finish_color text,
  unit_price_ht numeric,
  cost_price numeric,
  vat_rate numeric,
  unit text,
  normalization_status text,
  normalization_confidence numeric,
  search_score integer,
  boost_score smallint,
  default_visible boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = catalog, core, public
AS $$
  SELECT * FROM public.search_quote_items(
    p_tenant_id,
    p_query,
    p_active_supplier_names,
    p_quote_context,
    p_include_low_priority,
    p_limit
  );
$$;

GRANT EXECUTE ON FUNCTION catalog.search_quote_items(uuid, text, text[], text, boolean, integer) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';