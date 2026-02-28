-- 057_add_zone_resolver_function.sql

CREATE OR REPLACE FUNCTION resolve_zone_id(
    p_lat NUMERIC,
    p_lng NUMERIC
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_zone_id INT;
BEGIN
    SELECT id INTO v_zone_id
    FROM geo_zones
    WHERE p_lat BETWEEN min_lat AND max_lat
      AND p_lng BETWEEN min_lng AND max_lng
    LIMIT 1;

    RETURN v_zone_id;
END;
$$;
