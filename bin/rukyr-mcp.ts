#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { RukyrClient } from '../lib/sdk.js'
import { queryUcpCatalog, createUcpCheckoutHandoff } from '../lib/ucp.js'
import type { TaskType } from '../lib/types.js'

const BASE_URL = process.env.RUKYR_BASE_URL || 'https://rukyr.vercel.app'
const client = new RukyrClient({ baseUrl: BASE_URL })

const server = new Server(
  {
    name: 'rukyr-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'rukyr_post_task',
        description:
          'Post a real-world micro-task for a human earner to complete (e.g. verify product details, photograph item in daylight, call a store, bypass physical bot gate). Places funds in PayPal escrow.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Clear, concise title describing the task for the human earner.',
            },
            description: {
              type: 'string',
              description: 'Detailed instructions, context, and exact requirements.',
            },
            task_type: {
              type: 'string',
              enum: [
                'verification',
                'bot_gate',
                'phone_call',
                'taste_call',
                'local_presence',
                'spend_approval',
              ],
              description: 'Type of task being requested.',
            },
            price_dollars: {
              type: 'number',
              description: 'Price offered to the human in USD (between $0.50 and $10.00).',
            },
            proof_requirements: {
              type: 'string',
              enum: ['photo', 'text', 'code'],
              description: 'Type of evidence the human must upload.',
            },
            deadline_minutes: {
              type: 'number',
              description: 'Minutes before the task expires (default: 240).',
            },
          },
          required: ['title', 'price_dollars'],
        },
      },
      {
        name: 'rukyr_get_task',
        description:
          'Check status, claimant details, escrow status, and submitted proof for a specific task.',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'The unique ID of the Rukyr task.',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'rukyr_wait_for_proof',
        description:
          'Wait and poll until an earner submits proof for a posted task, or until timeout occurs.',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'The unique ID of the Rukyr task to wait for.',
            },
            timeout_seconds: {
              type: 'number',
              description: 'Maximum seconds to wait (default 600).',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'rukyr_verify_and_settle',
        description:
          'Finalize a task: approve the human proof to capture PayPal escrow and release payment, reject low-quality proof, or cancel the task to void the hold.',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'The unique ID of the Rukyr task.',
            },
            action: {
              type: 'string',
              enum: ['approve', 'reject', 'cancel'],
              description:
                'approve = release funds to earner; reject = return task to queue; cancel = release PayPal hold.',
            },
          },
          required: ['task_id', 'action'],
        },
      },
      {
        name: 'ucp_discover_products',
        description:
          'Discover products from merchants supporting Google/Shopify Universal Commerce Protocol (UCP). Returns product metadata, merchant endpoint, and whether physical ground-truth verification is advised before checkout.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Product search term (e.g. vintage band tee).',
            },
          },
        },
      },
      {
        name: 'ucp_create_checkout_handoff',
        description:
          'Generate a UCP checkout handoff URL once the agent verifies physical proof. Conforms to the Shopify agent checkout specification.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'The UCP / merchant product ID.',
            },
          },
          required: ['product_id'],
        },
      },
    ],
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    if (name === 'rukyr_post_task') {
      const priceCents = Math.round(Number(args?.price_dollars) * 100)
      const res = await client.createTask({
        title: String(args?.title),
        description: String(args?.description || ''),
        taskType: (args?.task_type as TaskType) || 'verification',
        priceCents,
        proofRequirements: (args?.proof_requirements as 'photo' | 'text' | 'code') || 'photo',
        deadlineMinutes: args?.deadline_minutes ? Number(args.deadline_minutes) : 240,
      })

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                task_id: res.task.id,
                status: res.task.status,
                price: `$${(res.task.price_cents / 100).toFixed(2)}`,
                proof_required: res.task.proof_requirements,
                paypal_approval_url: res.approveUrl,
                message:
                  res.approveUrl
                    ? 'Task pending operator approval at PayPal URL'
                    : 'Task posted and funded in PayPal escrow.',
              },
              null,
              2
            ),
          },
        ],
      }
    }

    if (name === 'rukyr_get_task') {
      const task = await client.getTask(String(args?.task_id))
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(task, null, 2),
          },
        ],
      }
    }

    if (name === 'rukyr_wait_for_proof') {
      const timeoutMs = (Number(args?.timeout_seconds) || 600) * 1000
      const task = await client.waitForProof(String(args?.task_id), { timeoutMs })
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                task_id: task.id,
                status: task.status,
                message: 'Proof submitted by earner and ready for review.',
              },
              null,
              2
            ),
          },
        ],
      }
    }

    if (name === 'rukyr_verify_and_settle') {
      const taskId = String(args?.task_id)
      const action = String(args?.action)

      if (action === 'approve') {
        const result = await client.approveTask(taskId)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  status: result.task.status,
                  payout: result.payout,
                  message: 'Proof approved. PayPal escrow captured and earner paid.',
                },
                null,
                2
              ),
            },
          ],
        }
      }

      if (action === 'reject') {
        const result = await client.rejectTask(taskId)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  status: result.task.status,
                  message: 'Proof rejected. Task returned to queue with hold intact.',
                },
                null,
                2
              ),
            },
          ],
        }
      }

      if (action === 'cancel') {
        const result = await client.cancelTask(taskId)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  status: result.task.status,
                  message: 'Task cancelled. PayPal authorization hold voided.',
                },
                null,
                2
              ),
            },
          ],
        }
      }
    }

    if (name === 'ucp_discover_products') {
      const items = await queryUcpCatalog()
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(items, null, 2),
          },
        ],
      }
    }

    if (name === 'ucp_create_checkout_handoff') {
      const handoff = createUcpCheckoutHandoff(String(args?.product_id))
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                handoff,
                message: 'UCP checkout session generated. Direct the buyer/agent to checkoutUrl.',
              },
              null,
              2
            ),
          },
        ],
      }
    }

    throw new Error(`Unknown tool name: ${name}`)
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${err?.message || String(err)}`,
        },
      ],
    }
  }
})

async function run() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Rukyr MCP Server running on stdio')
}

run().catch((err) => {
  console.error('Fatal MCP error:', err)
  process.exit(1)
})
