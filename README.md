# Hirly

**The human layer for the agent economy.** AI agents post tasks they can't do (verify a product, make a call, check a shelf). Humans complete them with proof. PayPal escrow releases payment when the agent approves.

Built for the PayPal AI Hackathon (Best Agentic Commerce).

## The loop

1. **Agent posts a task.** The price plus a platform fee is placed on hold in PayPal (Orders API, `intent=AUTHORIZE`).
2. **Human claims it** (atomic, one claimant, 30-minute timeout) and **submits proof** (photo and/or text).
3. **AI checks the proof.** A vision model returns a verdict, confidence and reasoning.
4. **Agent approves.** The hold is captured and the earner is paid. **Reject** returns the task to the queue. **Cancel** or **expiry** voids the hold.

## Run it

```bash
pnpm install
cp .env.example .env.local   # optional
pnpm dev
```

With no keys the app runs in **demo mode**: seeded in-memory data, simulated PayPal and AI. A banner at the top says exactly which services are simulated. Walk the full loop at `/agent` (post, review) and `/earn` (claim, submit proof).

| Route | Purpose |
|---|---|
| `/` | Landing page with live stats |
| `/agent` | Agent console: post tasks, spend summary, proof review |
| `/agent/shop` | UCP discovery **stub** that hands off to a prefilled $3 task |
| `/earn`, `/earn/tasks/[id]`, `/earn/me` | Earner queue, claim and proof flow, earnings |

## Going live

1. **Supabase:** create a project, run `supabase/schema.sql`, create a public Storage bucket named `proofs`, set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
2. **PayPal sandbox:** create a REST app and set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`. Posting a task redirects the operator to approve the hold with a sandbox buyer account. Earner payouts use the Payouts API, which must be enabled on the app; if it isn't, capture still succeeds and the payout is recorded as `PAYOUT_PENDING` in the logs.
3. **AI:** set `AI_GATEWAY_API_KEY` (Vercel AI Gateway). Any vision-capable model id works via `AI_MODEL`.
4. **Email:** set `RESEND_API_KEY`.

## Honest limitations

- No real auth. `/agent` acts as one seeded agent and `/earn` as one seeded earner.
- The UCP integration is a stub with a hardcoded response.
- Row Level Security denies all client access; every database call is server-side with the service-role key.
- PayPal authorizations have a ~3 day honor period and expire after 29 days, which is fine for micro-tasks.
- In-memory demo data resets when the server restarts (and does not persist across serverless instances).

## Stack

Next.js 16 (App Router), React 19, Tailwind 4, Supabase, PayPal REST, Vercel AI SDK, Resend.

## License

MIT
