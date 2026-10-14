import { NextResponse } from 'next/server'
import { getDemoProfile } from '@/lib/db'
import { subcontractGigToRukyr } from '@/lib/subcontract'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const agent = await getDemoProfile('agent')
    const result = await subcontractGigToRukyr(id, agent.id)
    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to subcontract gig' }, { status: 400 })
  }
}
