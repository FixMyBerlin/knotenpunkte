import { createFileRoute } from '@tanstack/react-router'
import { NetzShell } from '@/components/NetzShell'
import { indexSearchSchema } from '@/routing/search-schema'

export const Route = createFileRoute('/')({
  validateSearch: indexSearchSchema,
  component: NetzShell,
})
