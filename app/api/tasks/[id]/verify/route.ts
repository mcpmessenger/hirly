import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTask } from '@/lib/db'
import { approveTask, cancelTask, rejectTask } from '@/lib/service'

export const dynamic = 'force-dynamic'

const body = z.object({ action: z.enum(['approve', 'reject', 'cancel']) })

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'action must be approve | reject | cancel' }, { status: 400 })
  const task = await getTask(id)
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  try {
    const fn = { approve: approveTask, reject: rejectTask, cancel: cancelTask }[parsed.data.action]
    return NextResponse.json(await fn(task))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 })
  }
}
