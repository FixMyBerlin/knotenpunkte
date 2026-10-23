import { AppHeader } from '@shared/components/AppHeader'
import { SidebarLayout } from '@shared/components/SidebarLayout'
import { MapProvider } from 'react-map-gl/maplibre'
import { DataPageLink } from '@/components/DataPageLink'
import { RatingMap } from '@/components/RatingMap'
import { useAppStepNav } from '@/components/shared/use-app-step-nav'
import { AppSidebar } from '@/components/Sidebar'

export function AppShell() {
  const { steps, goToStep, search } = useAppStepNav()

  return (
    <MapProvider>
      <SidebarLayout
        header={({ onOpenSidebar }) => (
          <AppHeader
            title="Knotenpunkte"
            steps={steps}
            onSelect={goToStep}
            onOpenSidebar={onOpenSidebar}
            actions={<DataPageLink search={search} />}
          />
        )}
        sidebar={<AppSidebar />}
      >
        <RatingMap />
      </SidebarLayout>
    </MapProvider>
  )
}
