import type {
  FC,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
} from 'react'
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { applyModifiers, useCssHandles } from 'vtex.css-handles'

import type { StorefrontMenuItem } from '../../shared'
import { useMenuTree } from '../hooks/useMenuData'
import { getVisibleItems, toDomId } from '../utils'
import Flyout from './Flyout'
import { MenuIcon, MenuLink } from './MenuLink'

const CSS_HANDLES = [
  'menuNav',
  'menuList',
  'menuItem',
  'menuLink',
  'menuItemIcon',
  'menuItemLabel',
  'menuItemChevron',
] as const

type Handles = Record<typeof CSS_HANDLES[number], string>

// Hover intent: the open delay keeps diagonal moves towards the panel from
// switching departments.
const OPEN_DELAY = 120
const CLOSE_DELAY = 200
// Focus fired by a pointer press arrives within this window.
const POINTER_FOCUS_WINDOW = 800

interface DepartmentItemProps {
  department: StorefrontMenuItem
  isActive: boolean
  hasChildren: boolean
  handles: Handles
  onEnter: (id: string, pointerType: string) => void
  onFocusItem: (id: string) => void
  onLinkClick: (
    id: string,
    canOpen: boolean,
    event: MouseEvent<HTMLAnchorElement>
  ) => void
  children?: ReactNode
}

const DepartmentItem = memo(function DepartmentItem({
  department,
  isActive,
  hasChildren,
  handles,
  onEnter,
  onFocusItem,
  onLinkClick,
  children,
}: DepartmentItemProps) {
  return (
    <li
      className={applyModifiers(handles.menuItem, isActive ? 'active' : [])}
      onPointerEnter={(event) => onEnter(department.id, event.pointerType)}
    >
      <MenuLink
        item={department}
        className={handles.menuLink}
        onFocus={() => onFocusItem(department.id)}
        onClick={(event) =>
          onLinkClick(department.id, hasChildren && !isActive, event)
        }
      >
        <MenuIcon item={department} className={handles.menuItemIcon} />
        <span className={handles.menuItemLabel}>{department.name}</span>
        {hasChildren && (
          <span className={handles.menuItemChevron} aria-hidden="true" />
        )}
      </MenuLink>
      {children}
    </li>
  )
})

interface DepartmentNavProps {
  departments: StorefrontMenuItem[]
  variant: 'embedded' | 'overlay'
  title?: string
  initialActiveId?: string | null
  excludeSlugs?: string[]
  /** Request the full tree on mount instead of on first hover or focus. */
  loadTreeOnMount?: boolean
  /** Render every department's panel, hidden unless active (needs the tree). */
  renderAllPanels?: boolean
  onNavigate?: () => void
}

