import { AppHeader } from '@shared/components/AppHeader'
import { AdminRatingsPage } from '@/components/admin/AdminRatingsPage'
import { DataPageLink } from '@/components/DataPageLink'
import { useAppStepNav } from '@/components/shared/use-app-step-nav'

export function DataPage() {
  const { steps, goToStep, search } = useAppStepNav()

  return (
    <div className="flex h-full w-full flex-col bg-zinc-950">
      <AppHeader
        title="Knotenpunkte"
        steps={steps}
        onSelect={goToStep}
        actions={<DataPageLink dataPage search={search} />}
      />
      <main className="min-h-0 flex-1 overflow-auto">
        <AdminRatingsPage />
      </main>
    </div>
  )
}
