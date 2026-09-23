import { addProtocol, removeProtocol } from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import { useEffect } from 'react'

export function usePmtilesProtocol() {
  useEffect(function registerPmtilesProtocolOnMount() {
    const protocol = new Protocol()
    addProtocol('pmtiles', protocol.tile)
    return function removePmtilesProtocolOnUnmount() {
      removeProtocol('pmtiles')
    }
  }, [])
}
