-- The application has persisted signal provenance in raw_payload since the
-- authenticated beta, but the original production migration omitted it.
alter table signals
  add column if not exists raw_payload jsonb not null default '{}';
