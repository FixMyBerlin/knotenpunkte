import { createFileRoute } from '@tanstack/react-router'
import { NetzDataPage } from '@/components/NetzDataPage'
import { dataSearchSchema } from '@/routing/search-schema'

export const Route = createFileRoute('/data')({
  validateSearch: dataSearchSchema,
  component: NetzDataPage,
})