const DepartmentNav: FC<DepartmentNavProps> = ({
  departments,
  variant,
  title,
  initialActiveId = null,
  excludeSlugs,
  loadTreeOnMount = false,
  renderAllPanels = false,
  onNavigate,
}) => {
  const { handles } = useCssHandles(CSS_HANDLES)
  const [activeId, setActiveId] = useState<string | null>(initialActiveId)
  const [treeRequested, setTreeRequested] = useState(loadTreeOnMount)
  const openTimer = useRef<number>()
  const closeTimer = useRef<number>()
  const lastPointerType = useRef<string>('mouse')
  const lastPointerDownAt = useRef(0)
  const navRef = useRef<HTMLElement>(null)
  const isPanelOpen = activeId !== null

  const { data: treeData } = useMenuTree(excludeSlugs, treeRequested)

  const clearTimers = () => {
    window.clearTimeout(openTimer.current)
    window.clearTimeout(closeTimer.current)
  }

  useEffect(() => clearTimers, [])

  // Touch and keyboard users never fire pointerleave, so close on a tap outside.
  useEffect(() => {
    if (!isPanelOpen) {
      return undefined
    }

    const onPointerDown = (event: Event) => {
      if (navRef.current?.contains(event.target as Node)) {
        return
      }

      clearTimers()
      setActiveId(null)
    }

    document.addEventListener('pointerdown', onPointerDown)

    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isPanelOpen])

  // On touch the first tap opens the panel and the second follows the link.
  const handleLinkClick = useCallback(
    (id: string, canOpen: boolean, event: MouseEvent<HTMLAnchorElement>) => {
      if (lastPointerType.current !== 'touch' || !canOpen) {
        return
      }

      event.preventDefault()
      window.clearTimeout(openTimer.current)
      setTreeRequested(true)
      setActiveId(id)
    },
    []
  )

  const handleEnter = useCallback((id: string, pointerType: string) => {
    window.clearTimeout(closeTimer.current)
    lastPointerType.current = pointerType

    if (pointerType === 'touch') {
      return
    }

    window.clearTimeout(openTimer.current)
    openTimer.current = window.setTimeout(() => setActiveId(id), OPEN_DELAY)
  }, [])

  const handleFocusItem = useCallback((id: string) => {
    if (Date.now() - lastPointerDownAt.current < POINTER_FOCUS_WINDOW) {
      return
    }

    window.clearTimeout(openTimer.current)
    setTreeRequested(true)
    setActiveId(id)
  }, [])

  const requestTree = () => setTreeRequested(true)

  const handlePointerDown = (event: PointerEvent) => {
    lastPointerType.current = event.pointerType
    lastPointerDownAt.current = Date.now()
  }

  const handleNavEnter = () => {
    window.clearTimeout(closeTimer.current)
    requestTree()
  }

  const handleNavLeave = (event: PointerEvent) => {
    // Touch pointers leave right after every tap.
    if (event.pointerType === 'touch') {
      return
    }

    window.clearTimeout(openTimer.current)
    closeTimer.current = window.setTimeout(() => setActiveId(null), CLOSE_DELAY)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return
    }

    clearTimers()
    setActiveId(null)
  }

  const handleClick = (event: MouseEvent) => {
    // A prevented click is a first tap on touch, which keeps the panel open.
    if (event.defaultPrevented || !(event.target as Element).closest?.('a')) {
      return
    }

    clearTimers()
    setActiveId(null)
    onNavigate?.()
  }

  const rows = useMemo(() => {
    const treeById = new Map<string, StorefrontMenuItem>()

    treeData?.menus?.forEach((item) => item && treeById.set(item.id, item))

    return departments.map((department) => {
      // Departments taken from the tree already carry their categories.
      const tree =
        treeById.get(department.id) ?? (department.menu ? department : null)

      return {
        department,
        tree,
        // Assume children until the tree loads so the chevron does not pop in.
        hasChildren: tree ? getVisibleItems(tree.menu).length > 0 : true,
        panelId: toDomId(`mega-menu-${variant}`, department.id),
      }
    })
  }, [departments, treeData, variant])

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <nav
      ref={navRef}
      className={applyModifiers(handles.menuNav, variant)}
      aria-label={title}
      onPointerDown={handlePointerDown}
      onPointerEnter={handleNavEnter}
      onPointerLeave={handleNavLeave}
      onFocus={requestTree}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
    >
      <ul className={handles.menuList}>
        {rows.map(({ department, tree, hasChildren, panelId }) => {
          const isActive = department.id === activeId

          return (
            <DepartmentItem
              key={department.id}
              department={department}
              isActive={isActive}
              hasChildren={hasChildren}
              handles={handles}
              onEnter={handleEnter}
              onFocusItem={handleFocusItem}
              onLinkClick={handleLinkClick}
            >
              {hasChildren && (isActive || renderAllPanels) && (
                <Flyout
                  id={panelId}
                  department={department}
                  tree={tree}
                  hidden={!isActive}
                />
              )}
            </DepartmentItem>
          )
        })}
      </ul>
    </nav>
  )
}

export default DepartmentNav
