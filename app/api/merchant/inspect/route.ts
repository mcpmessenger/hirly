import { NextResponse } from 'next/server'
import {
  fetchLiveProduct,
  queryShopifyStore,
  analyzeProductVerificationNeed,
} from '@/lib/merchant-live'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { url, store_domain, query } = body

    if (url) {
      const product = await fetchLiveProduct(url)
      const analysis = analyzeProductVerificationNeed(product)
      return NextResponse.json({
        success: true,
        type: 'single_product',
        product,
        analysis,
      })
    }

    if (store_domain) {
      const products = await queryShopifyStore(store_domain, query)
      const analyzed = products.map((p) => ({
        product: p,
        analysis: analyzeProductVerificationNeed(p),
      }))
      return NextResponse.json({
        success: true,
        type: 'store_catalog',
        count: analyzed.length,
        items: analyzed,
      })
    }

    return NextResponse.json(
      { error: 'Please provide either a product "url" or a Shopify "store_domain"' },
      { status: 400 },
    )
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to inspect merchant' },
      { status: 500 },
    )
  }
}
