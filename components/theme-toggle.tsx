'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        className={`size-9 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 ${className}`}
        aria-hidden="true"
      />
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`relative inline-flex size-9 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700/70 bg-white/80 dark:bg-neutral-900/80 text-neutral-800 dark:text-neutral-200 shadow-sm backdrop-blur transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500 ${className}`}
      aria-label={isDark ? 'Switch to Nordic light mode' : 'Switch to Nordic dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Sun
        className={`size-4 transition-all duration-300 ${
          isDark
            ? 'rotate-0 scale-100 opacity-100 text-[#f4a261]'
            : '-rotate-90 scale-0 opacity-0 absolute'
        }`}
      />
      <Moon
        className={`size-4 transition-all duration-300 ${
          isDark
            ? 'rotate-90 scale-0 opacity-0 absolute'
            : 'rotate-0 scale-100 opacity-100 text-neutral-700'
        }`}
      />
    </button>
  )
}
