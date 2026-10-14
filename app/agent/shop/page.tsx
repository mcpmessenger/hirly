import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { MerchantInspector } from '@/components/merchant-inspector'
import { queryUcpCatalog } from '@/lib/ucp'

export const dynamic = 'force-dynamic'

export default async function ShopPage() {
  const products = await queryUcpCatalog()
  return (
    <main className="min-h-screen bg-[#111111] text-[#f8f5ef]">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 pb-20">
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">Agent shop & live discovery</h1>
        <p className="mt-1 text-sm text-[#8f8b84] mb-8">
          Inspect live products from any e-commerce URL or Shopify storefront. When AI detects physical ground-truth risks, post an escrowed verification task for human earners.
        </p>

        {/* Live Merchant & Product Inspector */}
        <MerchantInspector />

        <div className="border-t border-[#262422] pt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">UCP Reference Merchant (Discovery Protocol)</h2>
            <span className="rounded-full bg-[#33281c] px-2.5 py-0.5 text-xs text-[#f4a261]">
              UCP 1.0 Spec
            </span>
          </div>
          <p className="mt-1 text-xs text-[#77736c]">
            Compliant with Google/Shopify Universal Commerce Protocol specification for agent shopping.
          </p>

          {products.map((p) => (
            <article key={p.id} className="mt-6 rounded-2xl border border-[#302e2b] bg-[#161615] p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.images[0]?.url || '/placeholder.svg'}
                alt={p.title}
                className="h-48 w-full rounded-xl bg-[#242320] object-contain"
              />
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium">{p.title}</h3>
                  <p className="mt-1 text-xs text-[#77736c]">
                    {p.merchant.name} ({p.merchant.domain})
                  </p>
                </div>
                <span className="font-mono text-xl text-[#f4a261]">${p.price.amount}</span>
              </div>
              {p.verificationReason && (
                <p className="mt-4 rounded-lg bg-[#33281c] px-3 py-2 text-sm text-[#f4a261]">
                  <strong>UCP Agent Check Required:</strong> {p.verificationReason}
                </p>
              )}
              <Link
                href={`/agent?${new URLSearchParams({
                  title: 'Verify tee color in listing photo vs. real life',
                  description: `UCP Product: ${p.title} (${p.id}). ${p.verificationReason}`,
                  type: 'verification',
                  price: '300',
                  proof: 'photo',
                })}`}
                className="mt-4 inline-block rounded-full bg-[#f4a261] px-5 py-2.5 text-sm font-semibold text-[#171412] hover:bg-[#f4a261]/90 transition-colors"
              >
                Can&apos;t verify color: post a $3 task
              </Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
