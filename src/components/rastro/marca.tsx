import { cn } from "@/lib/utils";

/** Marca do Rastro: três pontos ligados, e o último trecho tracejado. */
export function Marca({ className, comNome = true }: { className?: string; comNome?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 40 16" className="h-4 w-10" aria-hidden="true">
        <path d="M4 8 H22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M22 8 H36" stroke="var(--quebra)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2.5 3.5" />
        <circle cx="4" cy="8" r="3" fill="currentColor" />
        <circle cx="16" cy="8" r="3" fill="currentColor" />
        <circle cx="36" cy="8" r="3.5" fill="none" stroke="var(--quebra)" strokeWidth="2" />
      </svg>
      {comNome && <span className="text-[1.05rem]">Rastro</span>}
    </span>
  );
}
