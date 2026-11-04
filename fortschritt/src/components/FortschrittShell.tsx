import { AppHeader } from '@shared/components/AppHeader'
import { SidebarLayout } from '@shared/components/SidebarLayout'
import { MapProvider } from 'react-map-gl/maplibre'
import { DataGate } from '@/components/DataGate'
import { FortschrittSidebar } from '@/components/FortschrittSidebar'
import { FortschrittMap } from '@/components/map/FortschrittMap'
import { OverviewView } from '@/components/overview/OverviewView'
import { PeopleView } from '@/components/people/PeopleView'
import { ReloadButton } from '@/components/ReloadButton'
import { useFortschrittNav } from '@/components/use-fortschritt-nav'
import { appTitle } from '@/config/app.const'

export function FortschrittShell() {
  const { current, steps, goToView } = useFortschrittNav()
  return (
    <MapProvider>
      <SidebarLayout
        header={({ onOpenSidebar }) => (
          <AppHeader
            title={appTitle}
            steps={steps}
            onSelect={goToView}
            onOpenSidebar={onOpenSidebar}
            actions={<ReloadButton />}
            showLogin={false}
          />
        )}
        sidebar={<FortschrittSidebar view={current} />}
      >
        <DataGate>
          {(dataset) => {
            switch (current) {
              case 'ueberblick':
                return <OverviewView dataset={dataset} />
              case 'personen':
                return <PeopleView dataset={dataset} />
              case 'karte':
                return <FortschrittMap dataset={dataset} />
            }
          }}
        </DataGate>
      </SidebarLayout>
    </MapProvider>
  )
}
