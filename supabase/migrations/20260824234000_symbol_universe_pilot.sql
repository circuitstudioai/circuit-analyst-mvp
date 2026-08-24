create table if not exists symbol_universe_versions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  methodology_version text not null,
  as_of timestamptz not null,
  sources jsonb not null default '[]',
  notes text,
  created_at timestamptz not null default now(),
  activated_at timestamptz
);

create table if not exists symbol_universe_items (
  universe_id uuid not null references symbol_universe_versions(id) on delete cascade,
  symbol text not null,
  company_name text not null,
  exchange text not null,
  rank int not null check (rank > 0),
  liquidity_score double precision not null check (liquidity_score between 0 and 1),
  popularity_score double precision not null check (popularity_score between 0 and 1),
  composite_score double precision not null check (composite_score between 0 and 1),
  average_daily_volume_3m bigint,
  average_dollar_volume_3m numeric(20, 2),
  market_cap numeric(20, 2),
  source_tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (universe_id, symbol),
  unique (universe_id, rank)
);

create index if not exists idx_symbol_universe_items_rank
  on symbol_universe_items(universe_id, rank);
create index if not exists idx_symbol_universe_items_symbol
  on symbol_universe_items(symbol);

alter table symbol_universe_versions enable row level security;
alter table symbol_universe_items enable row level security;

-- Pilot only: validate the ranking and product behavior before expanding to 100.
insert into symbol_universe_versions (
  slug,
  name,
  status,
  methodology_version,
  as_of,
  sources,
  notes
)
values (
  'top-us-equities-2026-08-24-pilot',
  'Top US Equities — 10-symbol pilot',
  'draft',
  'liquidity-popularity-v1',
  '2026-08-24T23:30:00Z',
  '[
    {"name":"Yahoo Finance most active","purpose":"3-month volume, price, market cap and liquidity candidate set"},
    {"name":"Yahoo Finance US trending","purpose":"retail attention proxy"},
    {"name":"SEC company ticker/exchange data","purpose":"listing identity validation"}
  ]'::jsonb,
  'Approval sample. Excludes OTC securities, funds, leveraged ETFs, crypto, prices below $5, and market caps below $10B.'
)
on conflict (slug) do nothing;

insert into symbol_universe_items (
  universe_id,
  symbol,
  company_name,
  exchange,
  rank,
  liquidity_score,
  popularity_score,
  composite_score,
  average_daily_volume_3m,
  average_dollar_volume_3m,
  market_cap,
  source_tags
)
select version.id, seed.*
from symbol_universe_versions version
cross join (values
  ('NVDA', 'NVIDIA Corporation', 'NASDAQ', 1, 1.000, 1.000, 1.000, 140182203::bigint, 29225185681::numeric, 5049593888768::numeric, array['most_active','trending']),
  ('MSFT', 'Microsoft Corporation', 'NASDAQ', 2, 0.936, 0.820, 0.901, 39899035::bigint, 19443198746::numeric, 3618542714880::numeric, array['most_active','mega_cap']),
  ('AAPL', 'Apple Inc.', 'NASDAQ', 3, 0.914, 0.850, 0.895, 56647277::bigint, 17579915944::numeric, 4529157832704::numeric, array['most_active','mega_cap']),
  ('TSLA', 'Tesla, Inc.', 'NASDAQ', 4, 0.871, 0.900, 0.880, 42057875::bigint, 14676095481::numeric, 1378194685952::numeric, array['most_active','retail_core']),
  ('AMZN', 'Amazon.com, Inc.', 'NASDAQ', 5, 0.842, 0.840, 0.841, 50072303::bigint, 13122448447::numeric, 2826769268736::numeric, array['most_active','mega_cap']),
  ('GOOGL', 'Alphabet Inc.', 'NASDAQ', 6, 0.790, 0.810, 0.796, 32139572::bigint, 11186499430::numeric, 4256751157248::numeric, array['most_active','mega_cap']),
  ('INTC', 'Intel Corporation', 'NASDAQ', 7, 0.772, 0.780, 0.774, 119694637::bigint, 10444554025::numeric, 461265534976::numeric, array['most_active','retail_core']),
  ('AVGO', 'Broadcom Inc.', 'NASDAQ', 8, 0.748, 0.790, 0.761, 26326179::bigint, 9444779978::numeric, 1706829545472::numeric, array['most_active','mega_cap']),
  ('PLTR', 'Palantir Technologies Inc.', 'NASDAQ', 9, 0.690, 0.910, 0.756, 43441345::bigint, 7640898172::numeric, 422673940480::numeric, array['most_active','retail_core']),
  ('AMD', 'Advanced Micro Devices, Inc.', 'NASDAQ', 10, 0.660, 0.900, 0.732, null::bigint, null::numeric, null::numeric, array['trending','retail_core'])
) as seed(
  symbol,
  company_name,
  exchange,
  rank,
  liquidity_score,
  popularity_score,
  composite_score,
  average_daily_volume_3m,
  average_dollar_volume_3m,
  market_cap,
  source_tags
)
where version.slug = 'top-us-equities-2026-08-24-pilot'
on conflict (universe_id, symbol) do update set
  company_name = excluded.company_name,
  exchange = excluded.exchange,
  rank = excluded.rank,
  liquidity_score = excluded.liquidity_score,
  popularity_score = excluded.popularity_score,
  composite_score = excluded.composite_score,
  average_daily_volume_3m = excluded.average_daily_volume_3m,
  average_dollar_volume_3m = excluded.average_dollar_volume_3m,
  market_cap = excluded.market_cap,
  source_tags = excluded.source_tags;

-- Service-role routes read this pilot. No anonymous direct table access is granted.
