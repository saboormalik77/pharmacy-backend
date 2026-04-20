'use client'

import { Globe2 } from 'lucide-react'

/**
 * Full-screen black page when the current hostname does not resolve to a tenant.
 */
export function DomainNotRecognizedScreen({
  detail,
}: {
  detail?: string | null
}) {
  const body =
    detail?.trim() ||
    'This hostname is not registered for access. Please check the web address or contact your administrator.'

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#030303] px-6 text-center"
      role="alert"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-15%,rgba(99,102,241,0.12),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.04),transparent_45%)]"
        aria-hidden
      />

      <div className="relative z-10 flex max-w-md flex-col items-center gap-10 sm:max-w-lg">
        <div className="flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_25px_60px_-20px_rgba(0,0,0,0.9)]">
          <Globe2 className="h-9 w-9 text-white/55" strokeWidth={1.1} aria-hidden />
        </div>

        <div className="space-y-5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-white/30">
            Access unavailable
          </p>
          <h1 className="text-balance font-light tracking-[-0.02em] text-[1.75rem] leading-snug text-white sm:text-[2.25rem]">
            Domain not recognized
          </h1>
          <p className="text-pretty text-[0.9375rem] leading-relaxed text-white/40 sm:text-base">
            {body}
          </p>
        </div>

        <div
          className="h-px w-28 bg-gradient-to-r from-transparent via-white/18 to-transparent"
          aria-hidden
        />
      </div>
    </div>
  )
}
