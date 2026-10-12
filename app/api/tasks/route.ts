import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createTask, getDemoProfile, listTasks, updateTask, upsertEscrow } from '@/lib/db'
import { authorizeOrder, createHold, feeFor } from '@/lib/paypal'
import { notify } from '@/lib/email'

export const dynamic = 'force-dynamic'

const body = z.object({
  title: z.string().min(3).max(140),
  description: z.string().max(1000).default(''),
  task_type: z.enum(['verification', 'bot_gate', 'phone_call', 'taste_call', 'local_presence', 'spend_approval']),
  price_cents: z.number().int().min(50).max(1000),
  proof_requirements: z.enum(['photo', 'text', 'code']).default('photo'),
  deadline_minutes: z.number().int().min(10).max(60 * 24 * 7).default(240),
})

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') ?? undefined
  return NextResponse.json({ tasks: await listTasks({ status }) })
}

export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid task', issues: parsed.error.issues }, { status: 400 })
  }
  const input = parsed.data
  const agent = await getDemoProfile('agent')
  const fee = feeFor(input.price_cents)
  const total = input.price_cents + fee

  const task = await createTask({
    agent_id: agent.id,
    title: input.title,
    description: input.description,
    task_type: input.task_type,
    price_cents: input.price_cents,
    proof_requirements: input.proof_requirements,
    deadline_at: new Date(Date.now() + input.deadline_minutes * 60_000).toISOString(),
    status: 'pending_funding',
  })

  try {
    const origin = req.nextUrl.origin
    const hold = await createHold({
      taskId: task.id,
      totalCents: total,
      returnUrl: `${origin}/api/paypal/return?task=${task.id}`,
      cancelUrl: `${origin}/api/paypal/cancel?task=${task.id}`,
      description: `Rukyr task: ${task.title}`,
    })
    await upsertEscrow({
      task_id: task.id,
      amount_cents: total,
      platform_fee_cents: fee,
      paypal_order_id: hold.orderId,
      status: 'pending',
    })

    if (hold.approveUrl) {
      return NextResponse.json({ task, approveUrl: hold.approveUrl }, { status: 201 })
    }
    // Mock mode: no operator approval needed, hold immediately.
    const authId = await authorizeOrder(hold.orderId)
    await upsertEscrow({ task_id: task.id, amount_cents: total, paypal_authorization_id: authId, status: 'held' })
    const open = await updateTask(task.id, { status: 'open' })
    await notify(agent.paypal_email, 'Task posted', `"${task.title}" is live. ${total / 100} USD held in escrow.`)
    return NextResponse.json({ task: open, approveUrl: null }, { status: 201 })
  } catch (e) {
    await updateTask(task.id, { status: 'cancelled' })
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}

