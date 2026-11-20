import { useEffect, useState } from 'react'
import { useApolloClient } from 'react-apollo'
import { canUseDOM } from 'vtex.render-runtime'

export interface MenuState {
  isOverlayOpen: boolean
  /** null until the homepage list reports its visibility */
  embeddedInView: boolean | null
}

const INITIAL_STATE: MenuState = {
  isOverlayOpen: false,
  embeddedInView: null,
}

export interface MenuStore {
  get: () => MenuState
  set: (partial: Partial<MenuState>) => void
  subscribe: (listener: () => void) => () => void
  setTrigger: (element: HTMLElement | null) => void
  focusTrigger: () => void
}

const createMenuStore = (): MenuStore => {
  let state = INITIAL_STATE
  const listeners = new Set<() => void>()
  let triggerElement: HTMLElement | null = null

  return {
    get: () => state,
    set(partial) {
      const next = { ...state, ...partial }

      if (
        next.isOverlayOpen === state.isOverlayOpen &&
        next.embeddedInView === state.embeddedInView
      ) {
        return
      }

      state = next
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    setTrigger(element) {
      triggerElement = element
    },
    focusTrigger() {
      triggerElement?.focus()
    },
  }
}

// The header blocks and the homepage list share no parent block, so no
// provider can wrap them all. In the browser they share one store through the
// page's Apollo client, which render-runtime provides through React context.
const storesByClient = new WeakMap<
  ReturnType<typeof useApolloClient>,
  MenuStore
>()

export const useMenuStoreApi = (): MenuStore => {
  const client = useApolloClient()

  // render-runtime keeps the Apollo client in module state, per account and
  // workspace, so on the server it may outlive a request. A server render
  // gets a store of its own and never reads or writes the map above.
  if (!canUseDOM) {
    return createMenuStore()
  }

  let store = storesByClient.get(client)

  if (!store) {
    store = createMenuStore()
    storesByClient.set(client, store)
  }

  return store
}

// Only handlers and effects mutate the store, so the server always renders
// the initial state.
export function useMenuStore<T>(selector: (current: MenuState) => T): T {
  const store = useMenuStoreApi()
  // Initial state, not the live one, so a late-hydrating block matches SSR.
  const [value, setValue] = useState(() => selector(INITIAL_STATE))

  useEffect(() => {
    const sync = () => setValue(selector(store.get()))

    sync()

    return store.subscribe(sync)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store])

  return value
}
