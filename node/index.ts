import type { ClientsConfig, RecorderState } from '@vtex/api'
import { LRUCache, Service } from '@vtex/api'

import { resolvers } from './resolvers'
import { Clients } from './clients'
import middlewares from './middlewares'


const TIMEOUT_MS = 2 * 1000
const THREE_SECONDS_MS = 3 * 1000
const MAX_TTL = 1000 * 60 * 10 // 10 minutes
/* Maybe move those in an .env file */
// Create a LRU memory cache for the Status client.
// The @vtex/api HttpClient respects Cache-Control headers and uses the provided cache.
const memoryCache = new LRUCache<string, any>({ max: 5000 })

metrics.trackCache('status', memoryCache)

const menuListCache = new LRUCache<string, any>({
  max: 10,
  maxAge: MAX_TTL,
  ttl: MAX_TTL,
})

// This is the configuration for clients available in `ctx.clients`.
const clients: ClientsConfig<Clients> = {
  // We pass our custom implementation of the clients bag, containing the Status client.
  implementation: Clients,
  options: {
    // All IO Clients will be initialized with these options, unless otherwise specified.
    default: {
      retries: 2,
      timeout: TIMEOUT_MS,
    },
    // This key will be merged with the default options and add this cache to our Status client.
    status: {
      memoryCache,
    },
    menuList: {
      timeout: THREE_SECONDS_MS,
      memoryCache: menuListCache
    }
  }
}

declare global {
  // The shape of our State object found in `ctx.state`. This is used as state bag to communicate between middlewares.
  interface State extends RecorderState {
    code: number
  }
}

// Export a service that defines resolvers and clients options
export default new Service({
  clients,
  graphql: {
    resolvers,
  },
  routes: {
    ...middlewares
  },
})
