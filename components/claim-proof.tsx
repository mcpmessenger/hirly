'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CLAIM_TIMEOUT_MS } from '@/lib/types'

type Stage = 'open' | 'claimed' | 'mine-submitted' | 'unavailable'

export function ClaimProof({
  taskId, stage, claimedAt, proofRequirements,
}: { taskId: string; stage: Stage; claimedAt: string | null; proofRequirements: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (stage !== 'claimed' || !claimedAt) return
    const tick = () => setRemaining(Math.max(0, Date.parse(claimedAt) + CLAIM_TIMEOUT_MS - Date.now()))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [stage, claimedAt])

  async function claim() {
    setBusy(true); setError(null)
    const res = await fetch(`/api/tasks/${taskId}/claim`, { method: 'POST' })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) setError(data.error)
    router.refresh()
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true); setError(null)
    const res = await fetch(`/api/tasks/${taskId}/proof`, { method: 'POST', body: new FormData(e.currentTarget) })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) return setError(data.error)
    router.refresh()
  }

  if (stage === 'unavailable') return <p className="rounded-lg bg-[#242320] p-4 text-sm text-[#aaa69e]">This task is no longer available.</p>
  if (stage === 'mine-submitted') return <p className="rounded-lg bg-[#1d2b22] p-4 text-sm text-[#8bd3a8]">Proof submitted. You&apos;ll be paid when the agent approves it.</p>

  if (stage === 'open') {
    return (
      <div>
        <button onClick={claim} disabled={busy} className="w-full rounded-full bg-[#f4a261] px-6 py-3.5 font-semibold text-[#171412] disabled:opacity-50">
          {busy ? 'Claiming…' : 'Claim this task'}
        </button>
        <p className="mt-2 text-xs text-[#77736c]">You&apos;ll have 30 minutes to submit proof before it returns to the queue.</p>
        {error && <p role="alert" className="mt-3 text-sm text-[#f08f8f]">{error}</p>}
      </div>
    )
  }

  const mins = remaining === null ? '--' : String(Math.floor(remaining / 60000)).padStart(2, '0')
  const secs = remaining === null ? '--' : String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')
  const needsPhoto = proofRequirements.includes('photo')
  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="font-mono text-sm text-[#f4a261]">Time left to submit: {mins}:{secs}</p>
      {needsPhoto && (
        <label className="block text-sm">Photo proof
          <input name="image" type="file" accept="image/*" capture="environment" required className="mt-1 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[#242320] file:px-4 file:py-2 file:text-[#f8f5ef]" />
        </label>
      )}
      <label className="block text-sm">Notes {needsPhoto ? '(optional)' : ''}
        <textarea name="proof_text" rows={4} required={!needsPhoto} className="mt-1 w-full rounded-lg border border-[#302e2b] bg-[#161615] px-3 py-2 text-sm outline-none focus:border-[#f4a261]" />
      </label>
      <button disabled={busy} className="w-full rounded-full bg-[#f4a261] px-6 py-3.5 font-semibold text-[#171412] disabled:opacity-50">
        {busy ? 'Checking proof…' : 'Submit proof'}
      </button>
      {error && <p role="alert" className="text-sm text-[#f08f8f]">{error}</p>}
    </form>
  )
}
