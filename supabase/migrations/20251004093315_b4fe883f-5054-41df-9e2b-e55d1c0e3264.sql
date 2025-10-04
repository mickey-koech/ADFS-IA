-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION match_files(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  original_name text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    files.id,
    files.original_name,
    1 - (files.embedding <=> query_embedding) AS similarity
  FROM files
  WHERE files.embedding IS NOT NULL
    AND files.is_deleted = false
    AND 1 - (files.embedding <=> query_embedding) > match_threshold
  ORDER BY files.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;