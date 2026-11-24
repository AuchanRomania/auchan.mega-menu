import type { FC } from 'react'
import React, { useRef } from 'react'
import { useCssHandles } from 'vtex.css-handles'

import { useEmbeddedInView } from '../hooks/useEmbeddedInView'
import { useMenuTree } from '../hooks/useMenuData'
import { getVisibleItems } from '../utils'
import DepartmentNav from './DepartmentNav'

const CSS_HANDLES = ['menuEmbedded', 'menuSkeleton'] as const

interface EmbeddedMenuProps {
  title?: string
  excludeSlugs?: string[]
  headerOffset: number
}

/**
 * Always-open homepage list. The whole tree is server-rendered, with every
 * department's panel hidden until hover, so all menu links are in the first
 * HTML for crawlers; the header overlay on this page reads the same cache.
 */
const EmbeddedMenu: FC<EmbeddedMenuProps> = ({
  title,
  excludeSlugs,
  headerOffset,
}) => {
  const { handles } = useCssHandles(CSS_HANDLES)
  const { data } = useMenuTree(excludeSlugs, true, true)
  const ref = useRef<HTMLDivElement>(null)
  const departments = getVisibleItems(data?.menus)

  useEmbeddedInView(ref, headerOffset, departments.length > 0)

  return (
    <div ref={ref} className={handles.menuEmbedded}>
      {departments.length > 0 ? (
        <DepartmentNav
          departments={departments}
          variant="embedded"
          title={title}
          excludeSlugs={excludeSlugs}
          renderAllPanels
        />
      ) : (
        !data?.menus && (
          <div className={handles.menuSkeleton} aria-hidden="true" />
        )
      )}
    </div>
  )
}

export default EmbeddedMenu
