import type { TaskType } from './types'
import { createTask, upsertEscrow } from './db'

export interface ExternalGigSubtask {
  title: string
  task_type: TaskType
  suggested_price_dollars: number
  proof_requirements: 'photo' | 'text' | 'code'
  deadline_minutes: number
  instructions: string
}

export interface ExternalGig {
  id: string
  source: 'upwork' | 'freelancer' | 'direct_client'
  source_url?: string
  title: string
  client_name: string
  client_budget_usd: number
  category: 'in_store_verification' | 'photo_audit' | 'mystery_shopper' | 'phone_inquiry' | 'anti_bot_access'
  posted_time: string
  description: string
  skills_required: string[]
  subtasks: ExternalGigSubtask[]
}

/**
 * Curated marketplace of real-world freelance & client contracts
 * suitable for autonomous agent subcontracting into Rukyr micro-tasks.
 */
export const SUBCONTRACT_CATALOG: ExternalGig[] = [
  {
    id: 'upwork-retail-audit-101',
    source: 'upwork',
    source_url: 'https://www.upwork.com/freelance-jobs/applied-research-retail-audit/',
    title: 'Dallas Downtown Boutique: In-Store Inventory & Condition Verification',
    client_name: 'Apex Luxury Apparel LLC',
    client_budget_usd: 120.0,
    category: 'in_store_verification',
    posted_time: '12 minutes ago',
    description:
      'We need independent physical verification of 3 designer jacket models in stock at a Dallas retail partner. Verify tags, serial numbers, daylight color fidelity, and rack quantity before our procurement bot signs the wholesale contract.',
    skills_required: ['Local Presence', 'High-Res Photo Proof', 'Retail Audit'],
    subtasks: [
      {
        title: 'Photograph Dallas boutique exterior and current store hours sign',
        task_type: 'local_presence',
        suggested_price_dollars: 4.5,
        proof_requirements: 'photo',
        deadline_minutes: 180,
        instructions:
          'Take a clear, geotagged photo of the front store sign and operating hours poster at 1420 Main St, Dallas.',
      },
      {
        title: 'Verify vintage leather jacket rack tag & batch serial #',
        task_type: 'verification',
        suggested_price_dollars: 6.0,
        proof_requirements: 'photo',
        deadline_minutes: 180,
        instructions:
          'Locate the vintage brown leather jackets in rack 3B. Take an in-focus photo showing the inner neck label and paper barcode tag.',
      },
      {
        title: 'Inspect zipper stitching and daylight color fidelity',
        task_type: 'taste_call',
        suggested_price_dollars: 5.5,
        proof_requirements: 'photo',
        deadline_minutes: 180,
        instructions:
          'Hold the jacket near natural daylight or the window. Submit a photo showing true color and zipper pull.',
      },
    ],
  },
  {
    id: 'upwork-electronics-check-102',
    source: 'upwork',
    source_url: 'https://www.upwork.com/freelance-jobs/open-box-gpu-inspection/',
    title: 'Micro Center Open-Box GPU Seal & Barcode Inspection',
    client_name: 'ComputeHive Procurement Bot',
    client_budget_usd: 85.0,
    category: 'photo_audit',
    posted_time: '25 minutes ago',
    description:
      'Client wants to buy a discounted open-box RTX 4080 Super listed on Micro Center website. Need a human on the floor to photograph the clearance sticker, factory anti-static seal, and ensure all display ports are undamaged.',
    skills_required: ['Hardware Inspection', 'Micro Center', 'Rapid Turnaround'],
    subtasks: [
      {
        title: 'Inspect open-box GPU sticker & serial barcode at Micro Center',
        task_type: 'verification',
        suggested_price_dollars: 7.0,
        proof_requirements: 'photo',
        deadline_minutes: 120,
        instructions:
          'Find the clearance shelf in GPU department. Photograph the serial number sticker and manufacturer anti-static tape.',
      },
      {
        title: 'Confirm PCIe slot bracket is straight and ports unbent',
        task_type: 'verification',
        suggested_price_dollars: 5.0,
        proof_requirements: 'photo',
        deadline_minutes: 120,
        instructions:
          'Take a close-up photo of the back metal bracket and HDMI/DisplayPort pins to ensure zero physical bending.',
      },
    ],
  },
  {
    id: 'upwork-phone-distributor-103',
    source: 'upwork',
    source_url: 'https://www.upwork.com/freelance-jobs/distributor-phone-check/',
    title: 'Wholesale Plumbing Supply: Phone Call for Restock Date',
    client_name: 'FlowTech Systems AI',
    client_budget_usd: 45.0,
    category: 'phone_inquiry',
    posted_time: '41 minutes ago',
    description:
      'Distributor IVR blocks automated VoIP agent dialers. Need a human to place a quick 2-minute phone call to the warehouse desk and ask whether Model #FT-8890 will restock by Friday.',
    skills_required: ['English Phone Call', 'Fast Note Taking'],
    subtasks: [
      {
        title: 'Call warehouse desk for Part #FT-8890 restock confirmation',
        task_type: 'phone_call',
        suggested_price_dollars: 4.0,
        proof_requirements: 'text',
        deadline_minutes: 90,
        instructions:
          'Call (512) 555-0199, press 2 for parts. Ask if FT-8890 is arriving on Friday shipment. Record representative name and direct answer.',
      },
    ],
  },
  {
    id: 'upwork-captcha-botgate-104',
    source: 'upwork',
    source_url: 'https://www.upwork.com/freelance-jobs/sneaker-drop-queue-guard/',
    title: 'Physical In-Store Ticket Queue Pickup & Verification',
    client_name: 'Autonomous Kicks Agent',
    client_budget_usd: 95.0,
    category: 'anti_bot_access',
    posted_time: '1 hour ago',
    description:
      'Store requires physical in-person wristband pickup at 9:00 AM before online reservation can be converted to checkout. Agent needs human earner to pick up wristband and photograph the stamped access code.',
    skills_required: ['Morning Queue', 'Store Ticket Pickup'],
    subtasks: [
      {
        title: 'Collect morning wristband and photograph stamped code',
        task_type: 'bot_gate',
        suggested_price_dollars: 8.5,
        proof_requirements: 'photo',
        deadline_minutes: 60,
        instructions:
          'Walk up to front doors, ask greeter for the drop wristband. Take a clear photo of the 6-character alpha-numeric code stamped on the band.',
      },
    ],
  },
]

