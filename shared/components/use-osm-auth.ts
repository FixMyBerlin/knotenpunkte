import { isOsmLoginConfigured } from '@shared/config/shared.const'
import { useKvClient } from '@shared/kv/kv-context'
import { loginWithOsm, logoutOsm, waitForOsmAuth } from '@shared/osm/osm-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

function stripOauthParamsFromUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  url.searchParams.delete('error')
  url.searchParams.delete('error_description')
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

export function useOsmAuth() {
  const queryClient = useQueryClient()
  const kv = useKvClient()
  const authQuery = useQuery({
    queryKey: ['osm-session'],
    queryFn: waitForOsmAuth,
  })
  const loggedIn = authQuery.data === true

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => kv.me(),
    enabled: loggedIn,
  })

  useEffect(
    function stripOauthParamsFromUrlAfterAuthReady() {
      if (!authQuery.isSuccess) return
      const url = new URL(window.location.href)
      if (
        !url.searchParams.has('code') &&
        !url.searchParams.has('state') &&
        !url.searchParams.has('error')
      ) {
        return
      }
      stripOauthParamsFromUrl()
    },
    [authQuery.isSuccess],
  )

  return {
    configured: isOsmLoginConfigured(),
    authenticated: loggedIn,
    displayName: meQuery.data?.user.display_name,
    canWrite: meQuery.data?.can_write,
    login: () => {
      loginWithOsm()
    },
    logout: () => {
      void kv
        .forget()
        .catch(() => undefined)
        .then(() => {
          logoutOsm()
          void queryClient.invalidateQueries({ queryKey: ['osm-session'] })
          void queryClient.invalidateQueries({ queryKey: ['me'] })
        })
    },
  }
}
