import { DatasetPanel } from '@/components/DatasetPanel'
import { ExportPanel } from '@/components/ExportPanel'
import { useAppStepNav } from '@/components/shared/use-app-step-nav'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Sidebar as SidebarNav, SidebarBody, SidebarSection } from '@/components/ui/sidebar'
import { WorkPanel } from '@/components/WorkPanel'

export function AppSidebar() {
  const { dataset, current, hasLocalNodes, goToStep } = useAppStepNav()

  return (
    <SidebarNav className="h-full bg-zinc-900">
      <SidebarBody>
        {current === 'dataset' ? (
          <SidebarSection>
            <DatasetPanel />
          </SidebarSection>
        ) : null}
        {current === 'work' ? (
          !dataset ? (
            <SidebarSection>
              <Callout title="Kein Gebiet">Wähle zuerst ein Gebiet.</Callout>
              <Button
                type="button"
                color="sky"
                className="mt-3"
                onClick={() => goToStep('dataset')}
              >
                Zum Datensatz
              </Button>
            </SidebarSection>
          ) : !hasLocalNodes ? (
            <SidebarSection>
              <Callout title="Keine Knoten">Importiere eine Knoten-Datei.</Callout>
              <Button
                type="button"
                color="sky"
                className="mt-3"
                onClick={() => goToStep('dataset')}
              >
                Zum Datensatz
              </Button>
            </SidebarSection>
          ) : (
            <SidebarSection>
              <WorkPanel />
            </SidebarSection>
          )
        ) : null}
        {current === 'export' ? (
          !dataset ? (
            <SidebarSection>
              <Callout title="Kein Gebiet">Wähle zuerst ein Gebiet.</Callout>
              <Button
                type="button"
                color="sky"
                className="mt-3"
                onClick={() => goToStep('dataset')}
              >
                Zum Datensatz
              </Button>
            </SidebarSection>
          ) : (
            <SidebarSection>
              <ExportPanel />
            </SidebarSection>
          )
        ) : null}
      </SidebarBody>
    </SidebarNav>
  )
}
