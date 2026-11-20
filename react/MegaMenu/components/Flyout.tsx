import type { FC } from 'react'
import React from 'react'
import { useCssHandles } from 'vtex.css-handles'
import { ExtensionPoint } from 'vtex.render-runtime'

import type { StorefrontMenuItem } from '../../shared'
import { getVisibleItems } from '../utils'
import { MenuLink } from './MenuLink'

const CSS_HANDLES = [
  'submenuContainer',
  'submenuPanel',
  'submenuContainerTitle',
  'submenuTitleLink',
  'submenuBody',
  'submenuList',
  'submenuItem',
  'submenuItemTitle',
  'submenuSubList',
  'submenuSubItem',
  'submenuLink',
  'menuItemBadge',
  'submenuSkeleton',
  'departmentBannerContainer',
  'departmentBanner',
] as const

interface FlyoutProps {
  id: string
  department: StorefrontMenuItem
  /** Same department from the full tree, null while it loads. */
  tree: StorefrontMenuItem | null
  /** Rendered for its links but not shown (inactive homepage panels). */
  hidden?: boolean
}

const Flyout: FC<FlyoutProps> = ({ id, department, tree, hidden = false }) => {
  const { handles } = useCssHandles(CSS_HANDLES)
  const categories = tree ? getVisibleItems(tree.menu) : []

  const banner = tree?.banner ? (
    <img
      className={handles.departmentBanner}
      src={tree.banner}
      // Inside the banner link the image is the link's only content, so it
      // names it; on its own it is decorative
      alt={tree.linkBanner ? department.name : ''}
      loading="lazy"
      decoding="async"
    />
  ) : null

  return (
    <div className={handles.submenuContainer} id={id} hidden={hidden}>
      <div className={handles.submenuPanel}>
        <div className={handles.submenuContainerTitle}>
          <MenuLink item={department} className={handles.submenuTitleLink} />
        </div>
        <div className={handles.submenuBody}>
          {tree ? (
            <>
              {!hidden && <ExtensionPoint id="before-menu" />}
              <ul className={handles.submenuList}>
                {categories.map((category) => {
                  const subcategories = getVisibleItems(category.menu)

                  return (
                    <li key={category.id} className={handles.submenuItem}>
                      <MenuLink
                        item={category}
                        className={handles.submenuItemTitle}
                      />
                      {subcategories.length > 0 && (
                        <ul className={handles.submenuSubList}>
                          {subcategories.map((sub) => (
                            <li key={sub.id} className={handles.submenuSubItem}>
                              <MenuLink
                                item={sub}
                                className={handles.submenuLink}
                              >
                                {sub.name}
                                {sub.optionalText && (
                                  <span className={handles.menuItemBadge}>
                                    {sub.optionalText}
                                  </span>
                                )}
                              </MenuLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
              {!hidden && <ExtensionPoint id="after-menu" />}
            </>
          ) : (
            <div className={handles.submenuSkeleton} aria-hidden="true" />
          )}
          {banner && (
            <div className={handles.departmentBannerContainer}>
              {tree?.linkBanner ? (
                <a href={tree.linkBanner} target="_blank" rel="noreferrer">
                  {banner}
                </a>
              ) : (
                banner
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Flyout
