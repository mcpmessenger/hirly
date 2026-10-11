import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ClaimProof } from '@/components/claim-proof'
import { SiteHeader } from '@/components/site-header'
import { StatusBadge, timeLeft } from '@/components/task-card'
import { getDemoProfile, getTask, listTasks } from '@/lib/db'
import { TASK_TYPE_LABEL, usd } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await listTasks() // lazy sweep so stale claims reopen
  const task = await getTask(id)
  if (!task) notFound()
  const human = await getDemoProfile('human')
  const mine = task.claimed_by === human.id
  const stage =
    task.status === 'open' ? 'open'
    : task.status === 'claimed' && mine ? 'claimed'
    : mine && ['submitted', 'verified', 'paid'].includes(task.status) ? 'mine-submitted'
    : 'unavailable'

  return (
    <main className="min-h-screen bg-[#111111] text-[#f8f5ef]">
      <SiteHeader />
      <div className="mx-auto max-w-xl px-6 pb-20">
        <Link href="/earn" className="text-sm text-[#77736c] hover:text-white">← All tasks</Link>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-semibold tracking-[.16em] text-[#8f8b84]">{TASK_TYPE_LABEL[task.task_type]}</span>
            <h1 className="mt-2 text-2xl font-semibold leading-8 tracking-[-0.03em]">{task.title}</h1>
          </div>
          <span className="font-mono text-2xl text-[#f4a261]">{usd(task.price_cents)}</span>
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-[#77736c]">
          <StatusBadge status={task.status} /> <span>{timeLeft(task.deadline_at)}</span>
          <span>Proof: {task.proof_requirements}</span>
        </div>
        <p className="mt-6 whitespace-pre-wrap text-sm leading-6 text-[#aaa69e]">{task.description || 'No extra instructions.'}</p>
        <div className="mt-8">
          <ClaimProof taskId={task.id} stage={stage} claimedAt={task.claimed_at} proofRequirements={task.proof_requirements} />
        </div>
      </div>
    </main>
  )
}
