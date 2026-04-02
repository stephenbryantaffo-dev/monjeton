
-- Drop existing brvm_cache table and recreate with new schema
DROP TABLE IF EXISTS brvm_cache;

CREATE TABLE brvm_cache (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data        JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE brvm_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brvm_cache_read_all"
  ON brvm_cache FOR SELECT
  USING (true);

CREATE POLICY "brvm_cache_insert_service"
  ON brvm_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "brvm_cache_delete_service"
  ON brvm_cache FOR DELETE
  USING (true);
