import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import type { FC } from 'react'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import type { InjectedIntlProps } from 'react-intl'
import { injectIntl } from 'react-intl'
import Skeleton from 'react-loading-skeleton'
import { useCssHandles } from 'vtex.css-handles'
import { formatIOMessage } from 'vtex.native-types'
import _debounce from 'lodash/debounce'

import type { MenuItem } from '../../shared'
import { megaMenuState } from '../State'
import styles from '../styles.css'
import Item from './Item'
import Submenu from './Submenu'
import { BUTTON_ID } from './TriggerButton'

const CSS_HANDLES = [
  'menuContainer',
  'menuContainerNav',
  'menuItem',
  'submenuContainer',
  'departmentsTitle',
  'departmentActive',
] as const

const HorizontalMenu: FC<InjectedIntlProps> = observer(({ intl }) => {
  const { handles } = useCssHandles(CSS_HANDLES)
  const {
    isOpenMenu,
    isHomePage,
    departments,
    departmentActive,
    config: { title, defaultDepartmentActive },
    setDepartmentActive,
    openMenu,
  } = megaMenuState

  const departmentActiveHasCategories = !!departmentActive?.menu?.length
  const navRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const outerRow = document.querySelector('[class*="flexRow--megaMenuContainer"]') as HTMLElement
    const contentRow = document.querySelector('[class*="flexRowContent--megaMenuContainer"]') as HTMLElement
    const headerWrapper =
      (document.querySelector('[class*="wrapper--headerDesktop"]') as HTMLElement) ??
      (document.querySelector('[class*="stickyLayout--headerDesktop"]') as HTMLElement)

    if (outerRow) {
      if (!isOpenMenu) {
        outerRow.style.display = 'none'
      } else {
        outerRow.style.display = ''

        if (!isHomePage) {
          const headerHeight = headerWrapper ? headerWrapper.getBoundingClientRect().height : 0
          outerRow.style.position = 'fixed'
          outerRow.style.left = '0'
          outerRow.style.right = '0'
          outerRow.style.bottom = '0'
          outerRow.style.top = `${headerHeight}px`
          outerRow.style.zIndex = '999'
          outerRow.style.background = '#fff'
          outerRow.style.overflow = 'auto'
        } else {
          outerRow.style.position = ''
          outerRow.style.left = ''
          outerRow.style.right = ''
          outerRow.style.bottom = ''
          outerRow.style.top = ''
          outerRow.style.zIndex = ''
          outerRow.style.background = ''
          outerRow.style.overflow = ''
        }
      }
    }

    if (contentRow && !isHomePage) {
      contentRow.style.height = isOpenMenu ? 'auto' : ''
    } else if (contentRow) {
      contentRow.style.height = ''
    }

    const bannerCols = document.querySelectorAll('[class*="bannerCol"]')

    bannerCols.forEach((el) => {
      ;(el as HTMLElement).style.display = isHomePage ? '' : 'none'
    })
  }, [isOpenMenu, isHomePage])

  const debouncedHandleMouseEnter = useCallback(
    _debounce((department: MenuItem | null) => {
      setDepartmentActive(department)
    }, 400),
    []
  )

  const handleOnMouseLeave = () => {
    debouncedHandleMouseEnter.cancel()
  }

  const handleNavMouseLeave = () => {
    debouncedHandleMouseEnter.cancel()
    setDepartmentActive(null)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!megaMenuState.isOpenMenu) return

      const target = e.target as HTMLElement

      if (containerRef.current?.contains(target)) return

      const triggerBtn = document.querySelector(
        `[data-id="${BUTTON_ID}"]`
      )

      if (triggerBtn?.contains(target)) return

      if (megaMenuState.isHomePage) {
        megaMenuState.setDepartmentActive(null)
      } else {
        megaMenuState.openMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const defaultDepartment = departments.find(
      (x) =>
        x.name.toLowerCase().trim() ===
        defaultDepartmentActive?.toLowerCase().trim()
    )

    if (defaultDepartment) {
      setDepartmentActive(defaultDepartment)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultDepartmentActive])

  const departmentItems = useMemo(
    () =>
      departments
        .filter((j) => j.display)
        .map((d) => {
          const hasCategories = !!d.menu?.length

          return (
            <li
              className={classNames(
                handles.menuItem,
                d.id === departmentActive?.id &&
                  `bg-black-05 ${handles.departmentActive}`
              )}
              key={d.id}
              onMouseEnter={() => {
                debouncedHandleMouseEnter(d)
              }}
              onMouseLeave={handleOnMouseLeave}
            >
              <Item
                id={d.id}
                to={d.slug}
                iconId={d.icon}
                accordion={hasCategories}
                style={d.styles}
                enableStyle={d.enableSty}
                closeMenu={openMenu}
                uploadedIcon={d.uploadedIcon}
                isCollection={d.isCollection}
              >
                {d.name}
              </Item>
            </li>
          )
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [departments, departmentActive]
  )

  const loaderBlocks = useMemo(() => {
    const blocks: JSX.Element[] = []

    for (let index = 1; index <= 4; index++) {
      blocks.push(
        <div className="lh-copy">
          <Skeleton height={20} />
          <Skeleton height={80} />
        </div>
      )
    }

    return blocks
  }, [])

  return departmentItems?.length > 0 ? (
    <div ref={containerRef} style={{ display: isOpenMenu ? 'block' : 'none' }}>
      <nav
        className={classNames(
          handles.menuContainerNav,
          'absolute left-0 bw1 bb b--muted-3 flex'
        )}
        ref={navRef}
        onMouseLeave={handleNavMouseLeave}
      >
        <ul
          className={classNames(
            styles.menuContainer,
            'list ma0 pa0 pb3 br b--muted-4'
          )}
        >
          <div
            className={classNames(
              handles.departmentsTitle,
              'f4 fw7 c-on-base lh-copy ma0 pv5 ph5'
            )}
          >
            {formatIOMessage({ id: title, intl })}
          </div>
          {departments.length ? (
            departmentItems
          ) : (
            <div className="flex flex-column justify-center ph5 lh-copy">
              <Skeleton count={3} height={30} />
            </div>
          )}
        </ul>
        {departments.length ? (
          <div
            className={classNames(styles.submenuContainer, handles.submenuContainer, 'pa5')}
            style={{
              display:
                departments.length &&
                departmentActive &&
                departmentActiveHasCategories
                  ? 'flex'
                  : 'none',
            }}
          >
            <Submenu closeMenu={openMenu} />
          </div>
        ) : (
          <div className="w-100" style={{ overflow: 'auto' }}>
            <div className="w-30 mb4 ml4 mt5">
              <Skeleton height={30} />
            </div>
            <div className={classNames(styles.submenuList, 'mh4 mb5')}>
              {loaderBlocks}
            </div>
          </div>
        )}
      </nav>
    </div>
  ) : null
})

export default injectIntl(HorizontalMenu)
