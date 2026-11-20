import type { RefObject } from 'react'
import { useEffect } from 'react'

import { useMenuStoreApi } from '../store'

/**
 * Reports whether the homepage list is visible below the sticky header. Off
 * while the list is not rendered, so the header button opens the overlay.
 */
export const useEmbeddedInView = (
  ref: RefObject<HTMLElement>,
  headerOffset: number,
  enabled: boolean
) => {
  const store = useMenuStoreApi()

  useEffect(() => {
    const element = ref.current

    if (!enabled || !element || typeof IntersectionObserver === 'undefined') {
      return undefined
    }

    const observer = new IntersectionObserver(
      // Entries are queued oldest first; the last one is the current state
      (entries) =>
        store.set({
          embeddedInView: entries[entries.length - 1].isIntersecting,
        }),
      { rootMargin: `-${Math.max(0, headerOffset)}px 0px 0px 0px` }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
      store.set({ embeddedInView: null })
    }
  }, [ref, headerOffset, enabled, store])
}
