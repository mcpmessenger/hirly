import { NextResponse } from 'next/server'
import {
  getOperatorMandate,
  updateOperatorMandate,
  revokeOperatorMandate,
} from '@/lib/db'
import { createVaultSetupSession } from '@/lib/paypal'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const mandate = await getOperatorMandate()
    return NextResponse.json({ success: true, mandate })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to get mandate' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { action, weekly_cap_dollars, per_task_cap_dollars } = body

    if (action === 'revoke') {
      const revoked = await revokeOperatorMandate()
      return NextResponse.json({
        success: true,
        mandate: revoked,
        message: 'Operator mandate revoked. Autonomous agent spending is now frozen.',
      })
    }

    if (action === 'authorize') {
      const origin = new URL(req.url).origin
      const session = await createVaultSetupSession({
        returnUrl: `${origin}/agent?vault=authorized`,
        cancelUrl: `${origin}/agent?vault=cancelled`,
      })

      const updated = await updateOperatorMandate({
        vault_id: session.setupToken,
        vault_status: 'active',
        last_authorized_at: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        mandate: updated,
        approveUrl: session.approveUrl,
        message: 'Operator mandate authorized via PayPal Vault. Headless escrow holds active.',
      })
    }

    // Update spending caps
    const patch: any = {}
    if (typeof weekly_cap_dollars === 'number') {
      patch.weekly_cap_cents = Math.round(weekly_cap_dollars * 100)
    }
    if (typeof per_task_cap_dollars === 'number') {
      patch.per_task_cap_cents = Math.round(per_task_cap_dollars * 100)
    }

    const updated = await updateOperatorMandate(patch)
    return NextResponse.json({ success: true, mandate: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update mandate' }, { status: 500 })
  }
}
