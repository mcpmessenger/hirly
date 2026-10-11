import { NextRequest, NextResponse } from 'next/server'
import { claimTask, getDemoProfile, getTask } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!(await getTask(id))) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  const human = await getDemoProfile('human')
  const task = await claimTask(id, human.id)
  if (!task) return NextResponse.json({ error: 'Task is no longer available' }, { status: 409 })
  return NextResponse.json({ task })
}
