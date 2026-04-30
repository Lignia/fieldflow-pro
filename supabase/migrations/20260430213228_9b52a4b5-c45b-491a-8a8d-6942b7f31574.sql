
GRANT USAGE ON SCHEMA catalog TO service_role, authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON catalog.heating_appliances TO service_role;
GRANT SELECT ON catalog.heating_appliances TO authenticated, anon;
