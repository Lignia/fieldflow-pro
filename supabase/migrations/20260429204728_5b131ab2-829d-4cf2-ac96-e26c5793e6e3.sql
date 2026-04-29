-- Recreate public.search_quote_items with sku_code support and partial supplier_ref match
DROP FUNCTION IF EXISTS public.search_quote_items(uuid, text, text[], text, boolean, integer);

CREATE OR REPLACE FUNCTION public.search_quote_items(
  p_tenant_id uuid,
  p_query text,
  p_active_supplier_names text[] DEFAULT NULL::text[],
  p_quote_context text DEFAULT 'fumisterie'::text,
  p_include_low_priority boolean DEFAULT false,
  p_limit integer DEFAULT 12
)
RETURNS TABLE(
  id uuid, name text, normalized_name text, sku text, sku_code text,
  supplier_ref text, supplier_name text, supplier_range text,
  product_kind text, product_type text, technology_type text,
  diameter_inner_mm smallint, diameter_outer_mm smallint, length_mm smallint,
  angle_deg smallint, finish_color text,
  unit_price_ht numeric, cost_price numeric, vat_rate numeric, unit text,
  normalization_status text, normalization_confidence numeric,
  search_score integer, boost_score smallint, default_visible boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'catalog', 'core', 'public'
AS $function$
DECLARE
  v_query_clean   text;
  v_tokens        text[];
  v_token         text;
  v_kind_token    text := NULL;
  v_angle_token   smallint := NULL;
  v_diam_token    smallint := NULL;
  v_known_ranges  text[] := ARRAY['orion','apollo','therminox','duoten','rigidten','poujoulat','isotip','joncoux','ten','efficience','inoxpir','condensor'];
  v_range_hits    text[] := ARRAY[]::text[];
  v_text_tokens   text[] := ARRAY[]::text[];
BEGIN
  v_query_clean := trim(lower(coalesce(p_query, '')));
  IF v_query_clean = '' THEN
    RETURN;
  END IF;

  v_tokens := regexp_split_to_array(v_query_clean, '[\s,;]+');

  FOREACH v_token IN ARRAY v_tokens LOOP
    CONTINUE WHEN v_token IS NULL OR v_token = '';

    IF v_token IN ('coude','coudes') THEN
      v_kind_token := 'coude';
      v_text_tokens := array_append(v_text_tokens, v_token);
    ELSIF v_token IN ('tube','tubes','element','elt','longueur') THEN
      v_kind_token := 'tube';
      v_text_tokens := array_append(v_text_tokens, v_token);
    ELSIF v_token IN ('terminal','terminaux','sortie','chapeau') THEN
      v_kind_token := 'terminal';
      v_text_tokens := array_append(v_text_tokens, v_token);
    ELSIF v_token IN ('bride','brides') THEN
      v_kind_token := 'bride';
      v_text_tokens := array_append(v_text_tokens, v_token);
    ELSIF v_token IN ('solin','solins') THEN
      v_kind_token := 'solin';
      v_text_tokens := array_append(v_text_tokens, v_token);
    ELSIF v_token IN ('plaque','plaques') THEN
      v_kind_token := 'plaque';
      v_text_tokens := array_append(v_text_tokens, v_token);
    ELSIF v_token IN ('flexible','flex','flexibles') THEN
      v_kind_token := 'flexible';
      v_text_tokens := array_append(v_text_tokens, v_token);
    ELSIF v_token IN ('kit','kits') THEN
      v_kind_token := 'kit';
      v_text_tokens := array_append(v_text_tokens, v_token);
    ELSIF v_token IN ('adaptateur','adapt','adaptateurs','reduction') THEN
      v_kind_token := 'adaptateur';
      v_text_tokens := array_append(v_text_tokens, v_token);
    ELSIF v_token ~ '^\d+$' THEN
      DECLARE n int := v_token::int; BEGIN
        IF n IN (15,30,45,60,87,90) THEN
          v_angle_token := n::smallint;
        ELSIF n BETWEEN 50 AND 600 THEN
          v_diam_token := n::smallint;
        END IF;
        v_text_tokens := array_append(v_text_tokens, v_token);
      END;
    ELSIF v_token ~ '^\d+/\d+$' THEN
      v_text_tokens := array_append(v_text_tokens, v_token);
      v_diam_token := split_part(v_token,'/',1)::smallint;
    ELSE
      IF length(v_token) >= 2 THEN
        v_text_tokens := array_append(v_text_tokens, v_token);
        IF v_token = ANY(v_known_ranges) THEN
          v_range_hits := array_append(v_range_hits, v_token);
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY
  WITH
  family_scores AS (
    SELECT
      fsp.raw_family_pattern,
      fsp.boost_score,
      fsp.default_visible,
      fsp.supplier_name AS fsp_supplier
    FROM catalog.family_search_profiles fsp
    WHERE fsp.quote_context = p_quote_context
      AND fsp.is_active = true
      AND (fsp.tenant_id = p_tenant_id OR fsp.tenant_id IS NULL)
    ORDER BY fsp.tenant_id NULLS LAST
  ),
  base AS (
    SELECT ci.*
    FROM catalog.catalog_items ci
    WHERE ci.tenant_id = p_tenant_id
      AND ci.is_active = true
      AND (
        p_active_supplier_names IS NULL
        OR ci.supplier_name = ANY(p_active_supplier_names)
      )
      AND (
        lower(ci.sku) = v_query_clean
        OR lower(ci.supplier_ref) = v_query_clean
        OR lower(coalesce(ci.sku_code,'')) = v_query_clean
        OR lower(ci.sku) LIKE v_query_clean || '%'
        OR lower(ci.supplier_ref) LIKE v_query_clean || '%'
        OR lower(coalesce(ci.sku_code,'')) LIKE v_query_clean || '%'
        OR lower(coalesce(ci.sku_code,'')) LIKE '%' || v_query_clean || '%'
        OR lower(coalesce(ci.supplier_ref,'')) LIKE '%' || v_query_clean || '%'
        OR (
          array_length(v_text_tokens, 1) IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM unnest(v_text_tokens) tk
            WHERE NOT (
              lower(coalesce(ci.name,''))                LIKE '%' || tk || '%'
              OR lower(coalesce(ci.normalized_name,''))     LIKE '%' || tk || '%'
              OR lower(coalesce(ci.search_keywords,''))     LIKE '%' || tk || '%'
              OR lower(coalesce(ci.supplier_range,''))      LIKE '%' || tk || '%'
              OR lower(coalesce(ci.supplier_name,''))       LIKE '%' || tk || '%'
              OR lower(coalesce(ci.description,''))         LIKE '%' || tk || '%'
              OR lower(coalesce(ci.sku,''))                 LIKE '%' || tk || '%'
              OR lower(coalesce(ci.sku_code,''))            LIKE '%' || tk || '%'
              OR lower(coalesce(ci.supplier_ref,''))        LIKE '%' || tk || '%'
              OR lower(coalesce(ci.product_kind,''))        LIKE '%' || tk || '%'
              OR lower(ci.product_type::text)               LIKE '%' || tk || '%'
            )
          )
        )
      )
  ),
  scored AS (
    SELECT
      b.*,
      (
        CASE WHEN lower(b.sku) = v_query_clean OR lower(b.supplier_ref) = v_query_clean THEN 1000 ELSE 0 END
      + CASE WHEN lower(coalesce(b.sku_code,'')) = v_query_clean THEN 1000 ELSE 0 END
      + CASE WHEN lower(b.sku) LIKE v_query_clean || '%'
              OR lower(b.supplier_ref) LIKE v_query_clean || '%' THEN 500 ELSE 0 END
      + CASE WHEN lower(coalesce(b.sku_code,'')) LIKE v_query_clean || '%' THEN 500 ELSE 0 END
      + CASE WHEN lower(coalesce(b.sku_code,'')) LIKE '%' || v_query_clean || '%'
              AND NOT (lower(coalesce(b.sku_code,'')) LIKE v_query_clean || '%') THEN 350 ELSE 0 END
      + CASE WHEN lower(coalesce(b.supplier_ref,'')) LIKE '%' || v_query_clean || '%'
              AND NOT (lower(coalesce(b.supplier_ref,'')) LIKE v_query_clean || '%')
              AND lower(coalesce(b.supplier_ref,'')) <> v_query_clean THEN 300 ELSE 0 END
      + CASE WHEN v_kind_token IS NOT NULL AND b.product_kind = v_kind_token THEN 250 ELSE 0 END
      + CASE WHEN v_angle_token IS NOT NULL AND b.angle_deg = v_angle_token THEN 180 ELSE 0 END
      + CASE WHEN array_length(v_range_hits,1) IS NOT NULL
              AND lower(coalesce(b.supplier_range,'')) = ANY(v_range_hits) THEN 150 ELSE 0 END
      + CASE WHEN v_diam_token IS NOT NULL
              AND (b.diameter_inner_mm = v_diam_token OR b.diameter_outer_mm = v_diam_token)
            THEN 120 ELSE 0 END
      + CASE WHEN array_length(v_text_tokens,1) IS NOT NULL AND EXISTS (
            SELECT 1 FROM unnest(v_text_tokens) tk
            WHERE lower(coalesce(b.normalized_name,'')) LIKE '%' || tk || '%'
               OR lower(coalesce(b.search_keywords,'')) LIKE '%' || tk || '%'
          ) THEN 60 ELSE 0 END
      + CASE WHEN array_length(v_text_tokens,1) IS NOT NULL AND EXISTS (
            SELECT 1 FROM unnest(v_text_tokens) tk
            WHERE lower(coalesce(b.name,'')) LIKE '%' || tk || '%'
          ) THEN 30 ELSE 0 END
      ) AS query_score,
      COALESCE((
        SELECT fs.boost_score FROM family_scores fs
        WHERE b.supplier_name = fs.fsp_supplier
          AND b.description ILIKE fs.raw_family_pattern
        ORDER BY abs(fs.boost_score) DESC LIMIT 1
      ), 0) AS fam_boost,
      COALESCE((
        SELECT fs.default_visible FROM family_scores fs
        WHERE b.supplier_name = fs.fsp_supplier
          AND b.description ILIKE fs.raw_family_pattern
        ORDER BY abs(fs.boost_score) DESC LIMIT 1
      ), true) AS fam_visible
    FROM base b
  )
  SELECT
    s.id, s.name, s.normalized_name, s.sku, s.sku_code, s.supplier_ref, s.supplier_name,
    s.supplier_range, s.product_kind, s.product_type::text, s.technology_type,
    s.diameter_inner_mm, s.diameter_outer_mm, s.length_mm, s.angle_deg,
    s.finish_color, s.unit_price_ht, s.cost_price, s.vat_rate, s.unit::text,
    s.normalization_status, s.normalization_confidence,
    (s.query_score + s.fam_boost)::integer AS search_score,
    s.fam_boost::smallint AS boost_score,
    s.fam_visible AS default_visible
  FROM scored s
  WHERE s.query_score > 0
    AND (p_include_low_priority = true OR s.fam_visible = true OR s.fam_boost >= 0)
  ORDER BY
    (s.query_score + s.fam_boost) DESC,
    CASE
      WHEN s.technology_type = 'concentrique' THEN 1
      WHEN s.technology_type = 'double_paroi_isolee' THEN 2
      WHEN s.technology_type = 'simple_paroi' THEN 3
      WHEN s.technology_type LIKE 'flexible%' THEN 4
      ELSE 5
    END,
    CASE s.product_kind
      WHEN 'tube' THEN 1 WHEN 'coude' THEN 2 WHEN 'terminal' THEN 3
      WHEN 'adaptateur' THEN 4 WHEN 'bride' THEN 5 WHEN 'solin' THEN 6
      WHEN 'plaque' THEN 7 WHEN 'flexible' THEN 8 WHEN 'kit' THEN 9
      WHEN 'accessoire' THEN 10 ELSE 11
    END,
    s.unit_price_ht ASC
  LIMIT p_limit;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.search_quote_items(uuid, text, text[], text, boolean, integer) TO authenticated, anon, service_role;

