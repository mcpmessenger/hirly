import { generateObject } from 'ai'
import { z } from 'zod'
import type { Proof, Task } from './types'

const schema = z.object({
  verdict: z.enum(['pass', 'fail', 'unsure']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
})

export const aiLive = Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN)
export const AI_MODEL = process.env.AI_MODEL ?? 'openai/gpt-4o-mini'

export type Verdict = Pick<Proof, 'ai_verdict' | 'ai_confidence' | 'ai_reasoning'>

/**
 * AI proof verification. A vision model checks the submitted proof against the
 * task. Output is advisory: the operator still approves (unless auto-release is on).
 * Falls back to a deterministic heuristic when no AI key is configured.
 */
export async function verifyProof(
  task: Task,
  proof: { proof_text: string; proof_image_url: string | null },
): Promise<Verdict> {
  const needsImage = task.proof_requirements.includes('photo')
  if (needsImage && !proof.proof_image_url) {
    return { ai_verdict: 'fail', ai_confidence: 0.95, ai_reasoning: 'A photo was required but none was submitted.' }
  }
  if (!aiLive) return heuristic(task, proof, needsImage)

  try {
    const content: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = [
      {
        type: 'text',
        text:
          `You verify proof for a task an AI agent posted for a human.\n` +
          `TASK: ${task.title}\nDETAILS: ${task.description}\nPROOF REQUIRED: ${task.proof_requirements}\n` +
          `HUMAN NOTES: ${proof.proof_text || '(none)'}\n` +
          `Decide whether the proof plausibly satisfies the task. Reject stock photos, screenshots of the listing, ` +
          `or irrelevant images. Use "unsure" when a human should look.`,
      },
    ]
    if (proof.proof_image_url) content.push({ type: 'image', image: proof.proof_image_url })
    const { object } = await generateObject({
      model: AI_MODEL,
      schema,
      messages: [{ role: 'user', content }],
    })
    return { ai_verdict: object.verdict, ai_confidence: object.confidence, ai_reasoning: object.reasoning }
  } catch (e) {
    console.error('[ai] verification failed', e)
    return { ai_verdict: 'unsure', ai_confidence: 0, ai_reasoning: 'AI verification unavailable; please review manually.' }
  }
}

function heuristic(task: Task, proof: { proof_text: string; proof_image_url: string | null }, needsImage: boolean): Verdict {
  const note = '(mock verifier: set AI_GATEWAY_API_KEY for real vision checks) '
  if (needsImage) {
    return { ai_verdict: 'unsure', ai_confidence: 0.6, ai_reasoning: note + 'Photo received; a person should confirm it matches the task.' }
  }
  if (proof.proof_text.trim().length >= 20) {
    return { ai_verdict: 'pass', ai_confidence: 0.7, ai_reasoning: note + 'Text proof is present and detailed.' }
  }
  return { ai_verdict: 'fail', ai_confidence: 0.8, ai_reasoning: note + 'Text proof is too short to be credible.' }
}
