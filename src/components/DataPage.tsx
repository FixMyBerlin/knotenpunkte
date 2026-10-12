import { AdminRatingsPage } from '@/components/admin/AdminRatingsPage'
import { AppHeader } from '@/components/AppHeader'
import { useAppStepNav } from '@/components/shared/use-app-step-nav'

export function DataPage() {
  const { steps, goToStep, search } = useAppStepNav()

  return (
    <div className="flex h-full w-full flex-col bg-zinc-950">
      <AppHeader steps={steps} onSelect={goToStep} dataPage search={search} />
      <main className="min-h-0 flex-1 overflow-auto">
        <AdminRatingsPage />
      </main>
    </div>
  )
}
