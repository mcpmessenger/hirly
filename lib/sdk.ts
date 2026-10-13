import type { Task, Proof, TaskType } from './types'

export interface RukyrClientOptions {
  baseUrl?: string
  agentId?: string
}

export interface CreateTaskParams {
  title: string
  description?: string
  taskType?: TaskType
  priceCents: number
  proofRequirements?: 'photo' | 'text' | 'code'
  deadlineMinutes?: number
}

export interface WaitOptions {
  timeoutMs?: number
  pollIntervalMs?: number
}

export class RukyrClient {
  private baseUrl: string
  private agentId?: string

  constructor(options: RukyrClientOptions = {}) {
    this.baseUrl = (options.baseUrl || 'https://rukyr.vercel.app').replace(/\/$/, '')
    this.agentId = options.agentId
  }

  /**
   * Post a task to Rukyr and initiate PayPal escrow hold.
   */
  async createTask(params: CreateTaskParams): Promise<{ task: Task; approveUrl: string | null }> {
    const res = await fetch(`${this.baseUrl}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.agentId ? { 'x-agent-id': this.agentId } : {}),
      },
      body: JSON.stringify({
        title: params.title,
        description: params.description ?? '',
        task_type: params.taskType ?? 'verification',
        price_cents: params.priceCents,
        proof_requirements: params.proofRequirements ?? 'photo',
        deadline_minutes: params.deadlineMinutes ?? 240,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Failed to create task: ${res.statusText}`)
    }

    return res.json()
  }

  /**
   * Retrieve task details and current lifecycle state.
   */
  async getTask(taskId: string): Promise<Task> {
    const res = await fetch(`${this.baseUrl}/api/tasks?status=`)
    if (!res.ok) throw new Error(`Failed to list tasks: ${res.statusText}`)
    const data = await res.json()
    const found = (data.tasks as Task[]).find((t) => t.id === taskId)
    if (!found) throw new Error(`Task ${taskId} not found`)
    return found
  }

  /**
   * Approve a submitted proof, capture escrowed funds, and release payment to the earner.
   */
  async approveTask(taskId: string): Promise<{ task: Task; payout: string }> {
    const res = await fetch(`${this.baseUrl}/api/tasks/${taskId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Failed to approve task: ${res.statusText}`)
    }

    return res.json()
  }

  /**
   * Reject submitted proof and return the task to the earner queue.
   */
  async rejectTask(taskId: string): Promise<{ task: Task }> {
    const res = await fetch(`${this.baseUrl}/api/tasks/${taskId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Failed to reject task: ${res.statusText}`)
    }

    return res.json()
  }

  /**
   * Cancel task and void the PayPal authorization hold.
   */
  async cancelTask(taskId: string): Promise<{ task: Task }> {
    const res = await fetch(`${this.baseUrl}/api/tasks/${taskId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Failed to cancel task: ${res.statusText}`)
    }

    return res.json()
  }

  /**
   * Poll until a human has submitted proof for the task.
   */
  async waitForProof(taskId: string, options: WaitOptions = {}): Promise<Task> {
    const timeout = options.timeoutMs ?? 10 * 60 * 1000 // 10 minutes default
    const interval = options.pollIntervalMs ?? 3000
    const start = Date.now()

    while (Date.now() - start < timeout) {
      const task = await this.getTask(taskId)
      if (['submitted', 'verified', 'paid'].includes(task.status)) {
        return task
      }
      if (['cancelled', 'expired'].includes(task.status)) {
        throw new Error(`Task ended prematurely with status: ${task.status}`)
      }
      await new Promise((r) => setTimeout(r, interval))
    }

    throw new Error(`Timed out waiting for task proof (${taskId})`)
  }
}
