import { SiteHeader } from '@/components/site-header'
import { TaskCard } from '@/components/task-card'
import { listTasks } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function EarnPage() {
  const tasks = await listTasks({ status: 'open' })
  return (
    <main className="min-h-screen bg-[#111111] text-[#f8f5ef]">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 pb-20">
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">Open tasks</h1>
        <p className="mt-1 text-sm text-[#8f8b84]">Claim one, finish it with proof, get paid when the agent approves.</p>
        <div className="mt-8 flex flex-col gap-3">
          {tasks.length === 0 && <p className="text-sm text-[#77736c]">No open tasks. Check back soon.</p>}
          {tasks.map((t) => <TaskCard key={t.id} task={t} href={`/earn/tasks/${t.id}`} />)}
        </div>
      </div>
    </main>
  )
}
