import { ArrowPathIcon } from '@heroicons/react/20/solid'
import { Button } from '@shared/components/ui/button'
import { useDataset, useReload } from '@/data/use-data'
import { formatStamp } from '@/stats/format'

/** "Stand: …" of the done marks and the button to load everything again. */
export function ReloadButton() {
  const { progress } = useDataset()
  const reload = useReload()
  const loadedAt = progress.data?.loadedAt
  return (
    <div className="flex items-center gap-2">
      {loadedAt ? (
        <span className="hidden text-xs text-zinc-400 sm:inline" data-testid="stand">
          Stand: {formatStamp(loadedAt)}
        </span>
      ) : null}
      <Button
        outline
        onClick={() => reload.mutate()}
        disabled={reload.isPending}
        data-testid="reload"
      >
        <ArrowPathIcon data-slot="icon" className={reload.isPending ? 'animate-spin' : undefined} />
        Neu laden
      </Button>
    </div>
  )
}
