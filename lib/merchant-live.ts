import type { TaskType } from './types'

export interface LiveProductImage {
  url: string
  altText?: string
}

export interface LiveProduct {
  id: string
  url: string
  title: string
  description?: string
  merchant: {
    name: string
    domain: string
    platform?: 'shopify' | 'schema_ld' | 'open_graph' | 'custom'
  }
  price: {
    amount: number
    currency: string
  }
  available: boolean
  images: LiveProductImage[]
  rawMetadata?: Record<string, any>
}

export interface VerificationAnalysis {
  requiresVerification: boolean
  riskLevel: 'high' | 'medium' | 'low'
  reasons: string[]
  suggestedTask?: {
    title: string
    description: string
    taskType: TaskType
    suggestedPriceCents: number
    proofRequirements: 'photo' | 'text' | 'code'
    deadlineMinutes: number
  }
}

/**
 * Universal HTML & Schema.org JSON-LD parser to extract live product metadata from any e-commerce link.
 */
export async function fetchLiveProduct(targetUrl: string): Promise<LiveProduct> {
  const parsedUrl = new URL(targetUrl)
  const domain = parsedUrl.hostname

  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 RukyrAgent/1.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch merchant URL (${res.status} ${res.statusText})`)
  }

  const html = await res.text()

  // 1. Try to extract Schema.org JSON-LD
  const jsonLdMatches = html.match(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)
  if (jsonLdMatches) {
    for (const match of jsonLdMatches) {
      try {
        const rawJson = match.replace(/<\/?script[^>]*>/gi, '').trim()
        const parsed = JSON.parse(rawJson)

        // Handle either root Product or nested inside @graph array
        const candidates = Array.isArray(parsed)
          ? parsed
          : parsed['@graph'] && Array.isArray(parsed['@graph'])
          ? parsed['@graph']
          : [parsed]

        const productObj = candidates.find(
          (c) => c['@type'] === 'Product' || (Array.isArray(c['@type']) && c['@type'].includes('Product')),
        )

        if (productObj) {
          const offers = Array.isArray(productObj.offers)
            ? productObj.offers[0]
            : productObj.offers || {}

          const rawPrice = offers.price ?? offers.lowPrice ?? offers.highPrice ?? 0
          const currency = offers.priceCurrency || 'USD'
          const availability = offers.availability || ''
          const inStock =
            typeof availability === 'string'
              ? !availability.toLowerCase().includes('outofstock')
              : true

          const imgUrls: string[] = []
          if (Array.isArray(productObj.image)) {
            productObj.image.forEach((img: any) => {
              if (typeof img === 'string') imgUrls.push(img)
              else if (img?.url) imgUrls.push(img.url)
            })
          } else if (typeof productObj.image === 'string') {
            imgUrls.push(productObj.image)
          } else if (productObj.image?.url) {
            imgUrls.push(productObj.image.url)
          }

          return {
            id: productObj.sku || productObj.productID || parsedUrl.pathname,
            url: targetUrl,
            title: productObj.name || productObj.title || 'Live Product',
            description: productObj.description || '',
            merchant: {
              name: productObj.brand?.name || domain.replace(/^www\./, ''),
              domain,
              platform: 'schema_ld',
            },
            price: {
              amount: parseFloat(rawPrice) || 0,
              currency,
            },
            available: inStock,
            images: imgUrls.map((u) => ({ url: u })),
            rawMetadata: productObj,
          }
        }
      } catch {
        // Continue to next JSON-LD block
      }
    }
  }

  // 2. Fallback to Open Graph tags
  const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i)?.[1]
  const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i)?.[1]
  const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i)?.[1]
  const ogPrice =
    html.match(/<meta\s+property=["']product:price:amount["']\s+content=["'](.*?)["']/i)?.[1] ||
    html.match(/<meta\s+property=["']og:price:amount["']\s+content=["'](.*?)["']/i)?.[1]
  const ogCurrency =
    html.match(/<meta\s+property=["']product:price:currency["']\s+content=["'](.*?)["']/i)?.[1] ||
    html.match(/<meta\s+property=["']og:price:currency["']\s+content=["'](.*?)["']/i)?.[1] ||
    'USD'

  const title = ogTitle || html.match(/<title>(.*?)<\/title>/i)?.[1] || 'Live Product'

  return {
    id: parsedUrl.pathname,
    url: targetUrl,
    title: title.replace(/&amp;/g, '&').replace(/&#39;/g, "'"),
    description: ogDesc || '',
    merchant: {
      name: domain.replace(/^www\./, ''),
      domain,
      platform: 'open_graph',
    },
    price: {
      amount: ogPrice ? parseFloat(ogPrice) : 0,
      currency: ogCurrency,
    },
    available: true,
    images: ogImage ? [{ url: ogImage }] : [],
  }
}

/**
 * Query a live public Shopify merchant's catalog via their public products.json endpoint.
 */
export async function queryShopifyStore(domain: string, query?: string): Promise<LiveProduct[]> {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const endpoint = `https://${cleanDomain}/products.json?limit=15`

  const res = await fetch(endpoint, {
    headers: {
      'User-Agent': 'RukyrAgent/1.0',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(6000),
  })

  if (!res.ok) {
    throw new Error(`Shopify store '${cleanDomain}' catalog returned ${res.status}`)
  }

  const data = await res.json()
  const rawProducts = data.products || []

  const q = query?.toLowerCase()
  const filtered = q
    ? rawProducts.filter(
        (p: any) =>
          p.title?.toLowerCase().includes(q) ||
          p.body_html?.toLowerCase().includes(q) ||
          p.tags?.some?.((t: string) => t.toLowerCase().includes(q)),
      )
    : rawProducts

  return filtered.map((p: any) => {
    const firstVariant = p.variants?.[0] || {}
    const priceAmount = parseFloat(firstVariant.price || '0')
    const inStock = Boolean(firstVariant.available ?? true)
    const images: LiveProductImage[] = (p.images || []).map((img: any) => ({
      url: img.src,
      altText: img.alt || p.title,
    }))

    return {
      id: String(p.id),
      url: `https://${cleanDomain}/products/${p.handle}`,
      title: p.title,
      description: p.body_html ? p.body_html.replace(/<[^>]+>/g, '').trim().slice(0, 300) : '',
      merchant: {
        name: cleanDomain.split('.')[0].toUpperCase(),
        domain: cleanDomain,
        platform: 'shopify',
      },
      price: {
        amount: priceAmount,
        currency: 'USD',
      },
      available: inStock,
      images,
      rawMetadata: {
        handle: p.handle,
        variantId: firstVariant.id,
        tags: p.tags,
      },
    }
  })
}

/**
 * Evaluates whether a product listing exhibits risk factors requiring real-world human verification.
 */
export function analyzeProductVerificationNeed(product: LiveProduct): VerificationAnalysis {
  const reasons: string[] = []
  const text = `${product.title} ${product.description || ''} ${(product.rawMetadata?.tags || []).join(' ')}`.toLowerCase()

  // 1. Pre-owned / Vintage / Refurbished condition
  if (
    text.includes('vintage') ||
    text.includes('used') ||
    text.includes('pre-owned') ||
    text.includes('refurbished') ||
    text.includes('open box') ||
    text.includes('open-box') ||
    text.includes('distressed')
  ) {
    reasons.push('Item is listed as vintage/pre-owned/open-box: Physical condition, wear, and flaws must be confirmed.')
  }

  // 2. High-risk color or delicate material
  if (
    text.includes('leather') ||
    text.includes('suede') ||
    text.includes('silk') ||
    text.includes('washed') ||
    text.includes('faded') ||
    text.includes('colorway')
  ) {
    reasons.push('Material/dye requires natural daylight verification to avoid camera filter/monitor color distortion.')
  }

  // 3. Low stock / inventory scarcity
  if (!product.available || text.includes('low stock') || text.includes('last one') || text.includes('limited edition')) {
    reasons.push('Low or scarce inventory: Physical shelf check advised before agent commits cart checkout.')
  }

  // 4. Missing or generic photos
  if (!product.images || product.images.length <= 1) {
    reasons.push('Listing has only 1 stock photo: Actual on-hand item proof needed.')
  }

  const requiresVerification = reasons.length > 0
  const riskLevel = reasons.length >= 2 ? 'high' : reasons.length === 1 ? 'medium' : 'low'

  let suggestedTask
  if (requiresVerification) {
    const isLocalShelf = text.includes('open box') || text.includes('in-store') || text.includes('pickup')
    const taskType: TaskType = isLocalShelf ? 'local_presence' : 'verification'
    const suggestedPriceCents = riskLevel === 'high' ? 500 : 350

    suggestedTask = {
      title: `Verify ${product.title.slice(0, 60)} before agent purchase`,
      description: `Product: ${product.title}\nMerchant: ${product.merchant.name} (${product.merchant.domain})\nListing Price: $${product.price.amount.toFixed(2)}\nURL: ${product.url}\n\nRequired Verification:\n${reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}`,
      taskType,
      suggestedPriceCents,
      proofRequirements: 'photo' as const,
      deadlineMinutes: 180,
    }
  }

  return {
    requiresVerification,
    riskLevel,
    reasons,
    suggestedTask,
  }
}
