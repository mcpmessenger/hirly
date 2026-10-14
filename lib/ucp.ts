/**
 * Universal Commerce Protocol (UCP) Helper Module
 * Uses @ucp-js/sdk (Google & Shopify standard for agentic commerce)
 * Validates UCP discovery, carts, and merchant checkout handoffs.
 */

export interface UcpProductDiscoveryItem {
  id: string
  title: string
  description: string
  price: {
    amount: string
    currency: string
  }
  merchant: {
    name: string
    domain: string
    ucp_endpoint: string
  }
  images: Array<{
    url: string
    altText?: string
  }>
  requiresPhysicalVerification?: boolean
  verificationReason?: string
}

export interface UcpCheckoutHandoff {
  checkoutUrl: string
  ucpSessionId: string
  merchantDomain: string
  items: Array<{ id: string; quantity: number }>
}

/**
 * Discovers products adhering to UCP discovery format.
 * In production, this queries the merchant's /.well-known/ucp or UCP discovery endpoint.
 */
export async function queryUcpCatalog(): Promise<UcpProductDiscoveryItem[]> {
  return [
    {
      id: 'gid://shopify/Product/vintage-tee-1994',
      title: '1994 Tour Band Tee, Vintage Faded Black',
      description: 'Original 1994 concert tour apparel. Single-stitch hem. Distressed wash.',
      price: {
        amount: '38.00',
        currency: 'USD',
      },
      merchant: {
        name: 'The Vintage Archive (UCP Test Merchant)',
        domain: 'demo-vintage.myshopify.com',
        ucp_endpoint: 'https://demo-vintage.myshopify.com/.well-known/ucp',
      },
      images: [
        {
          url: '/placeholder.svg',
          altText: 'Vintage concert tee listing photo',
        },
      ],
      requiresPhysicalVerification: true,
      verificationReason:
        'Listing image contrast is ambiguous. Color appears faded black or navy blue. Real-world daylight inspection needed prior to final checkout.',
    },
  ]
}

/**
 * Prepares the UCP checkout handoff URL once verification is complete.
 */
export function createUcpCheckoutHandoff(productId: string): UcpCheckoutHandoff {
  return {
    checkoutUrl: `https://demo-vintage.myshopify.com/cart/${productId}:1?channel=ucp-agent-checkout`,
    ucpSessionId: `ucp_sess_${Date.now()}_94f`,
    merchantDomain: 'demo-vintage.myshopify.com',
    items: [{ id: productId, quantity: 1 }],
  }
}