/**
 * Discover external jobs available for agents to subcontract.
 */
export async function discoverExternalGigs(query?: string): Promise<ExternalGig[]> {
  if (!query) return SUBCONTRACT_CATALOG

  const q = query.toLowerCase()
  return SUBCONTRACT_CATALOG.filter(
    (g) =>
      g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.skills_required.some((s) => s.toLowerCase().includes(q)),
  )
}

export interface SubcontractResult {
  gig: ExternalGig
  client_budget: number
  total_subcontract_payout: number
  agent_margin: number
  agent_margin_pct: number
  created_tasks: Array<{
    id: string
    title: string
    price_dollars: number
    task_type: TaskType
  }>
}

/**
 * Subcontract an external gig into live Rukyr micro-tasks with reverse auction / bidding open.
 */
export async function subcontractGigToRukyr(
  gigId: string,
  agentProfileId: string,
): Promise<SubcontractResult> {
  const gig = SUBCONTRACT_CATALOG.find((g) => g.id === gigId)
  if (!gig) throw new Error(`External gig '${gigId}' not found in subcontract catalog.`)

  let totalPayoutCents = 0
  const created = []

  for (const sub of gig.subtasks) {
    const priceCents = Math.round(sub.suggested_price_dollars * 100)
    totalPayoutCents += priceCents

    const deadlineAt = new Date(Date.now() + sub.deadline_minutes * 60 * 1000).toISOString()
    const task = await createTask({
      agent_id: agentProfileId,
      title: `[Subcontract: ${gig.client_name}] ${sub.title}`,
      description: `${sub.instructions}\n\nClient Contract: ${gig.title}\nSource: ${gig.source.toUpperCase()}\nBids & counter-offers welcome.`,
      task_type: sub.task_type,
      price_cents: priceCents,
      proof_requirements: sub.proof_requirements,
      deadline_at: deadlineAt,
      status: 'open',
    })

    // Create escrow hold in pending/held state
    await upsertEscrow({
      task_id: task.id,
      amount_cents: priceCents,
      platform_fee_cents: Math.round(priceCents * 0.15),
      status: 'held',
    })

    created.push({
      id: task.id,
      title: task.title,
      price_dollars: sub.suggested_price_dollars,
      task_type: sub.task_type,
    })
  }

  const clientBudgetCents = Math.round(gig.client_budget_usd * 100)
  const agentMarginCents = clientBudgetCents - totalPayoutCents

  return {
    gig,
    client_budget: gig.client_budget_usd,
    total_subcontract_payout: totalPayoutCents / 100,
    agent_margin: agentMarginCents / 100,
    agent_margin_pct: Math.round((agentMarginCents / clientBudgetCents) * 100),
    created_tasks: created,
  }
}
