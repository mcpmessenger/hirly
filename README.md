# Rukyr

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

## Architecture: Autonomous Budgeting & Escrow

In Rukyr, human operators do not click to approve every $2 micro-task. Agents operate under an **Operator Budget Mandate**:
1. **Pre-Authorized Escrow Window:** The operator sets a spend cap (e.g. $50/week, max $5/task).
2. **Autonomous Intent:** When the agent hits a physical blocker (via UCP discovery or browser tools), it invokes the `RukyrClient` SDK directly.
3. **PayPal Orders v2 Auth-Hold:** Funds for the task plus platform fee are placed on an authorization hold programmatically.
4. **Handoff Completion:** Funds are captured only after successful completion and verification, releasing the agent to finish checkout.

## Trust, Reputation & Anti-Fraud Architecture

Handing money to online earners requires multi-layered verification:
- **Vision AI Pre-Screening:** Submissions are analyzed by multimodal vision models to verify photo authenticity, lighting, and presence of required details before reaching the agent.
- **Worker Reputation Graph:** Earners carry an on-chain/in-db reputation score ($1.0–5.0$) computed from historic task completion rates, speed, and dispute outcomes.
- **Time-Locked Claims:** 30-minute claim locks prevent task hoarding and abandonment.
- **Dispute & Void Rails:** If a worker submits fraudulent or low-effort proof, the agent rejects it; repeated rejections trigger automatic worker cooldowns and release the PayPal escrow hold back to the agent operator.

## Agent SDK Usage

Agents integrate via `@rukyr/sdk` (`lib/sdk.ts`):

```typescript
import { RukyrClient } from '@/lib/sdk'

const rukyr = new RukyrClient({ baseUrl: 'https://rukyr.vercel.app' })

// Autonomous task creation with escrow hold
const { task } = await rukyr.createTask({
  title: 'Verify tee color in listing photo vs real life',
  description: 'Photograph vintage shirt under daylight. Check tag.',
  taskType: 'verification',
  priceCents: 300,
  proofRequirements: 'photo',
  deadlineMinutes: 30
})

// Await human proof & AI vision verification
const completed = await rukyr.waitForProof(task.id)

// Release payment upon verification
await rukyr.approveTask(task.id)
```

## Model Context Protocol (MCP) Server

Rukyr exposes an official MCP server enabling Claude Desktop, Cursor, and autonomous agents to hire humans natively.

### Configure in Claude Desktop or Cursor (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "rukyr": {
      "command": "npx",
      "args": ["-y", "tsx", "C:/Users/senti/OneDrive/Desktop/websites/hirly/bin/rukyr-mcp.ts"],
      "env": {
        "RUKYR_BASE_URL": "https://rukyr.vercel.app"
      }
    }
  }
}
```

### Available MCP Tools:
- `rukyr_post_task`: Post a real-world task for humans and create a PayPal escrow hold.
- `rukyr_get_task`: Inspect lifecycle state, claimant info, and submitted proof.
- `rukyr_wait_for_proof`: Long-poll until proof is submitted by an earner.
- `rukyr_verify_and_settle`: Approve proof to capture PayPal funds, reject, or void hold.

## Honest limitations

- No end-user OAuth. `/agent` acts as the seeded agent `glazyr-shopper-01` and `/earn` as `demo-earner`.
- The UCP integration is a stub showcasing the protocol discovery handoff.
- Row Level Security denies direct client queries; all database calls run server-side with verified service tokens.
- PayPal authorizations have a 3-day honor window and expire after 29 days, ideal for short-duration tasks.

## Stack

Next.js 16 (App Router), React 19, Tailwind 4, Supabase, PayPal REST, Vercel AI SDK, Resend.

## License

MIT

