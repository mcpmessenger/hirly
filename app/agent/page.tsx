import { SiteHeader } from '@/components/site-header'
import { AgentConsole, type ConsoleItem, type Prefill } from '@/components/agent-console'
import { getEscrow, getLatestProof, getOperatorMandate, getStats, listBidsForTask, listTasks } from '@/lib/db'
import { discoverExternalGigs } from '@/lib/subcontract'
import type { TaskType } from '@/lib/types'

export const dynamic = 'force-dynamic'

const FLASH: Record<string, { kind: 'ok' | 'err'; text: string }> = {
  funded: { kind: 'ok', text: 'PayPal hold approved. Your task is live.' },
  funding_cancelled: { kind: 'err', text: 'PayPal approval was cancelled; the task was not posted.' },
  authorize_failed: { kind: 'err', text: 'PayPal could not authorize the hold. Try again.' },
  unknown_task: { kind: 'err', text: 'Unknown task.' },
  vault_authorized: { kind: 'ok', text: 'Operator mandate authorized via PayPal Vault. Headless escrow active.' },
}

export default async function AgentPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const [tasks, stats, externalGigs, mandate] = await Promise.all([
    listTasks(),
    getStats(),
    discoverExternalGigs(),
    getOperatorMandate(),
  ])
  const items: ConsoleItem[] = await Promise.all(
    tasks.map(async (task) => ({
      task,
      escrow: await getEscrow(task.id),
      proof: task.status === 'submitted' || task.status === 'paid' ? await getLatestProof(task.id) : null,
      bids: await listBidsForTask(task.id),
    })),
  )
  const prefill: Prefill | undefined = sp.title
    ? {
        title: sp.title,
        description: sp.description,
        task_type: (sp.type as TaskType) ?? 'verification',
        price_cents: sp.price ? Number(sp.price) : undefined,
        proof_requirements: sp.proof,
      }
    : undefined
  const flash = sp.funded
    ? FLASH.funded
    : sp.vault === 'authorized'
    ? FLASH.vault_authorized
    : sp.error
    ? FLASH[sp.error] ?? null
    : null

  return (
    <main className="min-h-screen bg-[#111111] text-[#f8f5ef]">
      <SiteHeader />
      <AgentConsole
        items={items}
        stats={stats}
        prefill={prefill}
        flash={flash}
        externalGigs={externalGigs}
        initialMandate={mandate}
      />
    </main>
  )
}
