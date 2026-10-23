import { AppHeader } from '@shared/components/AppHeader'
import { SidebarLayout } from '@shared/components/SidebarLayout'
import { MapProvider } from 'react-map-gl/maplibre'
import { NetzDataLink } from '@/components/NetzDataLink'
import { NetzMap } from '@/components/NetzMap'
import { NetzSidebar } from '@/components/NetzSidebar'
import { useNetzNav } from '@/components/use-netz'
import { appTitle } from '@/config/app.const'

export function NetzShell() {
  const { steps, goToStep, search } = useNetzNav()
  return (
    <MapProvider>
      <SidebarLayout
        header={({ onOpenSidebar }) => (
          <AppHeader
            title={appTitle}
            steps={steps}
            onSelect={goToStep}
            onOpenSidebar={onOpenSidebar}
            actions={<NetzDataLink search={search} />}
          />
        )}
        sidebar={<NetzSidebar />}
      >
        <NetzMap />
      </SidebarLayout>
    </MapProvider>
  )
}
