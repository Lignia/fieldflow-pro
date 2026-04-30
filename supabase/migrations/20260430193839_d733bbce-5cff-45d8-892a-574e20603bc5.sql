-- 1. Désactivation tenant Joncoux corrompu
UPDATE catalog.catalog_items
SET is_active = false
WHERE supplier_name = 'Joncoux'
  AND tenant_id = 'dbd5a19f-9d11-4ba8-93f7-046b642192ed'
  AND is_active = true;

-- 2. Refonte public.search_quote_items
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
  diameter_inner_mm smallint, diameter_outer_mm smallint,
  length_mm smallint, angle_deg smallint, finish_color text,
  unit_price_ht numeric, cost_price numeric, vat_rate numeric, unit text,
  normalization_status text, normalization_confidence numeric,
  search_score integer, boost_score smallint, default_visible boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'catalog', 'core', 'public'
AS $function$
DECLARE
  v_q      text := trim(lower(p_query));
  v_tokens text[] := array(
    SELECT t FROM unnest(string_to_array(trim(regexp_replace(v_q, '\s+', ' ', 'g')), ' ')) t
    WHERE length(t) >= 2
  );
BEGIN
  RETURN QUERY
  WITH fsp AS (
    SELECT f.raw_family_pattern, f.boost_score, f.default_visible,
           f.supplier_name AS fsup
    FROM catalog.family_search_profiles f
    WHERE f.quote_context = p_quote_context AND f.is_active = true
      AND (f.tenant_id = p_tenant_id OR f.tenant_id IS NULL)
    ORDER BY f.tenant_id NULLS LAST
  ),
  token_analysis AS (
    SELECT
      MAX(CASE WHEN t ~ '^\d{5,}' THEN t END) AS code_token,
      ARRAY_AGG(CASE
        WHEN t ~ '^\d{2}$' AND t::int <@ int4range(10, 91)
        THEN t::int END) FILTER (WHERE t ~ '^\d{2}$'
          AND t::int <@ int4range(10, 91)) AS angle_tokens,
      ARRAY_AGG(CASE
        WHEN t ~ '^\d{2,3}$' AND t::int <@ int4range(50, 601)
          AND NOT (t::int <@ int4range(10, 91))
        THEN t::int END) FILTER (WHERE t ~ '^\d{2,3}$'
          AND t::int <@ int4range(50, 601)
          AND NOT (t::int <@ int4range(10, 91))) AS diam_tokens,
      ARRAY_AGG(CASE
        WHEN t = ANY(ARRAY['inox','galva','noir','blanc','peint','emaille','acier'])
        THEN t END) FILTER (WHERE
          t = ANY(ARRAY['inox','galva','noir','blanc','peint','emaille','acier'])
        ) AS finish_tokens,
      ARRAY_AGG(CASE
        WHEN t !~ '^\d+' AND NOT t = ANY(ARRAY['inox','galva','noir','blanc','peint','emaille','acier'])
        THEN t END) FILTER (WHERE
          t !~ '^\d+' AND NOT t = ANY(ARRAY['inox','galva','noir','blanc','peint','emaille','acier'])
        ) AS text_tokens
    FROM unnest(v_tokens) t
  ),
  scored AS (
    SELECT
      ci.id, ci.name, ci.normalized_name,
      ci.sku, ci.sku_code,
      ci.supplier_ref, ci.supplier_name, ci.supplier_range,
      ci.product_kind, ci.product_type::text AS product_type,
      ci.technology_type, ci.diameter_inner_mm, ci.diameter_outer_mm,
      ci.length_mm, ci.angle_deg, ci.finish_color,
      ci.unit_price_ht, ci.cost_price, ci.vat_rate,
      ci.unit::text AS unit,
      ci.normalization_status, ci.normalization_confidence,
      (
        CASE WHEN lower(ci.sku) = v_q OR lower(ci.supplier_ref) = v_q
              OR lower(coalesce(ci.sku_code,'')) = v_q              THEN 100
             WHEN lower(ci.sku) LIKE v_q||'%'
              OR lower(ci.supplier_ref) LIKE v_q||'%'
              OR lower(coalesce(ci.sku_code,'')) LIKE v_q||'%'      THEN 90
             WHEN lower(ci.sku) LIKE '%'||v_q||'%'
              OR lower(coalesce(ci.sku_code,'')) LIKE '%'||v_q||'%'
              OR lower(ci.supplier_ref) LIKE '%'||v_q||'%'          THEN 85
             ELSE 0
        END
        -- BOOST sku_code exact
        + CASE WHEN lower(coalesce(ci.sku_code,'')) = v_q THEN 200 ELSE 0 END
        + COALESCE((
          SELECT SUM(
            CASE
              WHEN lower(coalesce(ci.product_kind,'')) = tok         THEN 20
              WHEN lower(coalesce(ci.normalized_name,'')) LIKE '%'||tok||'%'
                OR lower(coalesce(ci.search_keywords,'')) LIKE '%'||tok||'%' THEN 15
              WHEN ci.search_vector @@ plainto_tsquery('french', tok)        THEN 12
              WHEN lower(ci.name) LIKE '%'||tok||'%'                         THEN 10
              WHEN lower(coalesce(ci.description,'')) LIKE '%'||tok||'%'     THEN 6
              WHEN lower(coalesce(ci.supplier_range,'')) = tok               THEN 18
              ELSE 0
            END
          )
          FROM unnest(ta.text_tokens) tok WHERE tok IS NOT NULL
        ), 0)
        + CASE WHEN ta.angle_tokens IS NOT NULL AND ci.angle_deg IS NOT NULL
                AND ci.angle_deg = ANY(ta.angle_tokens) THEN 20 ELSE 0 END
        + CASE WHEN ta.diam_tokens IS NOT NULL AND (
                ci.diameter_inner_mm = ANY(ta.diam_tokens)
                OR ci.diameter_outer_mm = ANY(ta.diam_tokens)) THEN 15 ELSE 0 END
        + CASE WHEN ta.finish_tokens IS NOT NULL AND ci.finish_color IS NOT NULL
                AND lower(ci.finish_color) = ANY(ta.finish_tokens)  THEN 12
               WHEN ta.finish_tokens IS NOT NULL
                AND (lower(coalesce(ci.name,'')) LIKE '%'||ta.finish_tokens[1]||'%'
                 OR lower(coalesce(ci.search_keywords,'')) LIKE '%'||ta.finish_tokens[1]||'%') THEN 6
               ELSE 0 END
        -- PÉNALITÉS qualité (relèguent en bas, ne masquent pas)
        - CASE WHEN ci.name ~ '[ÂÃ�]|Ã.'
                 OR coalesce(ci.normalized_name,'') ~ '[ÂÃ�]|Ã.' THEN 50 ELSE 0 END
        - CASE
            WHEN ci.product_kind IN ('coude','tube','terminal','adaptateur','te','flexible')
             AND ci.diameter_inner_mm IS NULL
            THEN 20 ELSE 0
          END
        - CASE WHEN ci.product_kind = 'coude' AND ci.angle_deg IS NULL THEN 10 ELSE 0 END
        - CASE WHEN ci.normalized_name IS NULL THEN 10 ELSE 0 END
      ) AS qscore,
      COALESCE((SELECT f2.boost_score FROM fsp f2
        WHERE ci.supplier_name = f2.fsup
          AND ci.description ILIKE f2.raw_family_pattern
        ORDER BY abs(f2.boost_score) DESC LIMIT 1), 0) AS fbst,
      COALESCE((SELECT f3.default_visible FROM fsp f3
        WHERE ci.supplier_name = f3.fsup
          AND ci.description ILIKE f3.raw_family_pattern
        ORDER BY abs(f3.boost_score) DESC LIMIT 1), true) AS fvis
    FROM catalog.catalog_items ci
    CROSS JOIN token_analysis ta
    WHERE ci.tenant_id = p_tenant_id
      AND ci.is_active = true
      AND (p_active_supplier_names IS NULL
           OR ci.supplier_name = ANY(p_active_supplier_names))
      AND (
        lower(ci.sku) = v_q OR lower(ci.supplier_ref) = v_q
        OR lower(coalesce(ci.sku_code,'')) = v_q
        OR lower(ci.sku) LIKE '%'||v_q||'%'
        OR lower(ci.supplier_ref) LIKE '%'||v_q||'%'
        OR lower(coalesce(ci.sku_code,'')) LIKE '%'||v_q||'%'
        OR EXISTS (
          SELECT 1 FROM unnest(ta.text_tokens) tok
          WHERE tok IS NOT NULL AND (
            lower(ci.product_kind) = tok
            OR lower(ci.name) LIKE '%'||tok||'%'
            OR lower(coalesce(ci.normalized_name,'')) LIKE '%'||tok||'%'
            OR lower(coalesce(ci.search_keywords,'')) LIKE '%'||tok||'%'
            OR lower(coalesce(ci.description,'')) LIKE '%'||tok||'%'
            OR lower(coalesce(ci.supplier_range,'')) = tok
            OR ci.search_vector @@ plainto_tsquery('french', tok)
          )
        )
        OR (ta.angle_tokens IS NOT NULL AND ci.angle_deg IS NOT NULL
            AND ci.angle_deg = ANY(ta.angle_tokens))
        OR (ta.diam_tokens IS NOT NULL AND (
            ci.diameter_inner_mm = ANY(ta.diam_tokens)
            OR ci.diameter_outer_mm = ANY(ta.diam_tokens)))
        OR (ta.finish_tokens IS NOT NULL AND ci.finish_color IS NOT NULL
            AND lower(ci.finish_color) = ANY(ta.finish_tokens))
      )
  ),
  -- Dédup défensive : (supplier_name, sku_code|supplier_ref|id)
  -- Empêche les collisions multi-fournisseurs
  deduped AS (
    SELECT DISTINCT ON (
      COALESCE(s.supplier_name, ''),
      COALESCE(NULLIF(s.sku_code, ''), NULLIF(s.supplier_ref, ''), s.id::text)
    ) s.*
    FROM scored s
    WHERE s.qscore > 0
      AND (p_include_low_priority OR s.fvis OR s.fbst >= 0)
    ORDER BY
      COALESCE(s.supplier_name, ''),
      COALESCE(NULLIF(s.sku_code, ''), NULLIF(s.supplier_ref, ''), s.id::text),
      (s.qscore + s.fbst) DESC,
      s.normalized_name NULLS LAST
  )
  SELECT
    d.id, d.name, d.normalized_name, d.sku, d.sku_code,
    d.supplier_ref, d.supplier_name, d.supplier_range,
    d.product_kind, d.product_type,
    d.technology_type, d.diameter_inner_mm, d.diameter_outer_mm,
    d.length_mm, d.angle_deg, d.finish_color,
    d.unit_price_ht, d.cost_price, d.vat_rate, d.unit,
    d.normalization_status, d.normalization_confidence,
    (d.qscore + d.fbst)::integer,
    d.fbst::smallint,
    d.fvis
  FROM deduped d
  ORDER BY
    (d.qscore + d.fbst) DESC,
    CASE d.technology_type
      WHEN 'concentrique'        THEN 1
      WHEN 'double_paroi_isolee' THEN 2
      WHEN 'simple_paroi'        THEN 3
      ELSE 4 END,
    CASE d.product_kind
      WHEN 'tube' THEN 1 WHEN 'coude' THEN 2 WHEN 'terminal' THEN 3
      WHEN 'adaptateur' THEN 4 WHEN 'bride' THEN 5 WHEN 'accessoire' THEN 9
      ELSE 6 END,
    d.unit_price_ht ASC
  LIMIT p_limit;
END;
$function$;