import { NextRequest, NextResponse } from 'next/server'
import { getTask, updateTask } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('task')
  const task = taskId ? await getTask(taskId) : null
  if (task?.status === 'pending_funding') await updateTask(task.id, { status: 'cancelled' })
  return NextResponse.redirect(new URL('/agent?error=funding_cancelled', req.url))
}
