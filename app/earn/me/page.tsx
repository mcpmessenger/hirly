import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { StatusBadge } from '@/components/task-card'
import { getDemoProfile, listTasks } from '@/lib/db'
import { usd } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EarningsPage() {
  const human = await getDemoProfile('human')
  const mine = (await listTasks()).filter((t) => t.claimed_by === human.id || (t.status === 'paid' && t.claimed_by === human.id))
  const paid = mine.filter((t) => t.status === 'paid').reduce((s, t) => s + t.price_cents, 0)
  const pending = mine.filter((t) => ['claimed', 'submitted'].includes(t.status)).reduce((s, t) => s + t.price_cents, 0)
  return (
    <main className="min-h-screen bg-[#111111] text-[#f8f5ef]">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 pb-20">
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">Earnings</h1>
        <p className="mt-1 text-sm text-[#8f8b84]">
          <span className="font-mono text-[#c4beb4]">{human.display_name}</span> · reputation {human.reputation.toFixed(1)}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#302e2b] bg-[#161615] p-4"><p className="text-xs uppercase tracking-widest text-[#77736c]">Paid</p><p className="mt-1 font-mono text-2xl text-[#8bd3a8]">{usd(paid)}</p></div>
          <div className="rounded-2xl border border-[#302e2b] bg-[#161615] p-4"><p className="text-xs uppercase tracking-widest text-[#77736c]">Pending</p><p className="mt-1 font-mono text-2xl text-[#f4a261]">{usd(pending)}</p></div>
        </div>
        <div className="mt-8 flex flex-col gap-2">
          {mine.length === 0 && <p className="text-sm text-[#77736c]">No tasks yet. <Link className="underline" href="/earn">Find one</Link>.</p>}
          {mine.map((t) => (
            <Link key={t.id} href={`/earn/tasks/${t.id}`} className="flex items-center justify-between rounded-xl border border-[#302e2b] bg-[#1b1b1a] px-4 py-3 text-sm">
              <span>{t.title}</span>
              <span className="flex items-center gap-3"><StatusBadge status={t.status} /><span className="font-mono text-[#f4a261]">{usd(t.price_cents)}</span></span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
