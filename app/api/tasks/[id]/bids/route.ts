import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { addBid, getDemoProfile, getTask, listBidsForTask } from '@/lib/db'
import { notify } from '@/lib/email'

export const dynamic = 'force-dynamic'

const postBidSchema = z.object({
  bid_cents: z.number().int().min(50).max(5000), // $0.50 to $50.00
  eta_minutes: z.number().int().min(5).max(1440).default(30),
  pitch: z.string().max(300).default(''),
})

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  const bids = await listBidsForTask(id)
  return NextResponse.json({ bids })
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  const task = await getTask(id)
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  if (task.status !== 'open') {
    return NextResponse.json({ error: 'Task is not open for bidding' }, { status: 409 })
  }

  const parsed = postBidSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid bid data', issues: parsed.error.issues }, { status: 400 })
  }

  const human = await getDemoProfile('human')
  const bid = await addBid({
    task_id: id,
    bidder_id: human.id,
    bid_cents: parsed.data.bid_cents,
    eta_minutes: parsed.data.eta_minutes,
    pitch: parsed.data.pitch,
  })

  return NextResponse.json({ bid }, { status: 201 })
}
