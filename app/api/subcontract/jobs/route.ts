import { NextResponse } from 'next/server'
import { discoverExternalGigs } from '@/lib/subcontract'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || undefined
    const gigs = await discoverExternalGigs(q)
    return NextResponse.json({ gigs, count: gigs.length })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch gigs' }, { status: 500 })
  }
}
