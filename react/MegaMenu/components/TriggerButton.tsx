import type { FC } from 'react'
import React, { useEffect, useRef } from 'react'
import { FormattedMessage } from 'react-intl'
import { applyModifiers, useCssHandles } from 'vtex.css-handles'
import { Icon } from 'vtex.store-icons'

import type { IconProps } from '../../shared'
import { usePrefetchMenus } from '../hooks/useMenuData'
import { useMenuStore, useMenuStoreApi } from '../store'
import '../styles.css'

const CSS_HANDLES = [
  'triggerContainer',
  'triggerButtonIcon',
  'triggerLabel',
] as const

export const BUTTON_ID = 'mega-menu-trigger-button'

const MenuGlyph: FC<{ size: number; className: string }> = ({
  size,
  className,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M20.41 19.83c.35 0 .59.23.59.58s-.24.59-.59.59H2.91c-.35 0-.58-.24-.58-.59s.23-.58.58-.58h17.5Zm4.67 0c.35 0 .58.23.58.58s-.23.59-.58.59h-1.17c-.35 0-.58-.24-.58-.59s.23-.58.58-.58h1.17Zm0-7c.35 0 .58.23.58.58s-.23.59-.58.59H2.91c-.35 0-.58-.24-.58-.59s.23-.58.58-.58h22.17Zm0-7c.35 0 .58.23.58.58s-.23.59-.58.59H2.91c-.35 0-.58-.24-.58-.59s.23-.58.58-.58h22.17Z" />
  </svg>
)

const TriggerButton: FC<TriggerButtonProps> = (props) => {
  const { handles } = useCssHandles(CSS_HANDLES)
  const store = useMenuStoreApi()
  const isOverlayOpen = useMenuStore((s) => s.isOverlayOpen)
  const embeddedInView = useMenuStore((s) => s.embeddedInView)
  const {
    label,
    excludeSlugs,
    isActive,
    activeClassName,
    mutedClassName,
    ...iconProps
  } = props

  const prefetch = usePrefetchMenus(excludeSlugs)
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    store.setTrigger(ref.current)

    return () => store.setTrigger(null)
  }, [store])

  const isOpen = isOverlayOpen || !!embeddedInView

  const handleClick = () => {
    if (embeddedInView) {
      return
    }

    store.set({ isOverlayOpen: !store.get().isOverlayOpen })
  }

  return (
    <button
      ref={ref}
      type="button"
      data-id={BUTTON_ID}
      className={applyModifiers(
        handles.triggerContainer,
        isOpen ? 'open' : 'closed'
      )}
      aria-expanded={isOpen}
      aria-controls={isOverlayOpen ? 'mega-menu-overlay' : undefined}
      aria-haspopup="true"
      onClick={handleClick}
      onPointerEnter={prefetch}
      onFocus={prefetch}
    >
      {iconProps.id ? (
        <Icon
          {...iconProps}
          isActive={isActive}
          activeClassName={activeClassName ?? handles.triggerButtonIcon}
          mutedClassName={mutedClassName ?? handles.triggerButtonIcon}
        />
      ) : (
        <MenuGlyph
          size={iconProps.size ?? 28}
          className={handles.triggerButtonIcon}
        />
      )}
      <span className={handles.triggerLabel}>
        {label ?? <FormattedMessage id="store/mega-menu.trigger.label" />}
      </span>
    </button>
  )
}

export type TriggerButtonProps = Partial<IconProps> & {
  label?: string
  excludeSlugs?: string[]
}

TriggerButton.defaultProps = {
  isActive: true,
  size: 28,
}

export default TriggerButton
