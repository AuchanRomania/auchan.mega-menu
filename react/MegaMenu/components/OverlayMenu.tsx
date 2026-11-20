import type { FC } from 'react'
import React, { useCallback, useEffect } from 'react'
import { useCssHandles } from 'vtex.css-handles'
import { useRuntime } from 'vtex.render-runtime'

import { useCachedMenuTree, useMenusL1 } from '../hooks/useMenuData'
import { useMenuStore, useMenuStoreApi } from '../store'
import { getVisibleItems } from '../utils'
import DepartmentNav from './DepartmentNav'

const CSS_HANDLES = [
  'menuOverlay',
  'menuOverlayBackdrop',
  'menuOverlayPanel',
  'menuSkeleton',
] as const

interface OverlayMenuProps {
  title?: string
  excludeSlugs?: string[]
  defaultDepartmentActive?: string
}

interface OverlayPanelProps extends OverlayMenuProps {
  onClose: () => void
}

const OverlayPanel: FC<OverlayPanelProps> = ({
  title,
  excludeSlugs,
  defaultDepartmentActive,
  onClose,
}) => {
  const { handles } = useCssHandles(CSS_HANDLES)
  // The trigger prefetches the tree on hover: read the departments from it
  // instead of requesting level 1 again.
  const cachedMenus = useCachedMenuTree(excludeSlugs)
  const { data } = useMenusL1(excludeSlugs, !!cachedMenus)
  const departments = getVisibleItems(cachedMenus ?? data?.menus)
  const defaultName = defaultDepartmentActive?.trim().toLowerCase()
  const initialActiveId = defaultName
    ? departments.find((d) => d.name.trim().toLowerCase() === defaultName)
        ?.id ?? null
    : null

  return (
    <div className={handles.menuOverlay} id="mega-menu-overlay">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className={handles.menuOverlayBackdrop} onClick={onClose} />
      <div className={handles.menuOverlayPanel}>
        {departments.length > 0 ? (
          <DepartmentNav
            departments={departments}
            variant="overlay"
            title={title}
            initialActiveId={initialActiveId}
            excludeSlugs={excludeSlugs}
            loadTreeOnMount
            onNavigate={onClose}
          />
        ) : (
          <div className={handles.menuSkeleton} aria-hidden="true" />
        )}
      </div>
    </div>
  )
}

const OverlayMenu: FC<OverlayMenuProps> = (props) => {
  const store = useMenuStoreApi()
  const isOpen = useMenuStore((s) => s.isOverlayOpen)
  const { history } = useRuntime()
  const close = useCallback(() => store.set({ isOverlayOpen: false }), [store])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        store.focusTrigger()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const unlisten = history?.listen?.(close)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      unlisten?.()
    }
  }, [isOpen, history, close, store])

  return isOpen ? <OverlayPanel {...props} onClose={close} /> : null
}

export default OverlayMenu
