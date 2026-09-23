import { useQuery } from '@tanstack/react-query'
import { useMatch, useNavigate, useRouterState } from '@tanstack/react-router'
import type { StepNavItem } from '@/components/StepNav'
import { loadNodes } from '@/shared/datasets/dataset-idb'
import { ratingStore, ratingsQueryKey } from '@/shared/ratings/ratings-query'
import {
  appStepLabels,
  appSteps,
  resolveStep,
  stepDescription,
  stepStatus,
  type AppStep,
} from '@/shared/routing/app-step'

export function useAppStepNav() {
  const navigate = useNavigate()
  const indexMatch = useMatch({ from: '/', shouldThrow: false })
  const isDataPage = useRouterState({
    select: (state) => state.location.pathname === '/data',
  })
  const dataset = indexMatch?.search.dataset
  const current = isDataPage ? undefined : resolveStep(indexMatch?.search ?? {})

  const nodesQuery = useQuery({
    queryKey: ['dataset', dataset],
    queryFn: () => loadNodes(dataset!),
    enabled: Boolean(dataset),
  })
  const ratingsQuery = useQuery({
    queryKey: ratingsQueryKey(dataset ?? ''),
    queryFn: () => ratingStore.list(dataset!),
    enabled: Boolean(dataset),
  })
  const hasLocalNodes = Boolean(nodesQuery.data)
  const records = ratingsQuery.data ?? {}
  const remoteCount = dataset ? Object.keys(records).length : 0
  const nodes = nodesQuery.data?.collection

  const steps: StepNavItem[] = appSteps.map((id) => ({
    id,
    label: appStepLabels[id].label,
    description: stepDescription({
      step: id,
      dataset,
      nodes,
      records,
      remoteCount,
    }),
    status: stepStatus({
      step: id,
      current,
      dataset,
    }),
  }))

  function goToStep(id: AppStep) {
    void navigate({
      to: '/',
      search: indexMatch ? { ...indexMatch.search, step: id } : { step: id },
      replace: !isDataPage,
    })
  }

  return {
    dataset,
    current,
    nodes,
    records,
    remoteCount,
    hasLocalNodes,
    steps,
    goToStep,
    isDataPage,
  }
}
