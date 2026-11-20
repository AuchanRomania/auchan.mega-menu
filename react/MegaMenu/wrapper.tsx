import React from 'react'
import { useRuntime } from 'vtex.render-runtime'

import type { GlobalConfig } from '../shared'
import EmbeddedMenu from './components/EmbeddedMenu'
import MobileMenu from './components/MobileMenu'
import OverlayMenu from './components/OverlayMenu'
import './styles.css'

const DEFAULT_HEADER_OFFSET = 120

const Wrapper: StorefrontFunctionComponent<MegaMenuProps> = (props) => {
  const {
    title,
    orientation,
    variant = 'overlay',
    excludeSlugs,
    defaultDepartmentActive,
    headerOffset = DEFAULT_HEADER_OFFSET,
  } = props

  const { hints } = useRuntime()

  const currentOrientation =
    orientation ?? (hints?.mobile ? 'vertical' : 'horizontal')

  if (currentOrientation === 'vertical') {
    return <MobileMenu title={title} excludeSlugs={excludeSlugs} />
  }

  if (variant === 'embedded') {
    return (
      <EmbeddedMenu
        title={title}
        excludeSlugs={excludeSlugs}
        headerOffset={headerOffset}
      />
    )
  }

  return (
    <OverlayMenu
      title={title}
      excludeSlugs={excludeSlugs}
      defaultDepartmentActive={defaultDepartmentActive}
    />
  )
}

Wrapper.defaultProps = {
  title: 'Departments',
}

export type MegaMenuProps = GlobalConfig

export default Wrapper
