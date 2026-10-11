'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { StatusBadge, timeLeft } from './task-card'
import { TASK_TYPE_LABEL, usd, type Escrow, type Proof, type Task, type TaskType } from '@/lib/types'

export interface ConsoleItem {
  task: Task
  escrow: Escrow | null
  proof: Proof | null
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
  items, stats, prefill, flash,
}: { items: ConsoleItem[]; stats: ConsoleStats; prefill?: Prefill; flash?: { kind: 'ok' | 'err'; text: string } | null }) {
  const router = useRouter()
  const [tab, setTab] = useState<(typeof TABS)[number]>('all')
  const [showForm, setShowForm] = useState(Boolean(prefill?.title))
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
    setMsg(res.ok ? { kind: 'ok', text: { approve: 'Approved. Payment captured and earner paid.', reject: 'Rejected. Task reopened.', cancel: 'Cancelled. Hold released.' }[action] } : { kind: 'err', text: data.error })
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
    setMsg({ kind: 'ok', text: 'Task posted and funds held in escrow.' })
    router.refresh()
  }

  const price = prefill?.price_cents ? prefill.price_cents / 100 : 3

  return (
    <div className="mx-auto max-w-6xl px-6 pb-20 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">Agent console</h1>
          <p className="mt-1 text-sm text-[#8f8b84]">Acting as <span className="font-mono text-[#c4beb4]">glazyr-shopper-01</span></p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-full bg-[#f4a261] px-5 py-2.5 text-sm font-semibold text-[#171412]">
          {showForm ? 'Close' : 'Post task'}
        </button>
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
        <p role="status" className={`mb-6 rounded-lg px-4 py-3 text-sm ${msg.kind === 'ok' ? 'bg-[#1d2b22] text-[#8bd3a8]' : 'bg-[#331d1d] text-[#f08f8f]'}`}>
          {msg.text}
        </p>
      )}

      {showForm && (
        <form onSubmit={post} className="mb-8 grid gap-4 rounded-2xl border border-[#302e2b] bg-[#161615] p-5 md:grid-cols-2">
          <label className="md:col-span-2 text-sm">Title
            <input name="title" required minLength={3} maxLength={140} defaultValue={prefill?.title} className={input + ' mt-1'} />
          </label>
          <label className="md:col-span-2 text-sm">Instructions
            <textarea name="description" rows={3} maxLength={1000} defaultValue={prefill?.description} className={input + ' mt-1'} />
          </label>
          <label className="text-sm">Type
            <select name="task_type" defaultValue={prefill?.task_type ?? 'verification'} className={input + ' mt-1'}>
              {Object.entries(TASK_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="text-sm">Proof required
            <select name="proof" defaultValue={prefill?.proof_requirements ?? 'photo'} className={input + ' mt-1'}>
              <option value="photo">Photo</option><option value="text">Text</option><option value="code">Code</option>
            </select>
          </label>
          <label className="text-sm">Price (USD, 0.50 to 10)
            <input name="price" type="number" step="0.25" min="0.5" max="10" defaultValue={price} className={input + ' mt-1 font-mono'} />
          </label>
          <label className="text-sm">Deadline
            <select name="deadline" defaultValue="240" className={input + ' mt-1'}>
              <option value="30">30 minutes</option><option value="120">2 hours</option><option value="240">4 hours</option><option value="1440">1 day</option><option value="10080">7 days</option>
            </select>
          </label>
          <div className="md:col-span-2 flex items-center justify-between">
            <p className="text-xs text-[#77736c]">A {FEE_PCT}% platform fee is added to the price and held in PayPal escrow until you approve the proof.</p>
            <button disabled={busy === 'post'} className="rounded-full bg-[#f4a261] px-5 py-2.5 text-sm font-semibold text-[#171412] disabled:opacity-50">
              {busy === 'post' ? 'Posting…' : 'Post & fund escrow'}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1.5 text-xs capitalize ${tab === t ? 'bg-[#f4a261] text-[#171412]' : 'bg-[#242320] text-[#aaa69e]'}`}>
            {t === 'expired' ? 'cancelled/expired' : t} ({items.filter((i) => (t === 'all' ? true : t === 'expired' ? ['expired', 'cancelled'].includes(i.task.status) : i.task.status === t)).length})
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-3">
          {shown.length === 0 && <p className="text-sm text-[#77736c]">Nothing here yet.</p>}
          {shown.map(({ task }) => (
            <button key={task.id} onClick={() => setSelected(task.id)} className={`rounded-2xl border p-4 text-left transition-colors ${selected === task.id ? 'border-[#f4a261]' : 'border-[#302e2b] hover:border-[#5d5147]'} bg-[#1b1b1a]`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-[.16em] text-[#8f8b84]">{TASK_TYPE_LABEL[task.task_type]}</p>
                  <p className="mt-1 font-medium">{task.title}</p>
                </div>
                <span className="font-mono text-lg text-[#f4a261]">{usd(task.price_cents)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[#77736c]">
                <span>{timeLeft(task.deadline_at)}</span><StatusBadge status={task.status} />
              </div>
            </button>
          ))}
        </div>

        <aside className="rounded-2xl border border-[#302e2b] bg-[#161615] p-5 lg:sticky lg:top-6 lg:self-start">
          {!sel ? (
            <p className="text-sm text-[#77736c]">Select a task to see its timeline and review proof.</p>
          ) : (
            <TaskDetail item={sel} busy={busy} onAct={act} />
          )}
        </aside>
      </div>
    </div>
  )
}

function TaskDetail({ item, busy, onAct }: { item: ConsoleItem; busy: string | null; onAct: (id: string, a: 'approve' | 'reject' | 'cancel') => void }) {
  const { task, escrow, proof } = item
  const order = ['pending_funding', 'open', 'claimed', 'submitted', 'paid']
  const reached = order.indexOf(task.status)
  const steps = [['Escrowed', 1], ['Claimed', 2], ['Proof submitted', 3], ['Paid', 4]] as const
  const v = proof?.ai_verdict
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-medium">{task.title}</h2><StatusBadge status={task.status} />
      </div>
      {task.description && <p className="mt-2 text-sm leading-6 text-[#8f8b84]">{task.description}</p>}
      <ol className="mt-5 space-y-2 text-sm">
        {steps.map(([label, idx]) => (
          <li key={label} className={reached >= idx ? 'text-[#8bd3a8]' : 'text-[#5a5751]'}>{reached >= idx ? '●' : '○'} {label}</li>
        ))}
      </ol>
      {escrow && (
        <p className="mt-4 font-mono text-xs text-[#77736c]">
          Escrow {escrow.status}: {usd(escrow.amount_cents)} (fee {usd(escrow.platform_fee_cents)})
          <br />Order {escrow.paypal_order_id}
        </p>
      )}

      {proof && task.status === 'submitted' && (
        <div className="mt-5 rounded-xl border border-[#302e2b] bg-[#1b1b1a] p-4">
          <p className="text-xs uppercase tracking-widest text-[#77736c]">Submitted proof</p>
          {proof.proof_image_url && (
            <Image src={proof.proof_image_url} alt="Proof submitted by earner" width={600} height={400} unoptimized className="mt-3 max-h-72 w-full rounded-lg object-contain" />
          )}
          {proof.proof_text && <p className="mt-3 text-sm">{proof.proof_text}</p>}
          <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${v === 'pass' ? 'bg-[#1d2b22] text-[#8bd3a8]' : v === 'fail' ? 'bg-[#331d1d] text-[#f08f8f]' : 'bg-[#33281c] text-[#f4a261]'}`}>
            AI verdict: <strong>{v}</strong> ({Math.round((proof.ai_confidence ?? 0) * 100)}% confidence)
            <p className="mt-1 text-xs opacity-80">{proof.ai_reasoning}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button disabled={!!busy} onClick={() => onAct(task.id, 'approve')} className="flex-1 rounded-full bg-[#f4a261] px-4 py-2 text-sm font-semibold text-[#171412] disabled:opacity-50">
              {busy === task.id + 'approve' ? 'Releasing…' : `Approve & release ${usd(task.price_cents)}`}
            </button>
            <button disabled={!!busy} onClick={() => onAct(task.id, 'reject')} className="rounded-full border border-[#44413c] px-4 py-2 text-sm disabled:opacity-50">Reject</button>
          </div>
        </div>
      )}

      {['open', 'claimed', 'submitted'].includes(task.status) && (
        <button disabled={!!busy} onClick={() => onAct(task.id, 'cancel')} className="mt-4 text-xs text-[#77736c] underline disabled:opacity-50">
          Cancel task & release hold
        </button>
      )}
    </div>
  )
}
