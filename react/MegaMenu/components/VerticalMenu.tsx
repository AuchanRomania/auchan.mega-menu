import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import type { FC } from 'react'
import React, { useState, useMemo, useCallback } from 'react'
import type { InjectedIntlProps } from 'react-intl'
import { injectIntl } from 'react-intl'
import Skeleton from 'react-loading-skeleton'
import { useCssHandles } from 'vtex.css-handles'
import { formatIOMessage } from 'vtex.native-types'
import { Link } from 'vtex.render-runtime'
import { Collapsible } from 'vtex.styleguide'

import type { MenuItem } from '../../shared'
import { megaMenuState } from '../State'
import Item from './Item'

const CSS_HANDLES = [
  'menuContainerVertical',
  'departmentsContainer',
  'menuContainerNavVertical',
  'menuItemVertical',
  'submenuContainerVertical',
  'departmentsTitle',
  'accordionCategoriesContainer',
  'submenuItemVertical',
  'submenuItem',
  'seeAllLinkContainer',
  'seeAllLink',
  'collapsibleContent',
  'collapsibleHeaderText',
  'submenuVerticalNameContainer',
  'menuItemIcon',
] as const

const VerticalMenu: FC<VerticalMenuProps> = observer(({ intl }) => {
  const { handles } = useCssHandles(CSS_HANDLES)
  const { departments, config } = megaMenuState
  const { title } = config

  // Track which department is expanded (null = none)
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null)
  // Track which categories are expanded within the active department
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({})

  const toggleDepartment = useCallback(
    (deptId: string) => {
      if (expandedDeptId === deptId) {
        setExpandedDeptId(null)
        setExpandedCategories({})
      } else {
        setExpandedDeptId(deptId)
        setExpandedCategories({})
      }
    },
    [expandedDeptId]
  )

  const toggleCategory = useCallback(
    (catId: string, isOpen: boolean) => {
      setExpandedCategories((prev) => ({
        ...prev,
        [catId]: isOpen,
      }))
    },
    []
  )

  const departmentItems = useMemo(
    () =>
      departments
        .filter((d) => d.display)
        .map((d, i) => {
          const hasCategories = !!d.menu?.length
          const isExpanded = expandedDeptId === d.id

          return (
            <li
              className={classNames(handles.menuItemVertical)}
              key={d.id}
            >
              {hasCategories ? (
                <>
                  <Item
                    id={d.id}
                    iconId={d.icon}
                    accordion
                    tabIndex={i}
                    onClick={() => toggleDepartment(d.id)}
                    style={d.styles}
                    enableStyle={d.enableSty}
                    uploadedIcon={d.uploadedIcon}
                    isCollection={d.isCollection}
                  >
                    {d.name}
                  </Item>

                  {isExpanded && (
                    <div
                      className={classNames(
                        handles.accordionCategoriesContainer,
                        'w-100'
                      )}
                    >
                      {d.menu
                        ?.filter((cat: MenuItem) => cat.display)
                        .map((category: MenuItem) => {
                          const hasSubcategories = !!category.menu?.length
                          const isCatOpen =
                            expandedCategories[category.id] || false

                          if (hasSubcategories) {
                            return (
                              <div
                                key={category.id}
                                className={classNames(
                                  handles.submenuItemVertical
                                )}
                              >
                                <Collapsible
                                  header={
                                    <div
                                      className={handles.submenuVerticalNameContainer}
                                    >
                                      {category.uploadedIcon && (
                                        <img
                                          className={handles.menuItemIcon}
                                          src={category.uploadedIcon}
                                          alt=""
                                        />
                                      )}
                                      <p
                                        className={classNames(
                                          handles.collapsibleHeaderText,
                                          isCatOpen && 'fw7'
                                        )}
                                      >
                                        {category.name}
                                      </p>
                                    </div>
                                  }
                                  align="right"
                                  onClick={(e: any) =>
                                    toggleCategory(
                                      category.id,
                                      e.target.isOpen
                                    )
                                  }
                                  isOpen={isCatOpen}
                                  caretColor="muted"
                                >
                                  <div className={handles.collapsibleContent}>
                                    <div
                                      className={classNames(
                                        handles.seeAllLinkContainer,
                                        't-body'
                                      )}
                                    >
                                      <Link
                                        to={
                                          category.isCollection
                                            ? category.slug
                                            : `${category.slug}/c`
                                        }
                                        className={classNames(
                                          handles.seeAllLink,
                                          'link underline fw7 c-on-base'
                                        )}
                                      >
                                        Vezi toate produsele
                                      </Link>
                                    </div>

                                    {category.menu
                                      ?.filter((sub: MenuItem) => sub.display)
                                      .map((sub: MenuItem) => (
                                        <div
                                          key={sub.id}
                                          className={classNames(
                                            handles.submenuItem,
                                            'mt3'
                                          )}
                                        >
                                          <Item
                                            to={sub.slug}
                                            iconId={sub.icon}
                                            level={3}
                                            style={sub.styles}
                                            enableStyle={sub.enableSty}
                                            uploadedIcon={sub.uploadedIcon}
                                            isCollection={sub.isCollection}
                                            optionalText={sub.optionalText}
                                          >
                                            {sub.name}
                                          </Item>
                                        </div>
                                      ))}
                                  </div>
                                </Collapsible>
                              </div>
                            )
                          }

                          return (
                            <div
                              key={category.id}
                              className={classNames(
                                handles.submenuItemVertical
                              )}
                            >
                              <Link
                                to={
                                  category.isCollection
                                    ? category.slug
                                    : `${category.slug}/c`
                                }
                                style={{ textDecoration: 'none' }}
                              >
                                <div
                                  className={handles.submenuVerticalNameContainer}
                                >
                                  {category.uploadedIcon && (
                                    <img
                                      className={handles.menuItemIcon}
                                      src={category.uploadedIcon}
                                      alt=""
                                    />
                                  )}
                                  <p
                                    className={classNames(
                                      handles.collapsibleHeaderText
                                    )}
                                  >
                                    {category.name}
                                  </p>
                                </div>
                              </Link>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </>
              ) : (
                <Item
                  id={d.id}
                  to={d.slug}
                  iconId={d.icon}
                  tabIndex={i}
                  style={d.styles}
                  enableStyle={d.enableSty}
                  uploadedIcon={d.uploadedIcon}
                  isCollection={d.isCollection}
                >
                  {d.name}
                </Item>
              )}
            </li>
          )
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [departments, expandedDeptId, expandedCategories]
  )

  return departmentItems?.length > 0 ? (
    <nav className={handles.menuContainerNavVertical}>
      <div className={handles.departmentsContainer}>
        <div
          className={handles.departmentsTitle}
        >
          {formatIOMessage({ id: title, intl })}
        </div>
        <ul className={classNames(handles.menuContainerVertical, 'list')}>
          {departments.length ? (
            departmentItems
          ) : (
            <div className="flex flex-column justify-center ph5 lh-copy">
              <Skeleton count={4} height={40} />
            </div>
          )}
        </ul>
      </div>
    </nav>
  ) : null
})

type VerticalMenuProps = InjectedIntlProps

export default injectIntl(VerticalMenu)
