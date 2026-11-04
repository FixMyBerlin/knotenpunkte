import { createFileRoute } from '@tanstack/react-router'
import { FortschrittShell } from '@/components/FortschrittShell'
import { indexSearchSchema } from '@/routing/search-schema'

export const Route = createFileRoute('/')({
  validateSearch: indexSearchSchema,
  component: FortschrittShell,
})
