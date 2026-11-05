import { ArrowPathIcon } from '@heroicons/react/20/solid'
import { Button } from '@shared/components/ui/button'
import { useReload } from '@/data/use-data'

/** Loads the network and the done marks again (the "Daten" part of the sidebar shows when). */
export function ReloadButton() {
  const reload = useReload()
  return (
    <Button
      outline
      onClick={() => reload.mutate()}
      disabled={reload.isPending}
      data-testid="reload"
    >
      <ArrowPathIcon data-slot="icon" className={reload.isPending ? 'animate-spin' : undefined} />
      Neu laden
    </Button>
  )
}
