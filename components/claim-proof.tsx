'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CLAIM_TIMEOUT_MS, usd, type Bid } from '@/lib/types'

type Stage = 'open' | 'claimed' | 'mine-submitted' | 'unavailable'

export function ClaimProof({
  taskId,
  taskPriceCents = 300,
  stage,
  claimedAt,
  proofRequirements,
  initialBids = [],
}: {
  taskId: string
  taskPriceCents?: number
  stage: Stage
  claimedAt: string | null
  proofRequirements: string
  initialBids?: Bid[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bids, setBids] = useState<Bid[]>(initialBids)
  const [biddingTab, setBiddingTab] = useState<'claim' | 'bid'>('claim')
  const [bidDollars, setBidDollars] = useState<number>(taskPriceCents / 100)
  const [bidEta, setBidEta] = useState<number>(30)
  const [bidPitch, setBidPitch] = useState<string>('')
  const [bidSuccess, setBidSuccess] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (stage !== 'claimed' || !claimedAt) return
    const tick = () => setRemaining(Math.max(0, Date.parse(claimedAt) + CLAIM_TIMEOUT_MS - Date.now()))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [stage, claimedAt])

  async function claim() {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/tasks/${taskId}/claim`, { method: 'POST' })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) setError(data.error)
    router.refresh()
  }

  async function submitBid(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setBidSuccess(null)
    const res = await fetch(`/api/tasks/${taskId}/bids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bid_cents: Math.round(bidDollars * 100),
        eta_minutes: Number(bidEta),
        pitch: bidPitch,
      }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(data.error || 'Failed to submit bid')
      return
    }
    setBidSuccess(`Offer of $${Number(bidDollars).toFixed(2)} submitted! The agent is reviewing offers.`)
    if (data.bid) {
      setBids((prev) => [data.bid, ...prev])
    }
    router.refresh()
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
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
      <div className="space-y-6">
        {/* Toggle Mode */}
        <div className="flex rounded-full bg-[#1b1b1a] p-1 border border-[#302e2b]">
          <button
            type="button"
            onClick={() => setBiddingTab('claim')}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${
              biddingTab === 'claim' ? 'bg-[#f4a261] text-[#171412]' : 'text-[#8f8b84] hover:text-[#f8f5ef]'
            }`}
          >
            Instant Claim ({usd(taskPriceCents)})
          </button>
          <button
            type="button"
            onClick={() => setBiddingTab('bid')}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${
              biddingTab === 'bid' ? 'bg-[#f4a261] text-[#171412]' : 'text-[#8f8b84] hover:text-[#f8f5ef]'
            }`}
          >
            Make an Offer / Bid {bids.length > 0 ? `(${bids.length})` : ''}
          </button>
        </div>

        {biddingTab === 'claim' ? (
          <div>
            <button
              onClick={claim}
              disabled={busy}
              className="w-full rounded-full bg-[#f4a261] px-6 py-3.5 font-semibold text-[#171412] disabled:opacity-50 transition-opacity hover:opacity-90"
            >
              {busy ? 'Claiming…' : `Claim for ${usd(taskPriceCents)}`}
            </button>
            <p className="mt-2 text-center text-xs text-[#77736c]">
              You&apos;ll have 30 minutes to complete the task and upload proof before it reopens.
            </p>
          </div>
        ) : (
          <form onSubmit={submitBid} className="rounded-2xl border border-[#302e2b] bg-[#161615] p-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-[#f8f5ef]">Propose your terms</p>
              <p className="text-xs text-[#8f8b84]">Agents accept bids with faster turnaround or proven proximity.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-[#8f8b84]">
                Your price (USD)
                <input
                  type="number"
                  step="0.25"
                  min="0.5"
                  max="50"
                  required
                  value={bidDollars}
                  onChange={(e) => setBidDollars(parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-[#302e2b] bg-[#1b1b1a] px-3 py-2 font-mono text-sm text-[#f8f5ef] outline-none focus:border-[#f4a261]"
                />
              </label>

              <label className="text-xs text-[#8f8b84]">
                ETA (minutes)
                <select
                  value={bidEta}
                  onChange={(e) => setBidEta(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-[#302e2b] bg-[#1b1b1a] px-3 py-2 text-sm text-[#f8f5ef] outline-none focus:border-[#f4a261]"
                >
                  <option value={15}>15 minutes (Fast)</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>
              </label>
            </div>

            <label className="block text-xs text-[#8f8b84]">
              Pitch / Why you? (optional)
              <textarea
                rows={2}
                maxLength={300}
                placeholder="e.g. In the store parking lot now; have high-res macro camera."
                value={bidPitch}
                onChange={(e) => setBidPitch(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#302e2b] bg-[#1b1b1a] px-3 py-2 text-sm text-[#f8f5ef] outline-none focus:border-[#f4a261]"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[#f4a261] px-5 py-2.5 text-sm font-semibold text-[#171412] disabled:opacity-50"
            >
              {busy ? 'Submitting offer…' : `Submit Offer ($${Number(bidDollars).toFixed(2)})`}
            </button>

            {bidSuccess && (
              <p className="rounded-lg bg-[#1d2b22] p-3 text-xs text-[#8bd3a8]">{bidSuccess}</p>
            )}
          </form>
        )}

        {/* Existing Bids Feed */}
        {bids.length > 0 && (
          <div className="rounded-2xl border border-[#262422] bg-[#141413] p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#77736c]">
              Submitted Bids ({bids.length})
            </h4>
            <div className="mt-3 divide-y divide-[#22211f]">
              {bids.map((b) => (
                <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-medium text-[#f8f5ef]">{usd(b.bid_cents)}</span>
                    <span className="ml-2 text-[#77736c]">ETA: {b.eta_minutes}m</span>
                    {b.pitch && <p className="mt-0.5 text-[11px] text-[#aaa69e]">{b.pitch}</p>}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ${
                      b.status === 'accepted'
                        ? 'bg-[#1d2b22] text-[#8bd3a8]'
                        : b.status === 'rejected'
                        ? 'bg-[#331d1d] text-[#f08f8f]'
                        : 'bg-[#262422] text-[#e6d37a]'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
