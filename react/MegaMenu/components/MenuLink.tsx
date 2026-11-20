import type { FC, MouseEvent, ReactNode } from 'react'
import React from 'react'
import { useRuntime } from 'vtex.render-runtime'
import { Icon } from 'vtex.store-icons'

import type { StorefrontMenuItem } from '../../shared'
import { getHref } from '../utils'

interface MenuLinkProps {
  item: StorefrontMenuItem
  className: string
  children?: ReactNode
  onFocus?: () => void
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}

const isModifiedClick = (event: MouseEvent) =>
  event.button !== 0 ||
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey

// A plain <a> with navigate(): the runtime <Link> prefetches every visible link.
export const MenuLink: FC<MenuLinkProps> = ({
  item,
  className,
  children,
  onFocus,
  onClick,
}) => {
  const { navigate } = useRuntime()
  const href = getHref(item)

  if (!href) {
    return <span className={className}>{children ?? item.name}</span>
  }

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)

    if (event.defaultPrevented || isModifiedClick(event)) {
      return
    }

    event.preventDefault()
    navigate({ to: href, fallbackToWindowLocation: true })
  }

  return (
    <a
      href={href}
      className={className}
      onFocus={onFocus}
      onClick={handleClick}
    >
      {children ?? item.name}
    </a>
  )
}

interface MenuIconProps {
  item: StorefrontMenuItem
  className: string
}

// Admin uploads are 256px files; the asset CDN resizes them on `width`
const RESIZABLE_ICON =
  /\.vtexassets\.com\/assets\/vtex\.file-manager-graphql\/images\//

const getIconUrl = (url: string, width: number) =>
  `${url}${url.includes('?') ? '&' : '?'}width=${width}&aspect=true`

const getIconSources = (url: string) =>
  RESIZABLE_ICON.test(url)
    ? {
        src: getIconUrl(url, 48),
        srcSet: [1, 2, 3]
          .map((density) => `${getIconUrl(url, 24 * density)} ${density}x`)
          .join(', '),
      }
    : { src: url }

export const MenuIcon: FC<MenuIconProps> = ({ item, className }) => {
  if (item.uploadedIcon) {
    return (
      <img
        className={className}
        {...getIconSources(item.uploadedIcon)}
        width={24}
        height={24}
        alt=""
        loading="lazy"
        decoding="async"
      />
    )
  }

  if (item.icon) {
    return (
      <span className={className} aria-hidden="true">
        <Icon id={item.icon} size={24} />
      </span>
    )
  }

  return null
}
