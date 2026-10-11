import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'

/**
 * STUB: a hardcoded response shaped like a UCP product-discovery result.
 * Replace `discoverProducts()` with a real UCP client (https://ucp.dev) against a Shopify test store.
 */
async function discoverProducts() {
  return [
    {
      id: 'gid://shop/Product/vintage-tee-001',
      title: '1994 Tour Band Tee, Vintage Faded Black',
      price: { amount: '38.00', currency: 'USD' },
      merchant: 'demo-vintage.myshopify.com (mock)',
      image: '/placeholder.svg',
      note: 'Listing photo is dim; the color could be faded black or navy.',
    },
  ]
}

export default async function ShopPage() {
  const products = await discoverProducts()
  return (
    <main className="min-h-screen bg-[#111111] text-[#f8f5ef]">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 pb-20">
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">Agent shop</h1>
        <p className="mt-1 text-sm text-[#8f8b84]">
          <span className="font-mono text-[#c4beb4]">glazyr-shopper-01</span> is shopping for a vintage band tee via UCP discovery{' '}
          <span className="text-[#f4a261]">(mocked response)</span>.
        </p>
        {products.map((p) => (
          <article key={p.id} className="mt-8 rounded-2xl border border-[#302e2b] bg-[#161615] p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt={p.title} className="h-48 w-full rounded-xl bg-[#242320] object-contain" />
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-medium">{p.title}</h2>
                <p className="mt-1 text-xs text-[#77736c]">{p.merchant}</p>
              </div>
              <span className="font-mono text-xl text-[#f4a261]">${p.price.amount}</span>
            </div>
            <p className="mt-4 rounded-lg bg-[#33281c] px-3 py-2 text-sm text-[#f4a261]">Agent can&apos;t verify: {p.note}</p>
            <Link
              href={`/agent?${new URLSearchParams({
                title: 'Verify tee color in listing photo vs. real life',
                description: `Listing: ${p.title}. ${p.note} Photograph a matching item in daylight and note the color.`,
                type: 'verification',
                price: '300',
                proof: 'photo',
              })}`}
              className="mt-4 inline-block rounded-full bg-[#f4a261] px-5 py-2.5 text-sm font-semibold text-[#171412]"
            >
              Can&apos;t verify color: post a $3 task
            </Link>
          </article>
        ))}
      </div>
    </main>
  )
}
