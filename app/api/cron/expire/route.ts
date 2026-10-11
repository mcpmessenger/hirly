import { NextRequest, NextResponse } from 'next/server'
import { sweepTasks } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** Returns stale claims to the queue and expires overdue tasks (voiding holds). Vercel Cron hits this. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return NextResponse.json(await sweepTasks())
}
