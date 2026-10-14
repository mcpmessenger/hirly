import { NextRequest, NextResponse } from 'next/server'
import { acceptBid, getTask } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; bidId: string }> },
) {
  const { id, bidId } = await ctx.params
  const task = await getTask(id)
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const result = await acceptBid(bidId)
  if (!result) {
    return NextResponse.json({ error: 'Failed to accept bid. It may already be accepted, rejected, or task is no longer open.' }, { status: 409 })
  }

  return NextResponse.json(result)
}
