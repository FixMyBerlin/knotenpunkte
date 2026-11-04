import { useMemo } from 'react'
import {
  useSelectedSuggestionId,
  useSkippedSuggestions,
  useSuggestionFilter,
} from '@/components/suggestion-store'
import { useKeineAktion } from '@/components/use-keine-aktion'
import type { Network } from '@/network/model'
import { openSuggestions } from '@/network/suggestion-lookup'

/** Suggestions still to look at in the area, and the selected one among them. */
export function useOpenSuggestions(gebiet: string | undefined, network: Network | null) {
  const filter = useSuggestionFilter()
  const skippedByArea = useSkippedSuggestions()
  const { decisions } = useKeineAktion(gebiet)
  const selectedId = useSelectedSuggestionId()
  const skipped = gebiet ? skippedByArea[gebiet] : undefined
  const open = useMemo(
    () =>
      network
        ? openSuggestions(
            network,
            filter,
            new Set([...(skipped ?? []), ...decisions.map((item) => item.suggestionId)]),
          )
        : [],
    [network, filter, skipped, decisions],
  )
  return { open, selected: open.find((suggestion) => suggestion.id === selectedId) ?? null }
}
