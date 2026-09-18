# Alpha release runbook

## Release gate

Production URL: `https://circuit-analyst.vercel.app`

1. Apply pending Supabase migrations.
2. Set `OPEN_SIGNUP_ENABLED=true` and `PUBLIC_APP_URL=https://circuit-analyst.vercel.app`. To pause new access, set `OPEN_SIGNUP_ENABLED=false`; existing admins and `ALPHA_ALLOWED_EMAILS` entries retain access.
3. Confirm `GEMINI_API_KEY`, `GEMINI_DEEP_MODEL`, Supabase URL, publishable key, and service-role key are present.
4. Deploy the reviewed `main` commit to production.
5. Run `npm run smoke:beta` against production and save its successful JSON output.
6. Run `npm run eval:finance:live` and save the eight-case JSON baseline.
7. Verify `/api/admin/ops?hours=24` and `/api/admin/validation?cohort=alpha-2026-09` as an admin.

The Vercel project is connected to `circuitstudioai/circuit-analyst-mvp` with
`web` as its root directory and `main` as its production branch. A merge to
`main` should therefore create the production deployment automatically.

Do not promote open signup when the smoke fails, any live evaluation returns a
technical fallback, provider authentication is failing, or the signup kill switch
has not been verified.

## Daily owner checklist

The Circuit Studio product owner reviews this once each business day:

- Provider calls, units, reported cost, and degraded-analysis rate from the ops endpoint.
- New feedback and cohort activation from the validation endpoint.
- Support messages at `support@circuitstudio.ai`.
- Any incorrect citation, directive financial language, or privacy concern immediately.

Pause new signups and investigate when the 24-hour degraded-analysis rate is above
20%, costs jump unexpectedly, or multiple users report the same correctness issue.
