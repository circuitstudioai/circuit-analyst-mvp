# Market Desk operator notes

The hardened live slice covers NVDA only. COST, XOM, JPM, and HIMS remain fixture-backed preview companies. The slice does not send alerts and does not accept user-selected watchlists.

## Run one evidence pass

`POST /api/market-desk/cycle` with `Authorization: Bearer $CIRCUIT_JOB_SECRET`.

The job loads the latest persisted NVDA thesis, fetches the newest SEC primary filing document and adjusted daily prices, extracts evidence passages for the NVDA research lenses, and publishes a baseline or materiality decision. The response status is `completed`, `partial`, or `failed`. Partial means a source failed or a required lens had no evidence. Failed means the run had no usable evidence. Do not treat a failed run as a high-confidence thesis.

Running the job again with the same evidence reuses the idempotency key. It does not create a second event or a second chart marker.

`GET /api/market-desk/cycle` with the same credential returns the latest persisted NVDA cycle. POST and GET fail closed when durable Supabase storage is unavailable. Runs, evidence records, and markers have row-level security and no browser policies; the service role is the only writer.

## Chart

`GET /api/market-desk/chart?symbol=NVDA&range=1y&chart=line` is limited to the five pilot symbols. A provider failure returns quality `failed` and still lists evidence-linked markers. Splits that explain a raw price jump are labeled and are not thesis events.

## What stays off

A signed-in `POST /api/market-desk/monitoring` returns 409. Unsigned requests are rejected earlier. The notification row, when the database is configured, is `not_sent`. The cycle route returns 503 until `CIRCUIT_JOB_SECRET` or `CRON_SECRET` is set. Activation stays closed until all of these are true:

- 25 companies have completed the pilot
- reliability, false-positive rate, and cost per company have been measured against the gates in `web/src/lib/marketDeskTemplates.ts`
- securities-counsel review is recorded

Judgments and chart annotations can be stored for a signed-in user through their own POST routes. An agent cannot write either record. Notes composed in the preview UI remain in the browser tab until that account route succeeds.
