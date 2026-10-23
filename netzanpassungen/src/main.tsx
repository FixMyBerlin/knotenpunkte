import { StreetImageryLocaleProvider } from '@osm-editor-kit/street-imagery-react'
import { KvClientProvider } from '@shared/kv/kv-context'
import { routerSearch } from '@shared/routing/router-search'
import { viteBaseToRouterBasepath } from '@shared/site-base'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import '@shared/mapillary/setup'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { kv } from '@/network/store'
import { routeTree } from './routeTree.gen'
import './app.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
})

const router = createRouter({
  routeTree,
  basepath: viteBaseToRouterBasepath(import.meta.env.BASE_URL),
  trailingSlash: 'never',
  parseSearch: routerSearch.parse,
  stringifySearch: routerSearch.stringify,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <KvClientProvider client={kv}>
        <StreetImageryLocaleProvider locale="de">
          <RouterProvider router={router} />
        </StreetImageryLocaleProvider>
      </KvClientProvider>
    </QueryClientProvider>
  </StrictMode>,
)
