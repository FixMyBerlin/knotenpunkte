import { AppHeader } from '@shared/components/AppHeader'
import { SidebarLayout } from '@shared/components/SidebarLayout'
import { MapProvider } from 'react-map-gl/maplibre'
import { DataGate } from '@/components/DataGate'
import { FortschrittSidebar } from '@/components/FortschrittSidebar'
import { FortschrittMap } from '@/components/map/FortschrittMap'
import { ReportView } from '@/components/report/ReportView'
import { useFortschrittNav } from '@/components/use-fortschritt-nav'
import { appTitle } from '@/config/app.const'

/** The report only has the navigation and data info in the sidebar, so it can be narrow. */
const narrowSidebarWidth = 240

export function FortschrittShell() {
  const { current } = useFortschrittNav()
  return (
    <MapProvider>
      <SidebarLayout
        header={({ onOpenSidebar }) => (
          <AppHeader
            title={appTitle}
            steps={[]}
            onSelect={() => undefined}
            onOpenSidebar={onOpenSidebar}
            showLogin={false}
          />
        )}
        sidebar={<FortschrittSidebar view={current} />}
        fixedSidebarWidth={current === 'karte' ? undefined : narrowSidebarWidth}
      >
        <DataGate>
          {(dataset) => {
            switch (current) {
              case 'bericht':
                return <ReportView dataset={dataset} />
              case 'karte':
                return <FortschrittMap dataset={dataset} />
            }
          }}
        </DataGate>
      </SidebarLayout>
    </MapProvider>
  )
}
