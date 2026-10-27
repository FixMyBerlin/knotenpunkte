import { useMemo } from 'react'
import {
  useNoActionSuggestions,
  useSelectedSuggestionId,
  useSkippedSuggestions,
  useSuggestionFilter,
} from '@/components/suggestion-store'
import type { Network } from '@/network/model'
import { openSuggestions } from '@/network/suggestion-lookup'

/** Suggestions still to look at in the area, and the selected one among them. */
export function useOpenSuggestions(gebiet: string | undefined, network: Network | null) {
  const filter = useSuggestionFilter()
  const skippedByArea = useSkippedSuggestions()
  const noActionByArea = useNoActionSuggestions()
  const selectedId = useSelectedSuggestionId()
  const skipped = gebiet ? skippedByArea[gebiet] : undefined
  const noAction = gebiet ? noActionByArea[gebiet] : undefined
  const open = useMemo(
    () =>
      network
        ? openSuggestions(network, filter, new Set([...(skipped ?? []), ...(noAction ?? [])]))
        : [],
    [network, filter, skipped, noAction],
  )
  return { open, selected: open.find((suggestion) => suggestion.id === selectedId) ?? null }
}
