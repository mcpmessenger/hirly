'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LiveProduct, VerificationAnalysis } from '@/lib/merchant-live'

const PRESET_EXAMPLES = [
  {
    label: 'Vintage Denim Jacket',
    url: 'https://demo-vintage.myshopify.com/products/vintage-tee-1994',
    type: 'url',
  },
  {
    label: 'Live Shopify Store: Allbirds',
    domain: 'shop.allbirds.com',
    type: 'store',
  },
  {
    label: 'Live Shopify Store: Gymshark',
    domain: 'gymshark.com',
    type: 'store',
  },
]

export function MerchantInspector() {
  const [mode, setMode] = useState<'url' | 'store'>('url')
  const [urlInput, setUrlInput] = useState('')
  const [domainInput, setDomainInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [singleResult, setSingleResult] = useState<{
    product: LiveProduct
    analysis: VerificationAnalysis
  } | null>(null)
  const [storeResults, setStoreResults] = useState<
    Array<{ product: LiveProduct; analysis: VerificationAnalysis }>
  >([])

  async function inspect(targetUrl?: string, targetDomain?: string) {
    const url = targetUrl ?? (mode === 'url' ? urlInput : undefined)
    const domain = targetDomain ?? (mode === 'store' ? domainInput : undefined)

    if (!url && !domain) {
      setError('Please enter a product URL or store domain.')
      return
    }

    setBusy(true)
    setError(null)
    setSingleResult(null)
    setStoreResults([])

    try {
      const res = await fetch('/api/merchant/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, store_domain: domain }),
      })

      const data = await res.json()
      setBusy(false)

      if (!res.ok) {
        setError(data.error || 'Failed to inspect merchant')
        return
      }

      if (data.type === 'single_product') {
        setSingleResult({ product: data.product, analysis: data.analysis })
      } else if (data.type === 'store_catalog') {
        setStoreResults(data.items || [])
      }
    } catch (err: any) {
      setBusy(false)
      setError(err?.message || 'Failed to reach merchant inspection service')
    }
  }

  return (
    <div className="rounded-2xl border border-[#302e2b] bg-[#161615] p-6 shadow-xl mb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="rounded-full bg-[#8bd3a8]/20 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-[#8bd3a8]">
            Live Production System
          </span>
          <h2 className="mt-2 text-xl font-semibold">Live Merchant & Product Inspector</h2>
          <p className="mt-1 text-xs text-[#8f8b84]">
            Extract real-time Schema.org JSON-LD from any e-commerce link or query live Shopify storefront catalogs.
          </p>
        </div>

        {/* Toggle Mode */}
        <div className="flex rounded-full bg-[#1b1b1a] p-1 border border-[#302e2b]">
          <button
            type="button"
            onClick={() => {
              setMode('url')
              setError(null)
            }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              mode === 'url' ? 'bg-[#f4a261] text-[#171412]' : 'text-[#8f8b84] hover:text-[#f8f5ef]'
            }`}
          >
            Any Product URL
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('store')
              setError(null)
            }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              mode === 'store' ? 'bg-[#f4a261] text-[#171412]' : 'text-[#8f8b84] hover:text-[#f8f5ef]'
            }`}
          >
            Shopify Storefront
          </button>
        </div>
      </div>

      {/* Input row */}
      <div className="mt-5 flex gap-2">
        {mode === 'url' ? (
          <input
            type="url"
            placeholder="Paste any live product URL (e.g. Best Buy, Depop, Shopify store, Target)..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && inspect()}
            className="flex-1 rounded-xl border border-[#302e2b] bg-[#1b1b1a] px-4 py-2.5 text-sm text-[#f8f5ef] outline-none focus:border-[#f4a261]"
          />
        ) : (
          <input
            type="text"
            placeholder="Enter Shopify store domain (e.g. shop.allbirds.com or gymshark.com)..."
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && inspect()}
            className="flex-1 rounded-xl border border-[#302e2b] bg-[#1b1b1a] px-4 py-2.5 text-sm text-[#f8f5ef] outline-none focus:border-[#f4a261]"
          />
        )}
        <button
          onClick={() => inspect()}
          disabled={busy}
          className="rounded-xl bg-[#f4a261] px-5 py-2.5 text-sm font-semibold text-[#171412] hover:bg-[#f4a261]/90 disabled:opacity-50 transition-colors"
        >
          {busy ? 'Extracting…' : 'Inspect Live'}
        </button>
      </div>

      {/* Preset pills */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[#77736c]">Presets:</span>
        {PRESET_EXAMPLES.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              if (p.type === 'url' && p.url) {
                setMode('url')
                setUrlInput(p.url)
                inspect(p.url, undefined)
              } else if (p.type === 'store' && p.domain) {
                setMode('store')
                setDomainInput(p.domain)
                inspect(undefined, p.domain)
              }
            }}
            className="rounded-full border border-[#302e2b] bg-[#1b1b1a] px-2.5 py-1 text-[#aaa69e] hover:border-[#f4a261] hover:text-[#f8f5ef] transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 rounded-lg bg-[#331d1d] p-3 text-xs text-[#f08f8f]">{error}</p>}

      {/* Single Live Product Result */}
      {singleResult && (
        <div className="mt-6 rounded-xl border border-[#302e2b] bg-[#1b1b1a] p-5">
          <div className="flex flex-col md:flex-row gap-5">
            {singleResult.product.images[0]?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={singleResult.product.images[0].url}
                alt={singleResult.product.title}
                className="h-44 w-44 rounded-lg object-contain bg-[#111111] shrink-0"
              />
            )}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] uppercase text-[#77736c]">
                      {singleResult.product.merchant.name} ({singleResult.product.merchant.domain})
                    </span>
                    <h3 className="mt-1 text-lg font-medium leading-snug">
                      {singleResult.product.title}
                    </h3>
                  </div>
                  <span className="font-mono text-xl text-[#f4a261]">
                    ${singleResult.product.price.amount.toFixed(2)}
                  </span>
                </div>
                {singleResult.product.description && (
                  <p className="mt-2 text-xs text-[#8f8b84] line-clamp-2">
                    {singleResult.product.description}
                  </p>
                )}

                {/* Verification Need Badge */}
                {singleResult.analysis.requiresVerification ? (
                  <div className="mt-3 rounded-lg bg-[#33281c] p-3 text-xs text-[#f4a261]">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span>⚠️ Ground-Truth Verification Advised:</span>
                      <span className="capitalize font-mono">
                        ({singleResult.analysis.riskLevel} risk)
                      </span>
                    </div>
                    <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                      {singleResult.analysis.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg bg-[#1d2b22] p-2.5 text-xs text-[#8bd3a8]">
                    ✓ No physical risk detected. Ready for automated agent checkout.
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="mt-4 pt-3 border-t border-[#262422] flex items-center justify-between">
                <a
                  href={singleResult.product.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#77736c] hover:underline"
                >
                  View live listing ↗
                </a>
                {singleResult.analysis.suggestedTask && (
                  <Link
                    href={`/agent?${new URLSearchParams({
                      title: singleResult.analysis.suggestedTask.title,
                      description: singleResult.analysis.suggestedTask.description,
                      type: singleResult.analysis.suggestedTask.taskType,
                      price: (
                        singleResult.analysis.suggestedTask.suggestedPriceCents / 100
                      ).toString(),
                      proof: singleResult.analysis.suggestedTask.proofRequirements,
                    })}`}
                    className="rounded-full bg-[#f4a261] px-4 py-2 text-xs font-semibold text-[#171412] hover:bg-[#f4a261]/90 transition-colors"
                  >
                    Hire Human to Verify ($
                    {(singleResult.analysis.suggestedTask.suggestedPriceCents / 100).toFixed(2)})
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi Storefront Results */}
      {storeResults.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-xs uppercase font-mono tracking-wider text-[#77736c]">
            Live Catalog ({storeResults.length} items extracted)
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {storeResults.slice(0, 6).map(({ product, analysis }) => (
              <div
                key={product.id}
                className="flex flex-col justify-between rounded-xl border border-[#302e2b] bg-[#1b1b1a] p-3 text-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium line-clamp-1">{product.title}</span>
                    <span className="font-mono text-[#f4a261]">
                      ${product.price.amount.toFixed(2)}
                    </span>
                  </div>
                  {product.images[0]?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0].url}
                      alt={product.title}
                      className="mt-2 h-28 w-full rounded object-contain bg-[#111111]"
                    />
                  )}
                  {analysis.requiresVerification && (
                    <p className="mt-2 text-[11px] text-[#f4a261] line-clamp-2">
                      ⚠️ {analysis.reasons[0]}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-[#262422] flex items-center justify-between">
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#77736c] hover:underline"
                  >
                    Store link ↗
                  </a>
                  {analysis.suggestedTask && (
                    <Link
                      href={`/agent?${new URLSearchParams({
                        title: analysis.suggestedTask.title,
                        description: analysis.suggestedTask.description,
                        type: analysis.suggestedTask.taskType,
                        price: (analysis.suggestedTask.suggestedPriceCents / 100).toString(),
                        proof: analysis.suggestedTask.proofRequirements,
                      })}`}
                      className="rounded-full bg-[#f4a261] px-3 py-1 font-semibold text-[#171412] hover:bg-[#f4a261]/90"
                    >
                      Verify (${(analysis.suggestedTask.suggestedPriceCents / 100).toFixed(2)})
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
