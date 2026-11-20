import type { FC } from 'react'
import React, { useCallback, useState } from 'react'
import { FormattedMessage } from 'react-intl'
import { applyModifiers, useCssHandles } from 'vtex.css-handles'
import { Link } from 'vtex.render-runtime'

import type { StorefrontMenuItem } from '../../shared'
import { useMenuTree } from '../hooks/useMenuData'
import { getHref, getVisibleItems, toDomId } from '../utils'
import { MenuLink } from './MenuLink'

const CSS_HANDLES = [
  'mobileMenu',
  'mobileList',
  'mobileItem',
  'mobileToggle',
  'mobileToggleLabel',
  'mobileChevron',
  'mobileLink',
  'mobilePanel',
  'mobileSubList',
  'mobileSubItem',
  'mobileLeafList',
  'mobileLeafItem',
  'mobileLeafLink',
  'seeAllLink',
  'menuItemBadge',
  'mobileSkeleton',
  'mobileSkeletonRow',
] as const

type Handles = Record<typeof CSS_HANDLES[number], string>

const SKELETON_ROWS = 10

const SeeAll: FC<{ item: StorefrontMenuItem; handles: Handles }> = ({
  item,
  handles,
}) => {
  const href = getHref(item)

  if (!href) {
    return null
  }

  return (
    <Link to={href} className={handles.seeAllLink}>
      <FormattedMessage id="store/mega-menu.submenu.seeAllButton.title" />
    </Link>
  )
}

interface ToggleProps {
  item: StorefrontMenuItem
  isOpen: boolean
  panelId: string
  level: 1 | 2
  handles: Handles
  onToggle: (id: string) => void
}

const Toggle: FC<ToggleProps> = ({
  item,
  isOpen,
  panelId,
  level,
  handles,
  onToggle,
}) => (
  <button
    type="button"
    className={applyModifiers(handles.mobileToggle, [
      `level${level}`,
      isOpen ? 'open' : 'closed',
    ])}
    aria-expanded={isOpen}
    aria-controls={panelId}
    onClick={() => onToggle(item.id)}
  >
    <span className={handles.mobileToggleLabel}>{item.name}</span>
    <span className={handles.mobileChevron} aria-hidden="true" />
  </button>
)

const useToggleSet = () => {
  const [open, setOpen] = useState<string[]>([])
  const toggle = useCallback(
    (id: string) =>
      setOpen((current) =>
        current.includes(id)
          ? current.filter((value) => value !== id)
          : [...current, id]
      ),
    []
  )

  return [open, toggle] as const
}

interface MobileMenuProps {
  title?: string
  excludeSlugs?: string[]
}

const MobileMenu: FC<MobileMenuProps> = ({ title, excludeSlugs }) => {
  const { handles } = useCssHandles(CSS_HANDLES)
  // loading stays true while a failed request is retried
  const { data, loading } = useMenuTree(excludeSlugs, true)
  const [openDepartments, toggleDepartment] = useToggleSet()
  const [openCategories, toggleCategory] = useToggleSet()

  if (!data?.menus) {
    if (!loading) {
      return null
    }

    return (
      <div className={handles.mobileSkeleton} aria-hidden="true">
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <div key={i} className={handles.mobileSkeletonRow} />
        ))}
      </div>
    )
  }

  const departments = getVisibleItems(data.menus)

  return (
    <nav className={handles.mobileMenu} aria-label={title}>
      <ul className={handles.mobileList}>
        {departments.map((department) => {
          const categories = getVisibleItems(department.menu)

          if (!categories.length) {
            return (
              <li key={department.id} className={handles.mobileItem}>
                <MenuLink item={department} className={handles.mobileLink} />
              </li>
            )
          }

          const isOpen = openDepartments.includes(department.id)
          const panelId = toDomId('mega-menu-mobile', department.id)

          return (
            <li
              key={department.id}
              className={applyModifiers(
                handles.mobileItem,
                isOpen ? 'open' : []
              )}
            >
              <Toggle
                item={department}
                isOpen={isOpen}
                panelId={panelId}
                level={1}
                handles={handles}
                onToggle={toggleDepartment}
              />
              {isOpen && (
                <div id={panelId} className={handles.mobilePanel}>
                  <SeeAll item={department} handles={handles} />
                  <ul className={handles.mobileSubList}>
                    {categories.map((category) => {
                      const subcategories = getVisibleItems(category.menu)

                      if (!subcategories.length) {
                        return (
                          <li
                            key={category.id}
                            className={handles.mobileSubItem}
                          >
                            <MenuLink
                              item={category}
                              className={handles.mobileLink}
                            />
                          </li>
                        )
                      }

                      const isCategoryOpen = openCategories.includes(
                        category.id
                      )

                      const categoryPanelId = toDomId(
                        'mega-menu-mobile',
                        category.id
                      )

                      return (
                        <li
                          key={category.id}
                          className={applyModifiers(
                            handles.mobileSubItem,
                            isCategoryOpen ? 'open' : []
                          )}
                        >
                          <Toggle
                            item={category}
                            isOpen={isCategoryOpen}
                            panelId={categoryPanelId}
                            level={2}
                            handles={handles}
                            onToggle={toggleCategory}
                          />
                          {isCategoryOpen && (
                            <div
                              id={categoryPanelId}
                              className={handles.mobilePanel}
                            >
                              <SeeAll item={category} handles={handles} />
                              <ul className={handles.mobileLeafList}>
                                {subcategories.map((sub) => (
                                  <li
                                    key={sub.id}
                                    className={handles.mobileLeafItem}
                                  >
                                    <MenuLink
                                      item={sub}
                                      className={handles.mobileLeafLink}
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
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default MobileMenu
