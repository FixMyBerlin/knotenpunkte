import { UmzugDialog } from '@shared/umzug/UmzugDialog'
import { useUmzug } from '@shared/umzug/use-umzug'
import { KeineAktionTransfer } from '@/components/KeineAktionTransfer'
import { browserStorage, countLocalKeineAktion } from '@/network/keine-aktion'

/**
 * The move dialog of Netzanpassungen. It opens at start while "Keine Aktion nötig" markings wait in
 * localStorage (transfer after the login) and, on the old Pages origin, to download the settings.
 */
export function NetzUmzug() {
  const umzug = useUmzug(countLocalKeineAktion(browserStorage()))
  return <UmzugDialog umzug={umzug} transfer={<KeineAktionTransfer />} />
}
