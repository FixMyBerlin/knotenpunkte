import { UmzugDialog } from './UmzugDialog'
import { useUmzug } from './use-umzug'

/** The move dialog of an app without markings to transfer: only the settings backup, on Pages. */
export function UmzugHost() {
  const umzug = useUmzug(0)
  return <UmzugDialog umzug={umzug} />
}
