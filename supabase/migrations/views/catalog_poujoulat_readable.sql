-- Vue lisible Poujoulat dans Supabase Studio
-- Affiche uniquement les colonnes utiles pour un humain
-- Usage : SELECT * FROM catalog.v_poujoulat LIMIT 100;

CREATE OR REPLACE VIEW catalog.v_poujoulat AS
SELECT
  supplier_ref,
  name,
  brand,
  manufacturer_name,
  unit_price_ht,
  vat_rate,
  unit,
  source_file,
  import_batch_id,
  created_at,
  modified_at
FROM catalog.catalog_items
WHERE supplier_name = 'Poujoulat'
  AND tenant_id IS NOT NULL
ORDER BY name;

-- Vue synthèse par fournisseur
CREATE OR REPLACE VIEW catalog.v_supplier_summary AS
SELECT
  supplier_name,
  tenant_id IS NULL as is_central,
  COUNT(*) as nb_articles,
  COUNT(supplier_ref) as avec_ref,
  COUNT(cost_price) as avec_cost_DOIT_ETRE_0,
  COUNT(brand) as avec_brand,
  COUNT(import_batch_id) as avec_batch,
  MIN(unit_price_ht) as prix_min,
  ROUND(AVG(unit_price_ht)::numeric, 2) as prix_moyen,
  MAX(unit_price_ht) as prix_max,
  MAX(created_at) as dernier_import
FROM catalog.catalog_items
GROUP BY supplier_name, (tenant_id IS NULL)
ORDER BY nb_articles DESC;

COMMENT ON VIEW catalog.v_poujoulat IS
'Vue lisible Poujoulat — colonnes essentielles uniquement.
Pour audit rapide dans Supabase Studio.';

COMMENT ON VIEW catalog.v_supplier_summary IS
'Synthèse par fournisseur : nb articles, prix min/max, santé données.
Utiliser pour audit post-import et suivi catalogue.';
