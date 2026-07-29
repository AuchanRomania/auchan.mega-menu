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
import { isPromotiiMegaMenuDepartment } from '../../shared/utils'
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
    isHomeHeroMegaVisible,
    departments,
    departmentActive,
    config: { title, defaultDepartmentActive },
    setDepartmentActive,
    openMenu,
  } = megaMenuState

  const homeHeroEmbeddedLayout = isHomePage && isHomeHeroMegaVisible

  const departmentActiveHasCategories = !!departmentActive?.menu?.length
  const navRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const heroDocBottomRef = useRef<number | null>(null)
  const lastHeroEmbeddedVisibleRef = useRef<boolean | null>(null)
  const heroScrollReopenCooldownUntilRef = useRef(0)
  const autoClosedOnScrollRef = useRef(false)

  useEffect(() => {
    if (isOpenMenu) {
      autoClosedOnScrollRef.current = false
    }
  }, [isOpenMenu])

  useEffect(() => {
    if (!isHomePage || typeof window === 'undefined') return
    if (megaMenuState.config.orientation !== 'horizontal') return

    const outerRow = document.querySelector(
      '[class*="flexRow--megaMenuContainer"]'
    ) as HTMLElement | null

    if (!outerRow) return

    const HEADER_CLEARANCE = 96
    const SCROLL_UP_HYSTERESIS = 120
    const LEAVE_EXTRA = 44

    let raf = 0

    const tick = () => {
      const isOpen = megaMenuState.isOpenMenu
      const scrollTop =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0

     const TOP_FORCE_HERO_SCROLL_PX = 48
      const now =
        typeof performance !== 'undefined' ? performance.now() : 0
      const inCloseCooldown =
        now < heroScrollReopenCooldownUntilRef.current
      if (
        megaMenuState.isHomePage &&
        megaMenuState.config.orientation === 'horizontal' &&
        !isOpen &&
        scrollTop <= TOP_FORCE_HERO_SCROLL_PX &&
        !inCloseCooldown &&
        !autoClosedOnScrollRef.current
      ) {
        heroScrollReopenCooldownUntilRef.current = 0
        megaMenuState.setHomeMegaSuppressAutoOpen(false)
        megaMenuState.setHomeHeroMegaVisible(true)
        megaMenuState.openMenu(true)
        lastHeroEmbeddedVisibleRef.current = true
        return
      }

      const pos = getComputedStyle(outerRow).position

      if (
        megaMenuState.isHomePage &&
        megaMenuState.config.orientation === 'horizontal' &&
        isOpen &&
        scrollTop <= TOP_FORCE_HERO_SCROLL_PX &&
        pos === 'fixed'
      ) {
        heroScrollReopenCooldownUntilRef.current = 0
        megaMenuState.setHomeHeroMegaVisible(true)
        lastHeroEmbeddedVisibleRef.current = true
        return
      }

      let embeddedVisible: boolean
      const wasEmbedded = lastHeroEmbeddedVisibleRef.current !== false

      if (pos !== 'fixed') {
        const rect = outerRow.getBoundingClientRect()
        heroDocBottomRef.current = rect.bottom + window.scrollY
        if (isOpen) {
          const threshold = wasEmbedded
            ? HEADER_CLEARANCE
            : HEADER_CLEARANCE - LEAVE_EXTRA
          embeddedVisible = rect.bottom > threshold
        } else {
          embeddedVisible = rect.bottom > HEADER_CLEARANCE + SCROLL_UP_HYSTERESIS
        }
      } else {
        const bottomDoc = heroDocBottomRef.current
        embeddedVisible =
          bottomDoc != null &&
          window.scrollY <
            bottomDoc - HEADER_CLEARANCE - SCROLL_UP_HYSTERESIS
      }

      const prevEmbedded = lastHeroEmbeddedVisibleRef.current

      if (
        megaMenuState.isHomePage &&
        isOpen &&
        embeddedVisible === false &&
        (prevEmbedded === true || prevEmbedded === null)
      ) {
        autoClosedOnScrollRef.current = true
        megaMenuState.setHomeHeroMegaVisible(false)
        megaMenuState.openMenu(false)
        lastHeroEmbeddedVisibleRef.current = false
        if (typeof performance !== 'undefined') {
          heroScrollReopenCooldownUntilRef.current = performance.now() + 420
        }
        return
      }

      if (
        megaMenuState.isHomePage &&
        !isOpen &&
        prevEmbedded === false &&
        embeddedVisible === true
      ) {
        if (
          typeof performance !== 'undefined' &&
          performance.now() < heroScrollReopenCooldownUntilRef.current
        ) {
          return
        }
        megaMenuState.setHomeMegaSuppressAutoOpen(false)
        megaMenuState.setHomeHeroMegaVisible(true)
        megaMenuState.openMenu(true)
        lastHeroEmbeddedVisibleRef.current = true
        return
      }

      if (prevEmbedded !== embeddedVisible) {
        if (isOpen && embeddedVisible === true && pos === 'fixed') {
          return
        }
        lastHeroEmbeddedVisibleRef.current = embeddedVisible
        megaMenuState.setHomeHeroMegaVisible(embeddedVisible)
      }
    }

    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        raf = 0
        tick()
      })
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        schedule()
      }
    }

    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', schedule)

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', schedule)
      cancelAnimationFrame(raf)
    }
  }, [isHomePage, megaMenuState.config.orientation])

  useEffect(() => {
    const outerRow = document.querySelector('[class*="flexRow--megaMenuContainer"]') as HTMLElement
    const contentRow = document.querySelector('[class*="flexRowContent--megaMenuContainer"]') as HTMLElement
    const headerWrapper =
      (document.querySelector('[class*="wrapper--headerDesktop"]') as HTMLElement) ??
      (document.querySelector('[class*="stickyLayout--headerDesktop"]') as HTMLElement)
    const headerSecondaryRow =
      (document.querySelector('[class*="flexRow--headerDesktopSecondary"]') as HTMLElement) ??
      (document.querySelector('[class*="flexRowContent--headerDesktopSecondary"]') as HTMLElement)

    if (outerRow) {
      if (!isOpenMenu) {
        if (isHomePage) {
          outerRow.style.display = ''
          outerRow.style.position = ''
          outerRow.style.left = ''
          outerRow.style.right = ''
          outerRow.style.bottom = ''
          outerRow.style.top = ''
          outerRow.style.zIndex = ''
          outerRow.style.pointerEvents = ''
          outerRow.style.background = ''
          outerRow.style.overflow = ''
        } else {
          outerRow.style.display = 'none'
        }
        if (contentRow) {
          contentRow.style.overflow = ''
          contentRow.style.pointerEvents = ''
        }
        const menuCol = outerRow.querySelector(
          '[class*="megaMenuCol"]'
        ) as HTMLElement | null
        if (menuCol) {
          menuCol.style.pointerEvents = ''
          menuCol.style.overflow = ''
        }
        const menuColChild = outerRow.querySelector(
          '[class*="flexColChild--megaMenuCol"]'
        ) as HTMLElement | null
        if (menuColChild) {
          menuColChild.style.pointerEvents = ''
          menuColChild.style.overflow = ''
        }
        if (headerWrapper) {
          headerWrapper.style.boxShadow = ''
        }
        if (navRef.current) {
          navRef.current.style.removeProperty('pointer-events')
          navRef.current.style.removeProperty('overflow')
          navRef.current.style.removeProperty('box-shadow')
          navRef.current.style.removeProperty('border-top')
          navRef.current.style.removeProperty('background')
          const submenuEl = navRef.current.querySelector(
            '[class*="submenuContainer"]'
          ) as HTMLElement | null
          if (submenuEl) {
            submenuEl.style.pointerEvents = ''
            submenuEl.style.zIndex = ''
          }
        }
      } else {
        outerRow.style.display = ''
        if (!homeHeroEmbeddedLayout) {
          const headerBottom = headerSecondaryRow
            ? headerSecondaryRow.getBoundingClientRect().bottom
            : headerWrapper
              ? headerWrapper.getBoundingClientRect().bottom
              : 0
          const nonHomeOffset = 0
          // Non-home: only side menu over page content (no banner)
          outerRow.style.position = 'fixed'
          outerRow.style.left = '0'
          outerRow.style.right = '0'
          outerRow.style.bottom = ''
          outerRow.style.top = `${Math.max(0, Math.round(headerBottom) + nonHomeOffset)}px`
          outerRow.style.zIndex = '1000'
          outerRow.style.pointerEvents = 'none'
          outerRow.style.background = 'transparent'
          outerRow.style.overflow = 'visible'

          if (contentRow) {
            contentRow.style.overflow = 'visible'
            contentRow.style.pointerEvents = 'none'
          }

          const menuCol = outerRow.querySelector(
            '[class*="megaMenuCol"]'
          ) as HTMLElement | null
          if (menuCol) {
            menuCol.style.pointerEvents = 'auto'
            menuCol.style.overflow = 'visible'
          }

          const menuColChild = outerRow.querySelector(
            '[class*="flexColChild--megaMenuCol"]'
          ) as HTMLElement | null
          if (menuColChild) {
            menuColChild.style.pointerEvents = 'auto'
            menuColChild.style.overflow = 'visible'
          }

          if (headerWrapper) {
            headerWrapper.style.boxShadow = ''
          }
          if (navRef.current) {
            navRef.current.style.pointerEvents = 'auto'
            navRef.current.style.overflow = 'visible'
            navRef.current.style.setProperty('background', '#fafafa', 'important')
            navRef.current.style.setProperty(
              'box-shadow',
              '4px 4px 6.5px rgba(0, 0, 0, 0.07)',
              'important'
            )
            navRef.current.style.setProperty('border-top', '1px solid #f0f0f0', 'important')

            const submenuEl = navRef.current.querySelector(
              '[class*="submenuContainer"]'
            ) as HTMLElement | null
            if (submenuEl) {
              submenuEl.style.pointerEvents = 'auto'
              submenuEl.style.zIndex = '1001'
            }
          }
        } else {
          outerRow.style.position = ''
          outerRow.style.left = ''
          outerRow.style.right = ''
          outerRow.style.bottom = ''
          outerRow.style.top = ''
          outerRow.style.zIndex = ''
          outerRow.style.pointerEvents = ''
          outerRow.style.background = ''
          outerRow.style.overflow = ''
          if (contentRow) {
            contentRow.style.overflow = ''
            contentRow.style.pointerEvents = ''
          }
          const menuCol = outerRow.querySelector(
            '[class*="megaMenuCol"]'
          ) as HTMLElement | null
          if (menuCol) {
            menuCol.style.pointerEvents = ''
            menuCol.style.overflow = ''
          }
          const menuColChild = outerRow.querySelector(
            '[class*="flexColChild--megaMenuCol"]'
          ) as HTMLElement | null
          if (menuColChild) {
            menuColChild.style.pointerEvents = ''
            menuColChild.style.overflow = ''
          }
          if (headerWrapper) {
            headerWrapper.style.boxShadow = ''
          }
          if (navRef.current) {
            navRef.current.style.removeProperty('pointer-events')
            navRef.current.style.removeProperty('overflow')
            navRef.current.style.removeProperty('box-shadow')
            navRef.current.style.removeProperty('border-top')
            navRef.current.style.removeProperty('background')
            const submenuEl = navRef.current.querySelector(
              '[class*="submenuContainer"]'
            ) as HTMLElement | null
            if (submenuEl) {
              submenuEl.style.pointerEvents = ''
              submenuEl.style.zIndex = ''
            }
          }
        }
      }
    }

    if (contentRow && !homeHeroEmbeddedLayout) {
      contentRow.style.height = isOpenMenu ? 'auto' : ''
    } else if (contentRow) {
      contentRow.style.height = ''
    }

    const bannerCols = document.querySelectorAll('[class*="bannerCol"]')

    bannerCols.forEach((el) => {
      ;(el as HTMLElement).style.display = homeHeroEmbeddedLayout ? '' : 'none'
    })
  }, [isOpenMenu, isHomePage, isHomeHeroMegaVisible, departmentActive])

  const debouncedHandleMouseEnter = useCallback(
    _debounce((department: MenuItem | null) => {
      setDepartmentActive(department)
    }, 120),
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

      if (
        megaMenuState.isHomePage &&
        megaMenuState.isHomeHeroMegaVisible
      ) {
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

    if (defaultDepartment && !isPromotiiMegaMenuDepartment(defaultDepartment)) {
      setDepartmentActive(defaultDepartment)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultDepartmentActive])

  useEffect(() => {
    if (
      departmentActive &&
      isPromotiiMegaMenuDepartment(departmentActive)
    ) {
      setDepartmentActive(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments, departmentActive])

  const departmentItems = useMemo(
    () =>
      departments
        .filter((j) => j.display && !isPromotiiMegaMenuDepartment(j))
        .map((d) => {
          const hasCategories = !!d.menu?.length

          return (
            <li
              className={classNames(
                handles.menuItem,
                d.id === departmentActive?.id && handles.departmentActive
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
            handles.menuContainer,
            styles.menuContainer,
            'list ma0 pa0 br b--muted-4'
          )}
        >
          <div
            className={classNames(
              handles.departmentsTitle,
              'f4 fw7 c-on-base lh-copy ma0'
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
