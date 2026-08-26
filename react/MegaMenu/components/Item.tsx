import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import React, { useMemo } from 'react'
import type { FC } from 'react'
import { useCssHandles } from 'vtex.css-handles'
import { Link } from 'vtex.render-runtime'
import { Icon, IconCaret } from 'vtex.store-icons'

import type { IconProps } from '../../shared'
import { megaMenuState } from '../State'

const CSS_HANDLES = [
  'styledLink',
  'styledLinkIcon',
  'styledLinkContainer',
  'styledLinkContent',
  'styledLinkText',
  'styledLinkTextLabel',
  'accordionIconContainer',
  'accordionIcon',
  'menuItemIcon',
  'menuItemBadge',
] as const

const defaultTypography: Record<number, string> = {
  1: 't-body',
  2: 't-body',
  3: 't-body',
}

const styledLinkRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 12,
  width: '100%',
}

const styledLinkTextClusterStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-start',
  flex: '1 1 auto',
  minWidth: 0,
  gap: 12,
  textAlign: 'left',
}

const styledLinkLabelStyle: React.CSSProperties = {
  flex: '0 1 auto',
  minWidth: 0,
  textAlign: 'left',
}

const accordionClusterStyle: React.CSSProperties = {
  display: 'flex',
  marginLeft: 'auto',
  flexShrink: 0,
}

function getAccordionIconContainerStyle(
  isOpen: boolean,
  orientation: 'vertical' | 'horizontal'
): React.CSSProperties {
  const rotate = isOpen ? 'rotate(-90deg)' : 'rotate(90deg)'
  const base: React.CSSProperties = {
    ...accordionClusterStyle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    flexShrink: 0,
    boxSizing: 'border-box',
    transform: rotate,
    transformOrigin: 'center center',
    transition: 'transform 0.2s ease',
  }

  if (orientation === 'vertical') {
    return {
      ...base,
      height: 20,
      minHeight: 20,
    }
  }

  return {
    ...base,
    minHeight: 44,
    height: 44,
  }
}

const styledLinkRootStyle: React.CSSProperties = {
  textAlign: 'left',
  width: '100%',
}

const Item: FC<ItemProps> = observer((props) => {
  const { handles, withModifiers } = useCssHandles(CSS_HANDLES)
  const { departmentActive, config, setDepartmentActive } = megaMenuState
  const menuOrientation = config.orientation ?? 'horizontal'
  const {
    id,
    to,
    level = 1,
    isTitle,
    disabled,
    accordion,
    iconId,
    iconProps,
    iconPosition,
    typography = defaultTypography[level],
    tabIndex,
    className,
    onClick,
    children,
    style,
    enableStyle,
    closeMenu,
    uploadedIcon,
    optionalText,
    isCollection,
    accordionExpanded,
    ...rest
  } = props

  const isAccordionOpen =
    accordionExpanded !== undefined
      ? accordionExpanded
      : departmentActive?.id === id
  const hasLink = to && to !== '#'

  const linkClassNames = classNames(
    handles.styledLink,
    'no-underline c-on-base w-100 pa0',
    {
      [typography]: true,
      'fw6 c-on-base': isTitle,
      pointer: !disabled && !isTitle,
    }
  )

  const accordionContainerStyle = useMemo(
    () =>
      getAccordionIconContainerStyle(
        isAccordionOpen,
        menuOrientation === 'vertical' ? 'vertical' : 'horizontal'
      ),
    [isAccordionOpen, menuOrientation]
  )

  const stylesItem = useMemo(() => {
    if (style) {
      let tempStyle: Record<string, string> = {}

      try {
        tempStyle = JSON.parse(style)
      } catch (e) {
        return {}
      }

      return Object.entries(tempStyle).reduce((obj, [key, value]) => {
        const formatKey = key.replace(/-([a-z])/g, (g) => {
          return g[1].toUpperCase()
        })

        return {
          ...obj,
          [formatKey]: value,
        }
      }, {})
    }

    return {}
  }, [style])

  const iconTestId = `icon-${iconPosition}`
  const iconComponent =
    iconProps || iconId ? (
      <span
        className={classNames(
          handles.styledLinkIcon,
          'flex items-center',
          iconPosition === 'left' ? 'mr3' : 'ml3'
        )}
        data-testid={iconTestId}
      >
        <Icon {...{ ...iconProps, id: iconProps?.id ?? iconId }} />
      </span>
    ) : null

  const content = (
    <div
      className={classNames(handles.styledLinkContent, 'flex')}
      style={styledLinkRowStyle}
    >
      <div
        className={classNames(
          handles.styledLinkText,
          'flex items-center',
          iconPosition === 'left' && iconComponent && 'nowrap'
        )}
        style={
          enableStyle
            ? { ...stylesItem, ...styledLinkTextClusterStyle }
            : styledLinkTextClusterStyle
        }
      >
        {iconPosition === 'left' && iconComponent}
        {uploadedIcon && level < 3 && (
          <>
            <img className={handles.menuItemIcon} src={uploadedIcon} alt="" />
          </>
        )}
        <span
          className={handles.styledLinkTextLabel}
          style={styledLinkLabelStyle}
        >
          {children}
        </span>
        {optionalText && level === 3 && (
          <>
            <span className={handles.menuItemBadge}>{optionalText}</span>
          </>
        )}
        {iconPosition === 'right' && iconComponent}
      </div>
      {accordion && (
        <div
          className={`${withModifiers(
            'accordionIconContainer',
            isAccordionOpen ? 'isOpen' : 'isClosed'
          )} c-muted-3`}
          style={accordionContainerStyle}
        >
          <IconCaret classNames={handles.accordionIcon} orientation="right" />
        </div>
      )}
    </div>
  )

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={classNames(handles.styledLinkContainer, className)}
      onClick={onClick}
    >
      {disabled || !hasLink ? (
        onClick ? (
          <button className={linkClassNames} style={styledLinkRootStyle}>
            {content}
          </button>
        ) : (
          <span className={linkClassNames} style={styledLinkRootStyle}>
            {content}
          </span>
        )
      ) : (
        <Link
          to={isCollection ? to : `${to}/c`}
          {...rest}
          className={linkClassNames}
          style={styledLinkRootStyle}
          onClick={() => {
            if (config.orientation === 'vertical') {
              setDepartmentActive(null)
            }

            if (closeMenu) closeMenu(false)
          }}
        >
          {content}
        </Link>
      )}
    </div>
  )
})

Item.defaultProps = {
  iconPosition: 'left',
}

export interface ItemProps {
  id?: string
  level?: number
  to?: string
  isTitle?: boolean
  disabled?: boolean
  accordion?: boolean
  typography?: string
  iconId?: string
  iconProps?: IconProps
  iconPosition?: 'left' | 'right'
  tabIndex?: number
  className?: string
  uploadedIcon?: string
  optionalText?: string
  style?: string
  enableStyle?: boolean
  isCollection?: boolean
  onClick?: () => void
  closeMenu?: (open: boolean) => void
  accordionExpanded?: boolean
}

export default Item
