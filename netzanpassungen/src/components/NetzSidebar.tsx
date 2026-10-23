import { Button } from '@shared/components/ui/button'
import { Callout } from '@shared/components/ui/callout'
import { Sidebar, SidebarBody, SidebarSection } from '@shared/components/ui/sidebar'
import { DrawPanel } from '@/components/DrawPanel'
import { ExportPanel } from '@/components/ExportPanel'
import { GebietPanel } from '@/components/GebietPanel'
import { OverviewPanel } from '@/components/OverviewPanel'
import { StorageModeCallout } from '@/components/StorageModeCallout'
import { useNetwork, useNetzNav } from '@/components/use-netz'

export function NetzSidebar() {
  const { gebiet, current, goToStep } = useNetzNav()
  const { network, baseQuery } = useNetwork(gebiet)

  const missing =
    current !== 'gebiet' && (!gebiet || (!network && !baseQuery.isPending)) ? (
      <SidebarSection>
        <Callout title={gebiet ? 'Keine Daten' : 'Kein Gebiet'}>
          {gebiet
            ? `Für „${gebiet}“ ist in diesem Browser keine Datei importiert.`
            : 'Wähle zuerst ein Gebiet.'}
        </Callout>
        <Button type="button" color="sky" className="mt-3" onClick={() => goToStep('gebiet')}>
          Zum Gebiet
        </Button>
      </SidebarSection>
    ) : null

  return (
    <Sidebar className="h-full bg-zinc-900">
      <SidebarBody>
        <SidebarSection>
          <StorageModeCallout />
        </SidebarSection>
        {current === 'gebiet' ? (
          <SidebarSection>
            <GebietPanel />
          </SidebarSection>
        ) : (
          (missing ?? (
            <SidebarSection>
              {current === 'zeichnen' ? <DrawPanel /> : null}
              {current === 'uebersicht' ? <OverviewPanel /> : null}
              {current === 'export' ? <ExportPanel /> : null}
            </SidebarSection>
          ))
        )}
      </SidebarBody>
    </Sidebar>
  )
}
