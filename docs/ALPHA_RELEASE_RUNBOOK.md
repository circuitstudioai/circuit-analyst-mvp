# Alpha release runbook

## Release gate

1. Apply pending Supabase migrations.
2. Set `ALPHA_ALLOWED_EMAILS` in Vercel Production and Preview to the approved five testers (plus operators where needed).
3. Confirm `GEMINI_API_KEY`, `GEMINI_DEEP_MODEL`, Supabase URL, publishable key, and service-role key are present.
4. Deploy the reviewed `main` commit to production.
5. Run `npm run smoke:beta` against production and save its successful JSON output.
6. Run `npm run eval:finance:live` and save the eight-case JSON baseline.
7. Verify `/api/admin/ops?hours=24` and `/api/admin/validation?cohort=alpha-2026-09` as an admin.

Do not invite testers when the smoke fails, any live evaluation returns a technical
fallback, provider authentication is failing, or the deployment lacks the private
allowlist.

## Daily owner checklist

The Circuit Studio product owner reviews this once each business day:

- Provider calls, units, reported cost, and degraded-analysis rate from the ops endpoint.
- New feedback and cohort activation from the validation endpoint.
- Support messages at `support@circuitstudio.ai`.
- Any incorrect citation, directive financial language, or privacy concern immediately.

Pause new invites and investigate when the 24-hour degraded-analysis rate is above
20%, costs jump unexpectedly, or multiple users report the same correctness issue.
