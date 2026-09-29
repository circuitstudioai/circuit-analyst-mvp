# Market Desk operator notes

The live slice covers NVDA, COST, XOM, JPM, and HIMS. It does not send alerts and it does not accept user-selected watchlists.

## Run one evidence pass

`POST /api/market-desk/cycle` with `Authorization: Bearer $CIRCUIT_JOB_SECRET`.

The job collects SEC submissions and adjusted daily prices, publishes a baseline or a materiality decision, and skips a company when the budget is exhausted. The response status is `completed`, `partial`, or `failed`. Partial means a source failed, a required lens had no evidence, or a company was skipped. Failed means a company had no usable evidence. Do not treat a failed run as a high-confidence thesis.

Running the job again with the same evidence reuses the idempotency key. It does not create a second event or a second chart marker.

`GET /api/market-desk/cycle` with the same credential returns the runs held in the current server process. Durable rows are written only when Supabase is configured. Those tables have row-level security and no browser policies; the service role is the only writer.

## Chart

`GET /api/market-desk/chart?symbol=NVDA&range=1y&chart=line` is limited to the five pilot symbols. A provider failure returns quality `failed` and still lists evidence-linked markers. Splits that explain a raw price jump are labeled and are not thesis events.

## What stays off

A signed-in `POST /api/market-desk/monitoring` returns 409. Unsigned requests are rejected earlier. The notification row, when the database is configured, is `not_sent`. The cycle route returns 503 until `CIRCUIT_JOB_SECRET` or `CRON_SECRET` is set. Activation stays closed until all of these are true:

- 25 companies have completed the pilot
- reliability, false-positive rate, and cost per company have been measured against the gates in `web/src/lib/marketDeskTemplates.ts`
- securities-counsel review is recorded

Judgments and chart annotations can be stored for a signed-in user through their own POST routes. An agent cannot write either record. Notes composed in the preview UI remain in the browser tab until that account route succeeds.
