'use client';

import { Loader2 } from 'lucide-react';

/** Full-screen loader shown until `/auth/tenant-info` resolves (non-localhost only). */
export function TenantInfoLoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-[90] flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <div className="flex flex-col items-center gap-8">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" aria-hidden />
        </div>
        <div className="max-w-sm space-y-2 text-center">
          <p className="text-base font-medium text-slate-800">Verifying domain</p>
          <p className="text-sm text-slate-500">
            Connecting to your workspace…
          </p>
        </div>
        <div className="h-1.5 w-52 overflow-hidden rounded-full bg-slate-200/90">
          <div className="h-full w-2/5 animate-pulse rounded-full bg-primary-500/80" />
        </div>
      </div>
    </div>
  );
}
