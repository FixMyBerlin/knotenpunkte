import type { ReactNode } from 'react'

/** Heading of one part of the report (Überblick, Personen); the sections below use h3. */
export function PartHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-4 border-b border-white/10 pb-2 text-lg font-semibold text-zinc-50"
    >
      {children}
    </h2>
  )
}
