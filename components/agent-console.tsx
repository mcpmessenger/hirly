'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { StatusBadge, timeLeft } from './task-card'
import {
  TASK_TYPE_LABEL,
  usd,
  type Escrow,
  type Proof,
  type Task,
  type TaskType,
  type Bid,
  type OperatorMandate,
} from '@/lib/types'
import type { ExternalGig } from '@/lib/subcontract'

export interface ConsoleItem {
  task: Task
  escrow: Escrow | null
  proof: Proof | null
  bids?: Bid[]
}
export interface ConsoleStats {
  escrowed_cents: number
  released_cents: number
  open: number
}
export interface Prefill {
  title?: string
  description?: string
  task_type?: TaskType
  price_cents?: number
  proof_requirements?: string
}

const TABS = ['all', 'open', 'claimed', 'submitted', 'paid', 'expired'] as const
const FEE_PCT = 15

const input =
  'w-full rounded-lg border border-[#302e2b] bg-[#161615] px-3 py-2 text-sm outline-none focus:border-[#f4a261]'

export function AgentConsole({
  items,
  stats,
  prefill,
  flash,
  externalGigs = [],
  initialMandate,
}: {
  items: ConsoleItem[]
  stats: ConsoleStats
  prefill?: Prefill
  flash?: { kind: 'ok' | 'err'; text: string } | null
  externalGigs?: ExternalGig[]
  initialMandate?: OperatorMandate
}) {
  const router = useRouter()
  const [tab, setTab] = useState<(typeof TABS)[number]>('all')
  const [showForm, setShowForm] = useState(Boolean(prefill?.title))
  const [showSubcontract, setShowSubcontract] = useState(false)
  const [mandate, setMandate] = useState<OperatorMandate | undefined>(initialMandate)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(flash ?? null)

  const shown = items.filter((i) =>
    tab === 'all' ? true : tab === 'expired' ? ['expired', 'cancelled'].includes(i.task.status) : i.task.status === tab,
  )
  const sel = items.find((i) => i.task.id === selected) ?? null

  async function act(id: string, action: 'approve' | 'reject' | 'cancel') {
    setBusy(id + action)
    const res = await fetch(`/api/tasks/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    setBusy(null)
    setMsg(
      res.ok
        ? {
            kind: 'ok',
            text: {
              approve: 'Approved. Payment captured and earner paid.',
              reject: 'Rejected. Task reopened.',
              cancel: 'Cancelled. Hold released.',
            }[action],
          }
        : { kind: 'err', text: data.error },
    )
    router.refresh()
  }

  async function acceptBid(taskId: string, bidId: string) {
    setBusy('bid' + bidId)
    const res = await fetch(`/api/tasks/${taskId}/bids/${bidId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) {
      setMsg({ kind: 'err', text: data.error || 'Failed to accept bid' })
      return
    }
    setMsg({
      kind: 'ok',
      text: `Offer accepted! Task assigned to earner at ${usd(data.bid?.bid_cents || 0)}.`,
    })
    router.refresh()
  }

  async function ingestGig(gigId: string) {
    setBusy('gig' + gigId)
    const res = await fetch(`/api/subcontract/jobs/${gigId}/ingest`, {
      method: 'POST',
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) {
      setMsg({ kind: 'err', text: data.error || 'Failed to subcontract gig' })
      return
    }
    setShowSubcontract(false)
    setMsg({
      kind: 'ok',
      text: `Subcontracted! Created ${data.result?.created_tasks?.length || 0} micro-tasks. Agent keeps $${data.result?.agent_margin?.toFixed(2)} net profit.`,
    })
    router.refresh()
  }

  async function toggleVault(action: 'authorize' | 'revoke') {
    setBusy('vault')
    const res = await fetch('/api/vault/mandate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) {
      setMsg({ kind: 'err', text: data.error || 'Failed to update vault mandate' })
      return
    }
    if (data.approveUrl) {
      window.location.href = data.approveUrl
      return
    }
    setMandate(data.mandate)
    setMsg({
      kind: 'ok',
      text:
        action === 'authorize'
          ? 'Mandate authorized via PayPal Vault! Headless 0-click escrow holds are now active.'
          : 'Operator mandate revoked. Autonomous agent spending is now frozen.',
    })
    router.refresh()
  }

  async function post(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy('post')
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: f.get('title'),
        description: f.get('description'),
        task_type: f.get('task_type'),
        price_cents: Math.round(Number(f.get('price')) * 100),
        proof_requirements: f.get('proof'),
        deadline_minutes: Number(f.get('deadline')),
      }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) return setMsg({ kind: 'err', text: data.error ?? 'Could not post task' })
    if (data.approveUrl) {
      window.location.href = data.approveUrl // operator approves the PayPal hold
      return
    }
    setShowForm(false)
    setMsg({
      kind: 'ok',
      text: data.headless
        ? 'Task posted autonomously! Escrow hold authorized via PayPal Vault token (0 human clicks).'
        : 'Task posted and funds held in escrow.',
    })
    router.refresh()
  }

  const price = prefill?.price_cents ? prefill.price_cents / 100 : 3

  return (
    <div className="mx-auto max-w-6xl px-6 pb-20 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">Agent console</h1>
          <p className="mt-1 text-sm text-[#8f8b84]">
            Acting as <span className="font-mono text-[#c4beb4]">glazyr-shopper-01</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSubcontract((s) => !s)}
            className="rounded-full border border-[#f4a261] px-5 py-2.5 text-sm font-semibold text-[#f4a261] hover:bg-[#f4a261]/10 transition-colors"
          >
            {showSubcontract ? 'Close Subcontractor' : 'Find Work (Upwork Bridge)'}
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-full bg-[#f4a261] px-5 py-2.5 text-sm font-semibold text-[#171412] hover:bg-[#f4a261]/90 transition-colors"
          >
            {showForm ? 'Close' : 'Post task'}
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          ['Escrowed', usd(stats.escrowed_cents)],
          ['Released', usd(stats.released_cents)],
          ['Open tasks', String(stats.open)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-[#302e2b] bg-[#161615] p-4">
            <p className="text-xs uppercase tracking-widest text-[#77736c]">{k}</p>
            <p className="mt-1 font-mono text-2xl text-[#f4a261]">{v}</p>
          </div>
        ))}
      </div>

      {msg && (
        <p
          role="status"
          className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            msg.kind === 'ok' ? 'bg-[#1d2b22] text-[#8bd3a8]' : 'bg-[#331d1d] text-[#f08f8f]'
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* Operator Budget Mandate & PayPal Vault Card */}
      {mandate && (
        <div className="mb-6 rounded-2xl border border-[#302e2b] bg-[#161615] p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`size-2.5 rounded-full ${
                    mandate.vault_status === 'active'
                      ? 'bg-[#8bd3a8] animate-pulse'
                      : mandate.vault_status === 'pending_approval'
                      ? 'bg-[#f4a261] animate-pulse'
                      : 'bg-[#77736c]'
                  }`}
                />
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#8f8b84]">
                  Operator Budget Mandate • PayPal Vault v3
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase font-semibold ${
                    mandate.vault_status === 'active'
                      ? 'bg-[#1d2b22] text-[#8bd3a8]'
                      : mandate.vault_status === 'pending_approval'
                      ? 'bg-[#33281c] text-[#f4a261]'
                      : 'bg-[#242320] text-[#8f8b84]'
                  }`}
                >
                  {mandate.vault_status === 'active'
                    ? 'Vault Active (Unscheduled MIT)'
                    : mandate.vault_status === 'pending_approval'
                    ? 'Awaiting Operator Approval'
                    : 'Manual Consent Required'}
                </span>
              </div>
              <h3 className="mt-1 text-lg font-medium">Autonomous Spend Guardrails</h3>
            </div>
            <div className="flex items-center gap-2">
              {mandate.vault_status === 'active' ? (
                <button
                  type="button"
                  disabled={busy === 'vault'}
                  onClick={() => toggleVault('revoke')}
                  className="rounded-full border border-[#f08f8f]/40 px-3.5 py-1 text-xs text-[#f08f8f] hover:bg-[#f08f8f]/10 disabled:opacity-50 transition-colors"
                >
                  {busy === 'vault' ? 'Updating…' : 'Revoke Vault Token'}
                </button>
              ) : mandate.vault_status === 'pending_approval' ? (
                <button
                  type="button"
                  disabled={busy === 'vault'}
                  onClick={() => toggleVault('authorize')}
                  className="rounded-full bg-[#f4a261] px-4 py-1 text-xs font-semibold text-[#171412] hover:bg-[#f4a261]/90 disabled:opacity-50 transition-colors"
                >
                  {busy === 'vault' ? 'Redirecting…' : 'Resume PayPal Consent'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy === 'vault'}
                  onClick={() => toggleVault('authorize')}
                  className="rounded-full bg-[#f4a261] px-4 py-1 text-xs font-semibold text-[#171412] hover:bg-[#f4a261]/90 disabled:opacity-50 transition-colors"
                >
                  {busy === 'vault' ? 'Authorizing…' : 'Authorize One-Time Mandate'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3 border-t border-[#262422] pt-4">
            <div>
              <p className="text-[11px] text-[#77736c]">Weekly Spend Pool</p>
              <p className="mt-0.5 font-mono text-sm text-[#f8f5ef]">
                {usd(mandate.spent_this_week_cents)} <span className="text-[#77736c]">/ {usd(mandate.weekly_cap_cents)}</span>
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-[#242320] overflow-hidden">
                <div
                  className="h-full bg-[#f4a261] rounded-full"
                  style={{
                    width: `${Math.min(100, (mandate.spent_this_week_cents / mandate.weekly_cap_cents) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <p className="text-[11px] text-[#77736c]">Per-Task Cap</p>
              <p className="mt-0.5 font-mono text-sm text-[#f8f5ef]">
                {usd(mandate.per_task_cap_cents)} <span className="text-[#77736c]">max per micro-task</span>
              </p>
              <p className="mt-2 text-[11px] text-[#8f8b84]">
                Tasks under {usd(mandate.per_task_cap_cents)} authorize headlessly (0 human clicks).
              </p>
            </div>

            <div>
              <p className="text-[11px] text-[#77736c]">Autonomy Mode</p>
              <p className="mt-0.5 text-xs font-mono">
                {mandate.vault_status === 'active' ? (
                  <span className="text-[#8bd3a8]">● Headless Escrow Hold (0 Clicks)</span>
                ) : mandate.vault_status === 'pending_approval' ? (
                  <span className="text-[#f4a261]">◌ Pending Operator Consent</span>
                ) : (
                  <span className="text-[#77736c]">○ Redirect Required</span>
                )}
              </p>
              <p className="mt-2 text-[11px] text-[#77736c]">
                Token: <span className="font-mono text-[#aaa69e]">{mandate.vault_id ? `${mandate.vault_id.slice(0, 16)}…` : 'None'}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subcontracting Hub (Upwork Bridge) */}
      {showSubcontract && (
        <div className="mb-8 rounded-2xl border border-[#f4a261]/40 bg-[#161615] p-6 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <span className="rounded-full bg-[#f4a261]/20 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-[#f4a261]">
                Upwork & Client Gig Subcontractor
              </span>
              <h2 className="mt-2 text-xl font-semibold">Autonomous Gig Arbitrage</h2>
              <p className="mt-1 text-sm text-[#8f8b84]">
                Accept external client contracts, subcontract physical edge cases to Rukyr earners via PayPal escrow, and keep the analytical profit margin.
              </p>
            </div>
            <button
              onClick={() => setShowSubcontract(false)}
              className="text-xs text-[#77736c] hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {externalGigs.map((g) => {
              const totalPayout = g.subtasks.reduce((sum, s) => sum + s.suggested_price_dollars, 0)
              const margin = g.client_budget_usd - totalPayout
              return (
                <div
                  key={g.id}
                  className="flex flex-col justify-between rounded-xl border border-[#302e2b] bg-[#1b1b1a] p-4 transition-colors hover:border-[#5d5147]"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono uppercase text-[#77736c]">
                        {g.source.toUpperCase()} • {g.posted_time}
                      </span>
                      <span className="font-semibold text-[#8bd3a8]">${g.client_budget_usd.toFixed(2)} Client Budget</span>
                    </div>
                    <h3 className="mt-2 font-medium leading-snug">{g.title}</h3>
                    <p className="mt-2 text-xs text-[#8f8b84] line-clamp-2">{g.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {g.subtasks.map((st, i) => (
                        <span
                          key={i}
                          className="rounded bg-[#242320] px-2 py-0.5 text-[10px] text-[#aaa69e]"
                        >
                          {st.title.slice(0, 32)}… (${st.suggested_price_dollars})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-[#262422] pt-3 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-[#77736c]">Earner Cost: </span>
                      <span className="font-mono text-[#f8f5ef]">${totalPayout.toFixed(2)}</span>
                      <span className="ml-2 text-[#8bd3a8] font-mono">
                        (+${margin.toFixed(2)} Margin)
                      </span>
                    </div>
                    <button
                      disabled={busy === 'gig' + g.id}
                      onClick={() => ingestGig(g.id)}
                      className="rounded-full bg-[#f4a261] px-4 py-1.5 text-xs font-semibold text-[#171412] disabled:opacity-50 hover:bg-[#f4a261]/90"
                    >
                      {busy === 'gig' + g.id ? 'Subcontracting…' : 'Subcontract via Rukyr'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={post}
          className="mb-8 grid gap-4 rounded-2xl border border-[#302e2b] bg-[#161615] p-5 md:grid-cols-2"
        >
          <label className="md:col-span-2 text-sm">
            Title
            <input
              name="title"
              required
              minLength={3}
              maxLength={140}
              defaultValue={prefill?.title}
              className={input + ' mt-1'}
            />
          </label>
          <label className="md:col-span-2 text-sm">
            Instructions
            <textarea
              name="description"
              rows={3}
              maxLength={1000}
              defaultValue={prefill?.description}
              className={input + ' mt-1'}
            />
          </label>
          <label className="text-sm">
            Type
            <select
              name="task_type"
              defaultValue={prefill?.task_type ?? 'verification'}
              className={input + ' mt-1'}
            >
              {Object.entries(TASK_TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Proof required
            <select
              name="proof"
              defaultValue={prefill?.proof_requirements ?? 'photo'}
              className={input + ' mt-1'}
            >
              <option value="photo">Photo</option>
              <option value="text">Text</option>
              <option value="code">Code</option>
            </select>
          </label>
          <label className="text-sm">
            Price (USD, 0.50 to 10)
            <input
              name="price"
              type="number"
              step="0.25"
              min="0.5"
              max="10"
              defaultValue={price}
              className={input + ' mt-1 font-mono'}
            />
          </label>
          <label className="text-sm">
            Deadline
            <select name="deadline" defaultValue="240" className={input + ' mt-1'}>
              <option value="30">30 minutes</option>
              <option value="120">2 hours</option>
              <option value="240">4 hours</option>
              <option value="1440">1 day</option>
              <option value="10080">7 days</option>
            </select>
          </label>
          <div className="md:col-span-2 flex items-center justify-between">
            <p className="text-xs text-[#77736c]">
              A {FEE_PCT}% platform fee is added to the price and held in PayPal escrow until you
              approve the proof.
            </p>
            <button
              disabled={busy === 'post'}
              className="rounded-full bg-[#f4a261] px-5 py-2.5 text-sm font-semibold text-[#171412] disabled:opacity-50"
            >
              {busy === 'post' ? 'Posting…' : 'Post & fund escrow'}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 text-xs capitalize ${
              tab === t ? 'bg-[#f4a261] text-[#171412]' : 'bg-[#242320] text-[#aaa69e]'
            }`}
          >
            {t === 'expired' ? 'cancelled/expired' : t} (
            {
              items.filter((i) =>
                t === 'all'
                  ? true
                  : t === 'expired'
                  ? ['expired', 'cancelled'].includes(i.task.status)
                  : i.task.status === t,
              ).length
            }
            )
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-3">
          {shown.length === 0 && <p className="text-sm text-[#77736c]">Nothing here yet.</p>}
          {shown.map(({ task, bids = [] }) => {
            const pendingBids = bids.filter((b) => b.status === 'pending')
            return (
              <button
                key={task.id}
                onClick={() => setSelected(task.id)}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  selected === task.id
                    ? 'border-[#f4a261]'
                    : 'border-[#302e2b] hover:border-[#5d5147]'
                } bg-[#1b1b1a]`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[.16em] text-[#8f8b84]">
                      {TASK_TYPE_LABEL[task.task_type]}
                    </p>
                    <p className="mt-1 font-medium">{task.title}</p>
                  </div>
                  <span className="font-mono text-lg text-[#f4a261]">{usd(task.price_cents)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-[#77736c]">
                  <span>{timeLeft(task.deadline_at)}</span>
                  <div className="flex items-center gap-2">
                    {pendingBids.length > 0 && task.status === 'open' && (
                      <span className="rounded-full bg-[#f4a261]/20 px-2 py-0.5 text-[10px] font-medium text-[#f4a261]">
                        {pendingBids.length} offer{pendingBids.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <StatusBadge status={task.status} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <aside className="rounded-2xl border border-[#302e2b] bg-[#161615] p-5 lg:sticky lg:top-6 lg:self-start">
          {!sel ? (
            <p className="text-sm text-[#77736c]">Select a task to see its timeline, bids, and review proof.</p>
          ) : (
            <TaskDetail
              item={sel}
              busy={busy}
              onAct={act}
              onAcceptBid={(bidId) => acceptBid(sel.task.id, bidId)}
            />
          )}
        </aside>
      </div>
    </div>
  )
}

function TaskDetail({
  item,
  busy,
  onAct,
  onAcceptBid,
}: {
  item: ConsoleItem
  busy: string | null
  onAct: (id: string, a: 'approve' | 'reject' | 'cancel') => void
  onAcceptBid: (bidId: string) => void
}) {
  const { task, escrow, proof, bids = [] } = item
  const order = ['pending_funding', 'open', 'claimed', 'submitted', 'paid']
  const reached = order.indexOf(task.status)
  const steps = [['Escrowed', 1], ['Claimed', 2], ['Proof submitted', 3], ['Paid', 4]] as const
  const v = proof?.ai_verdict

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-medium">{task.title}</h2>
        <StatusBadge status={task.status} />
      </div>
      {task.description && (
        <p className="mt-2 text-sm leading-6 text-[#8f8b84]">{task.description}</p>
      )}
      <ol className="mt-5 space-y-2 text-sm">
        {steps.map(([label, idx]) => (
          <li key={label} className={reached >= idx ? 'text-[#8bd3a8]' : 'text-[#5a5751]'}>
            {reached >= idx ? '●' : '○'} {label}
          </li>
        ))}
      </ol>
      {escrow && (
        <p className="mt-4 font-mono text-xs text-[#77736c]">
          Escrow {escrow.status}: {usd(escrow.amount_cents)} (fee {usd(escrow.platform_fee_cents)})
          <br />
          Order {escrow.paypal_order_id}
        </p>
      )}

      {/* Bids & Reverse Auction Section */}
      {bids.length > 0 && (
        <div className="mt-5 rounded-xl border border-[#302e2b] bg-[#1b1b1a] p-4">
          <p className="text-xs uppercase tracking-widest text-[#77736c]">
            Earner Offers & Bids ({bids.length})
          </p>
          <div className="mt-3 divide-y divide-[#262422]">
            {bids.map((b) => (
              <div key={b.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#f4a261]">
                      {usd(b.bid_cents)}
                    </span>
                    <span className="text-[#77736c]">ETA: {b.eta_minutes}m</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-mono uppercase ${
                        b.status === 'accepted'
                          ? 'bg-[#1d2b22] text-[#8bd3a8]'
                          : b.status === 'rejected'
                          ? 'bg-[#331d1d] text-[#f08f8f]'
                          : 'bg-[#2c2a20] text-[#e6d37a]'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  {b.pitch && <p className="mt-1 text-[#aaa69e]">{b.pitch}</p>}
                </div>
                {task.status === 'open' && b.status === 'pending' && (
                  <button
                    disabled={!!busy}
                    onClick={() => onAcceptBid(b.id)}
                    className="shrink-0 rounded-full bg-[#f4a261] px-3 py-1 text-xs font-semibold text-[#171412] disabled:opacity-50 hover:bg-[#f4a261]/90"
                  >
                    {busy === 'bid' + b.id ? 'Accepting…' : 'Accept Offer'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {proof && task.status === 'submitted' && (
        <div className="mt-5 rounded-xl border border-[#302e2b] bg-[#1b1b1a] p-4">
          <p className="text-xs uppercase tracking-widest text-[#77736c]">Submitted proof</p>
          {proof.proof_image_url && (
            <Image
              src={proof.proof_image_url}
              alt="Proof submitted by earner"
              width={600}
              height={400}
              unoptimized
              className="mt-3 max-h-72 w-full rounded-lg object-contain"
            />
          )}
          {proof.proof_text && <p className="mt-3 text-sm">{proof.proof_text}</p>}
          <div
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              v === 'pass'
                ? 'bg-[#1d2b22] text-[#8bd3a8]'
                : v === 'fail'
                ? 'bg-[#331d1d] text-[#f08f8f]'
                : 'bg-[#33281c] text-[#f4a261]'
            }`}
          >
            AI verdict: <strong>{v}</strong> ({Math.round((proof.ai_confidence ?? 0) * 100)}%
            confidence)
            <p className="mt-1 text-xs opacity-80">{proof.ai_reasoning}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              disabled={!!busy}
              onClick={() => onAct(task.id, 'approve')}
              className="flex-1 rounded-full bg-[#f4a261] px-4 py-2 text-sm font-semibold text-[#171412] disabled:opacity-50"
            >
              {busy === task.id + 'approve'
                ? 'Releasing…'
                : `Approve & release ${usd(task.price_cents)}`}
            </button>
            <button
              disabled={!!busy}
              onClick={() => onAct(task.id, 'reject')}
              className="rounded-full border border-[#44413c] px-4 py-2 text-sm disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {['open', 'claimed', 'submitted'].includes(task.status) && (
        <button
          disabled={!!busy}
          onClick={() => onAct(task.id, 'cancel')}
          className="mt-4 text-xs text-[#77736c] underline disabled:opacity-50"
        >
          Cancel task & release hold
        </button>
      )}
    </div>
  )
}
