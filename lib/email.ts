import { Resend } from 'resend'

const key = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM ?? 'Rukyr <onboarding@resend.dev>'

/** Fire-and-forget notification. Logs to console when Resend isn't configured. */
export async function notify(to: string | null | undefined, subject: string, body: string) {
  if (!to) return
  if (!key) {
    console.log(`[email:mock] to=${to} subject="${subject}"\n${body}`)
    return
  }
  try {
    await new Resend(key).emails.send({ from: FROM, to, subject, text: body })
  } catch (e) {
    console.error('[email] failed', e)
  }
}