-- Recreate catalog wrapper with new signature including sku_code
DROP FUNCTION IF EXISTS catalog.search_quote_items(uuid, text, text[], text, boolean, integer);

CREATE OR REPLACE FUNCTION catalog.search_quote_items(
  p_tenant_id uuid,
  p_query text,
  p_active_supplier_names text[] DEFAULT NULL::text[],
  p_quote_context text DEFAULT 'fumisterie'::text,
  p_include_low_priority boolean DEFAULT false,
  p_limit integer DEFAULT 12
)
RETURNS TABLE(
  id uuid, name text, normalized_name text, sku text, sku_code text,
  supplier_ref text, supplier_name text, supplier_range text,
  product_kind text, product_type text, technology_type text,
  diameter_inner_mm smallint, diameter_outer_mm smallint, length_mm smallint,
  angle_deg smallint, finish_color text,
  unit_price_ht numeric, cost_price numeric, vat_rate numeric, unit text,
  normalization_status text, normalization_confidence numeric,
  search_score integer, boost_score smallint, default_visible boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'catalog', 'core', 'public'
AS $function$
  SELECT * FROM public.search_quote_items(
    p_tenant_id, p_query, p_active_supplier_names,
    p_quote_context, p_include_low_priority, p_limit
  );
$function$;

GRANT EXECUTE ON FUNCTION catalog.search_quote_items(uuid, text, text[], text, boolean, integer) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
