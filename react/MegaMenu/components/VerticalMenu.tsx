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
import { useRenderSession } from 'vtex.session-client'
import { IconCaret } from 'vtex.store-icons'
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
  'styledLinkContainer',
  'styledLink',
  'styledLinkContent',
  'styledLinkText',
  'accordionIconContainer',
  'accordionIcon',
  'contButtonsContainer',
  'contButtonPrimary',
  'contButtonOutlined',
  'contMenuList',
  'contMenuItem',
  'contMenuItemIcon',
  'contMenuItemText',
] as const

const ACCOUNT_MENU_ITEMS = [
  { label: 'Profil', href: '/account#/profile' },
  { label: 'Adrese', href: '/account#/addresses' },
  { label: 'Comenzi', href: '/account#/orders' },
  { label: 'Companii', href: '/account#/my-companies' },
  { label: 'Schimba parola', href: '/account#/change-password' },
  { label: 'Favorite', href: '/account#/wishlist' },
  { label: 'MyCLUB Auchan', href: '/account#/loyalty' },
  { label: 'Deconectare', href: '/_v/private/logout' },
]

const VerticalMenu: FC<VerticalMenuProps> = observer(({ intl }) => {
  const { handles } = useCssHandles(CSS_HANDLES)
  const { departments, config } = megaMenuState
  const { title } = config
  const { session, loading: sessionLoading } = useRenderSession()

  const isAuthenticated = useMemo(() => {
    if (sessionLoading || !session) return false

    const profileNs = (session as any)?.namespaces?.profile
    const authValue = profileNs?.isAuthenticated?.value

    return authValue === 'true' || authValue === true
  }, [session, sessionLoading])

  const [isContOpen, setIsContOpen] = useState(false)
  const [isProduseOpen, setIsProduseOpen] = useState(false)
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
          <li className={handles.menuItemVertical}>
            <div
              className={handles.styledLinkContainer}
              onClick={() => setIsContOpen((prev) => !prev)}
            >
              <button
                className={classNames(handles.styledLink, 'no-underline c-on-base w-100 pa0 t-body pointer')}
                tabIndex={0}
                type="button"
              >
                <div className={classNames(handles.styledLinkContent, 'flex justify-between')}>
                  <div className={classNames(handles.styledLinkText, 'flex items-center')}>
                    <img
                      className={handles.menuItemIcon}
                      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='32' height='32'%3E%3Cpath d='M17 6.27V4a2 2 0 00-2-2h-4a4 4 0 00-4 4v.27a2 2 0 00.07 3.5A5 5 0 0012 14h.08a4.89 4.89 0 004.86-4.24 2 2 0 00.05-3.49zm-1 2.95c-.003.26-.037.518-.1.77a3.92 3.92 0 01-3.81 3H12a4 4 0 01-3.87-3 3.34 3.34 0 01-.12-.77 1.24 1.24 0 010-2.44V6a3 3 0 013-3h4a1 1 0 011 1v2.78a1.24 1.24 0 010 2.44zM15 17a4 4 0 014 4H5a4 4 0 014-4zm0-1H9a5 5 0 00-5 5v1h16v-1a5 5 0 00-5-5z' fill='%2302182B'/%3E%3C/svg%3E"
                      alt=""
                    />
                    Cont
                  </div>
                  <div
                    className={classNames(handles.accordionIconContainer, isContOpen ? 'accordionIconContainer--isOpen' : 'accordionIconContainer--isClosed', 'ml1 c-muted-3')}
                  >
                    <IconCaret classNames={handles.accordionIcon} orientation="right" />
                  </div>
                </div>
              </button>
            </div>
            {isContOpen && (
              isAuthenticated ? (
                <ul className={classNames(handles.contMenuList, 'list pa0 ma0')}>
                  {ACCOUNT_MENU_ITEMS.map((item) => (
                    <li key={item.href} className={handles.contMenuItem}>
                      <a
                        href={item.href}
                        className={classNames(handles.contMenuItem, 'no-underline flex items-center')}
                      >
                        <span className={handles.contMenuItemText}>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={handles.contButtonsContainer}>
                  <a
                    href="/login"
                    className={classNames(handles.contButtonPrimary, 'no-underline db tc')}
                  >
                    AUTENTIFICARE
                  </a>
                  <a
                    href="/login"
                    className={classNames(handles.contButtonOutlined, 'no-underline db tc')}
                  >
                    CONT NOU
                  </a>
                </div>
              )
            )}
          </li>
          {departments.length ? (
            <li className={handles.menuItemVertical}>
              <div
                className={handles.styledLinkContainer}
                onClick={() => setIsProduseOpen((prev) => !prev)}
              >
                <button
                  className={classNames(handles.styledLink, 'no-underline c-on-base w-100 pa0 t-body pointer')}
                  tabIndex={0}
                  type="button"
                >
                  <div className={classNames(handles.styledLinkContent, 'flex justify-between')}>
                    <div className={classNames(handles.styledLinkText, 'flex items-center')}>
                      <img
                        className={handles.menuItemIcon}
                        src="data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M17.3261 4C19.8713 4.00011 21.9904 5.72007 22.5234 8H22.6562C24.8683 8 26.6542 9.78667 26.6542 12H26.6669L27.9999 24C27.9999 26.2133 26.214 28 24.0019 28H10.6767C8.46459 28 6.67865 26.2133 6.67865 24L8.01068 12C8.01068 9.7867 9.79667 8.00005 12.0087 8H12.1288C12.6486 5.72001 14.7809 4 17.3261 4ZM13.3017 9.32031V11.3066C13.3017 11.68 13.0078 11.9736 12.6347 11.9736C12.2618 11.9734 11.9687 11.6798 11.9687 11.3066V9.33301C10.5029 9.34642 9.31732 10.5334 9.31732 12V12.1465L7.99798 24.0664C8.03796 25.5064 9.2105 26.667 10.663 26.667H23.9892L23.9619 26.6533C25.4142 26.6533 26.5867 25.4935 26.6269 24.0537L25.3085 12.1338V11.9863C25.3083 10.5198 24.1083 9.32031 22.6425 9.32031V11.3066C22.6425 11.68 22.3496 11.9736 21.9765 11.9736C21.6034 11.9736 21.3105 11.6799 21.3105 11.3066V9.32031H13.3017ZM17.3388 13C17.9518 13 18.4984 13.3469 18.7783 13.8936L19.5117 15.3604L21.1767 15.5469H21.204C21.8435 15.6137 22.3768 16.0665 22.5634 16.6797C22.75 17.2929 22.5632 17.9734 22.0702 18.3867L20.831 19.4404L21.1904 21.04C21.297 21.52 21.1775 22.0137 20.871 22.4004C20.5512 22.7737 20.0975 23 19.6044 23C19.3113 23 19.005 22.9197 18.7519 22.7598L17.3525 21.8799L15.9531 22.7598C15.6999 22.9197 15.407 23 15.1005 23C14.6077 23 14.1414 22.7868 13.8349 22.4004C13.5151 22.0137 13.408 21.52 13.5146 21.04L13.8749 19.4404L12.6347 18.3867C12.1418 17.96 11.956 17.2929 12.1425 16.6797C12.3291 16.0667 12.8616 15.6137 13.5009 15.5469L15.1669 15.3604L15.9003 13.8936C16.1668 13.347 16.726 13.0001 17.3388 13ZM17.3525 14.333C17.246 14.333 17.1529 14.3867 17.0995 14.4932L16.0331 16.6133L13.6484 16.8799C13.4087 16.9065 13.3149 17.213 13.5009 17.373L15.3408 18.9463L14.8076 21.333C14.7676 21.5196 14.9137 21.6795 15.0869 21.6797C15.1388 21.6797 15.2288 21.6416 15.2333 21.6396L17.3388 20.3203L19.4443 21.6396C19.4843 21.6663 19.5384 21.6797 19.5917 21.6797C19.7648 21.6794 19.911 21.5195 19.871 21.333L19.3378 18.9463L21.1767 17.373H21.204C21.4034 17.2131 21.297 16.9068 21.0576 16.8799L18.6718 16.6133L17.6054 14.4932C17.5521 14.3867 17.459 14.333 17.3525 14.333ZM4.08002 8.36035C4.25321 8.04042 4.65281 7.90657 4.97259 8.06641L6.15912 8.67969C6.47878 8.85304 6.61186 9.25332 6.45209 9.57324C6.27888 9.89319 5.8793 10.0261 5.55951 9.86621L4.37298 9.25293C4.05341 9.07957 3.92032 8.68024 4.08002 8.36035ZM4.20013 4.2002C4.45333 3.93358 4.87957 3.93355 5.13275 4.2002L7.99798 7.06641C8.25117 7.31974 8.25118 7.74701 7.99798 8.01367C7.74486 8.28022 7.31821 8.26678 7.0517 8.01367L4.20013 5.13379C3.93361 4.88046 3.93361 4.45353 4.20013 4.2002ZM17.3261 5.33301C15.5271 5.33301 14.021 6.46667 13.5146 8H21.1367C20.6303 6.4668 19.125 5.33311 17.3261 5.33301ZM8.43744 4.12012C8.78374 4.00018 9.16983 4.17322 9.28998 4.51953L9.7431 5.77344C9.86304 6.1201 9.69016 6.50695 9.34369 6.62695C8.99723 6.74692 8.61109 6.5732 8.49115 6.22656L8.03802 4.97363C7.9181 4.62699 8.09101 4.24014 8.43744 4.12012Z' fill='%2302182B'/%3E%3C/svg%3E"
                        alt=""
                      />
                      Produse
                    </div>
                    <div
                      className={classNames(handles.accordionIconContainer, isProduseOpen ? 'accordionIconContainer--isOpen' : 'accordionIconContainer--isClosed', 'ml1 c-muted-3')}
                    >
                      <IconCaret classNames={handles.accordionIcon} orientation="right" />
                    </div>
                  </div>
                </button>
              </div>
              {isProduseOpen && (
                <ul className={classNames(handles.menuContainerVertical, 'list')} style={{ padding: 0, margin: 0 }}>
                  {departmentItems}
                </ul>
              )}
            </li>
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
