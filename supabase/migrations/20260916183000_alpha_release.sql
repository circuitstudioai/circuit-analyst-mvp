-- Fresh, supervised two-week alpha cohort.
update beta_cohorts
set status = 'complete'
where slug = 'beta-2026-09' and status <> 'complete';

insert into beta_cohorts (slug, name, starts_on, ends_on, target_size, status)
values ('alpha-2026-09', 'September 2026 supervised alpha', '2026-09-17', '2026-09-30', 5, 'recruiting')
on conflict (slug) do update set
  name = excluded.name,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  target_size = excluded.target_size,
  status = excluded.status;
