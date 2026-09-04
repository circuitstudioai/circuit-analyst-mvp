-- Ensure PostgREST sees columns added while the production API is live.
notify pgrst, 'reload schema';
