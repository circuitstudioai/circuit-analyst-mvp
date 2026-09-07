alter table consensus_signals
  add column if not exists category_consensus jsonb not null default '[]'::jsonb;
