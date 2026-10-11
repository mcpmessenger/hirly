import Link from 'next/link'
import { ChevronRight, Clock3 } from 'lucide-react'
import { TASK_TYPE_LABEL, usd, type Task } from '@/lib/types'

export function timeLeft(deadline: string | null): string {
  if (!deadline) return 'No deadline'
  const ms = Date.parse(deadline) - Date.now()
  if (ms <= 0) return 'Expired'
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m} min left`
  const h = Math.floor(m / 60)
  return h < 48 ? `${h} hr${h > 1 ? 's' : ''} left` : `${Math.floor(h / 24)} days left`
}

const STATUS_STYLE: Record<string, string> = {
  pending_funding: 'bg-[#2c2a20] text-[#e6d37a]',
  open: 'bg-[#1d2b22] text-[#8bd3a8]',
  claimed: 'bg-[#1f2736] text-[#8fb4f0]',
  submitted: 'bg-[#33281c] text-[#f4a261]',
  verified: 'bg-[#1d2b22] text-[#8bd3a8]',
  paid: 'bg-[#1d2b22] text-[#8bd3a8]',
  cancelled: 'bg-[#2a2a2a] text-[#888]',
  expired: 'bg-[#2a2a2a] text-[#888]',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${STATUS_STYLE[status] ?? ''}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export function TaskCard({ task, href, showStatus }: { task: Task; href: string; showStatus?: boolean }) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-[#302e2b] bg-[#1b1b1a] p-5 transition-colors hover:border-[#5d5147]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold tracking-[.16em] text-[#8f8b84]">
            {TASK_TYPE_LABEL[task.task_type]}
          </span>
          <h3 className="mt-2 max-w-md font-medium leading-6">{task.title}</h3>
        </div>
        <span className="font-mono text-xl text-[#f4a261]">{usd(task.price_cents)}</span>
      </div>
      <div className="mt-5 flex items-center justify-between text-xs text-[#77736c]">
        <span className="flex items-center gap-1.5">
          <Clock3 aria-hidden="true" className="size-3.5" /> {timeLeft(task.deadline_at)}
        </span>
        <span className="flex items-center gap-3">
          {showStatus && <StatusBadge status={task.status} />}
          <span className="flex items-center gap-1 text-[#b1aca4]">
            View task <ChevronRight aria-hidden="true" className="size-4" />
          </span>
        </span>
      </div>
    </Link>
  )
}
