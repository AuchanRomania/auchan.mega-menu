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
  /** După închiderea automată la scroll, evită redeschiderea în aceeași „buclă” de layout (salt la scroll). */
  const heroScrollReopenCooldownUntilRef = useRef(0)

  useEffect(() => {
    if (!isHomePage || typeof window === 'undefined') return
    if (megaMenuState.config.orientation !== 'horizontal') return

    const outerRow = document.querySelector(
      '[class*="flexRow--megaMenuContainer"]'
    ) as HTMLElement | null

    if (!outerRow) return

    /** Hero band considered past when its bottom is above this viewport offset (sticky header) */
    const HEADER_CLEARANCE = 96
    /** Scroll back up this far past the threshold before returning to embedded layout */
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

      /** Sus în pagină: mereu banner + meniu deschise (nu depinde de heroDocBottomRef / cooldown). */
      const TOP_FORCE_HERO_SCROLL_PX = 48
      if (
        megaMenuState.isHomePage &&
        megaMenuState.config.orientation === 'horizontal' &&
        !isOpen &&
        scrollTop <= TOP_FORCE_HERO_SCROLL_PX
      ) {
        heroScrollReopenCooldownUntilRef.current = 0
        megaMenuState.setHomeMegaSuppressAutoOpen(false)
        megaMenuState.setHomeHeroMegaVisible(true)
        megaMenuState.openMenu(true)
        lastHeroEmbeddedVisibleRef.current = true
        return
      }

      const pos = getComputedStyle(outerRow).position

      /* Sus în pagină cu panoul încă fixed: revine hero-ul complet în flux (banner vizibil). */
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

      if (isOpen) {
        if (pos !== 'fixed') {
          const rect = outerRow.getBoundingClientRect()
          heroDocBottomRef.current = rect.bottom + window.scrollY
          const threshold = wasEmbedded
            ? HEADER_CLEARANCE
            : HEADER_CLEARANCE - LEAVE_EXTRA
          embeddedVisible = rect.bottom > threshold
        } else {
          const bottomDoc = heroDocBottomRef.current
          embeddedVisible =
            bottomDoc != null &&
            window.scrollY <
              bottomDoc - HEADER_CLEARANCE - SCROLL_UP_HYSTERESIS
        }
      } else {
        // Meniu închis: folosim ultimul bottom măsurat ca să știm când s-a făcut scroll sus înapoi în hero
        const bottomDoc = heroDocBottomRef.current
        embeddedVisible =
          bottomDoc != null &&
          window.scrollY <
            bottomDoc - HEADER_CLEARANCE - SCROLL_UP_HYSTERESIS
      }

      const prevEmbedded = lastHeroEmbeddedVisibleRef.current

      // Ieșire din hero: închidem (header + „Produse” rămân folosibile)
      // `prevEmbedded === null` = primul tick după mount/refresh: dacă suntem deja sub hero
      // (embeddedVisible false), trebuie să închidem — altfel rămâne isOpenMenu true + fixed peste pagină.
      if (
        megaMenuState.isHomePage &&
        isOpen &&
        embeddedVisible === false &&
        (prevEmbedded === true || prevEmbedded === null)
      ) {
        megaMenuState.setHomeHeroMegaVisible(false)
        megaMenuState.openMenu(false)
        lastHeroEmbeddedVisibleRef.current = false
        if (typeof performance !== 'undefined') {
          heroScrollReopenCooldownUntilRef.current = performance.now() + 420
        }
        return
      }

      // Revenire sus în hero: readucem meniul + bannerul (fără click pe „Produse”)
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
        // Nu comuta la „embedded” în MobX cât timp panoul e încă fixed deschis — altfel innerRow iese din
        // flow și pagina se rearanjează violent (scroll care „fuge”).
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
        outerRow.style.display = 'none'
        if (headerWrapper) {
          headerWrapper.style.boxShadow = ''
        }
        if (navRef.current) {
          navRef.current.style.removeProperty('pointer-events')
          navRef.current.style.removeProperty('box-shadow')
          navRef.current.style.removeProperty('border-top')
          navRef.current.style.removeProperty('background')
        }
      } else {
        outerRow.style.display = ''
        if (!homeHeroEmbeddedLayout) {
          const headerBottom = headerSecondaryRow
            ? headerSecondaryRow.getBoundingClientRect().bottom
            : headerWrapper
              ? headerWrapper.getBoundingClientRect().bottom
              : 0
          const nonHomeOffset = 12
          // Non-home: only side menu over page content (no banner)
          outerRow.style.position = 'fixed'
          outerRow.style.left = '0'
          outerRow.style.right = '0'
          outerRow.style.bottom = ''
          outerRow.style.top = `${Math.max(0, Math.round(headerBottom) + nonHomeOffset)}px`
          /*
           * Deasupra umbrei headerului (container sticky z-999). Z mai mare blochează clickurile
           * pe zona acoperită de outerRow — folosim pointer-events: none pe rând și auto pe nav.
           */
          outerRow.style.zIndex = '1000'
          outerRow.style.pointerEvents = 'none'
          outerRow.style.background = 'transparent'
          outerRow.style.overflow = 'visible'
          if (headerWrapper) {
            headerWrapper.style.boxShadow = ''
          }
          if (navRef.current) {
            navRef.current.style.pointerEvents = 'auto'
            navRef.current.style.setProperty('background', '#fafafa', 'important')
            navRef.current.style.setProperty(
              'box-shadow',
              '-8px 0 16px -12px rgba(0, 0, 0, 0.22), 8px 0 16px -12px rgba(0, 0, 0, 0.22)',
              'important'
            )
            navRef.current.style.setProperty('border-top', '1px solid #fafafa', 'important')
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
          if (headerWrapper) {
            headerWrapper.style.boxShadow = ''
          }
          if (navRef.current) {
            navRef.current.style.removeProperty('pointer-events')
            navRef.current.style.removeProperty('box-shadow')
            navRef.current.style.removeProperty('border-top')
            navRef.current.style.removeProperty('background')
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
  }, [isOpenMenu, isHomePage, isHomeHeroMegaVisible])

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
