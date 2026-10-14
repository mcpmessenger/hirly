import Link from 'next/link'
import { DonutMark } from './donut-mark'
import { paypalMode } from '@/lib/paypal'
import { aiLive } from '@/lib/ai-verify'
import { usingSupabase } from '@/lib/db'

const links = [
  { href: '/agent', label: 'Agent console' },
  { href: '/agent/shop', label: 'Agent shop' },
  { href: '/earn', label: 'Earn' },
  { href: '/earn/me', label: 'Earnings' },
]

export function SiteHeader() {
  const mock = [
    paypalMode === 'mock' && 'PayPal',
    !aiLive && 'AI',
    !usingSupabase && 'database',
  ].filter(Boolean)
  return (
    <>
      {mock.length > 0 && (
        <div className="bg-[#2a2118] px-4 py-1.5 text-center text-xs text-[#f4a261]">
          Demo mode: {mock.join(', ')} simulated. Add keys in <code>.env.local</code> to go live.
          {paypalMode !== 'mock' && ` PayPal ${paypalMode}.`}
        </div>
      )}
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2 group" aria-label="Rukyr home">
          <span className="text-xl font-semibold tracking-[-0.04em]">Rukyr</span>
          <DonutMark width={34} height={19} className="transition-transform group-hover:scale-105" />
        </Link>
        <div className="flex items-center gap-5 text-sm text-[#aaa69e]">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-white">
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}

