import { LRUCache } from '@vtex/api'

import type { Menu, Args, ArgsUpload } from '../typings/custom'

const TEN_MINUTES_MS = 10 * 60 * 1000

const regionSellersCache = new LRUCache<string, string[]>({
  max: 500,
  maxAge: TEN_MINUTES_MS,
})

const sortMenusByOrder = (menus: Menu[]) => {
  return menus.sort((menuA: Menu, menuB: Menu) => menuA.order - menuB.order)
}

const orderArray = (menuList: Menu[]) => {
  menuList.forEach((currentValue: Menu) => {
    if (!currentValue.menu || !currentValue.menu.length) return

    sortMenusByOrder(currentValue.menu)
  })

  menuList.forEach((item: Menu) => {
    if (item.menu) {
      item.menu.forEach((subitem: Menu) => {
        if (subitem.menu) {
          if (!subitem.menu.length) return
          sortMenusByOrder(subitem.menu)
        }
      })
    }
  })

  return sortMenusByOrder(menuList)
}

const convertToJson = (menuString: string) => {
  menuString = menuString.replace(/\s+/g, '')

  return `{${menuString.replace(
    /([a-zA-Z0-9-]+):([a-zA-Z0-9-]+)/g,
    '"$1":"$2"'
  )}}`
}

const replaceStyles = (menuStyle: Menu[]) => {
  menuStyle.forEach((firstMenu: Menu) => {
    if (firstMenu.styles) {
      firstMenu.styles = convertToJson(firstMenu.styles)
    }

    if (firstMenu.menu) {
      firstMenu.menu.forEach((secondMenu: Menu) => {
        if (secondMenu.styles) {
          secondMenu.styles = convertToJson(secondMenu.styles)
        }

        if (secondMenu.menu) {
          secondMenu.menu.forEach((thirdMenu: Menu) => {
            if (thirdMenu.styles) {
              thirdMenu.styles = convertToJson(thirdMenu.styles)
            }
          })
        }
      })
    }
  })
}

const parseSellerIDs = (menuItems: Menu[], regionID: string) => {
  return menuItems.filter((item) => {
    const excludeSellerIDs = item?.sellerIDs
      ?.trim()
      .replace(/ /g, '')
      .split(',')

    if (excludeSellerIDs?.includes(regionID) && regionID !== '') {
      return false
    }

    if (item.menu?.length > 0) {
      item.menu = parseSellerIDs(item.menu, regionID)
    }

    return true
  })
}

const removeHiddenItems = (menuItems: Menu[]): Menu[] =>
  menuItems
    .filter((item) => item.display !== false)
    .map((item) =>
      item.menu?.length ? { ...item, menu: removeHiddenItems(item.menu) } : item
    )

const normalizeSlug = (slug: string) =>
  slug.trim().toLowerCase().replace(/\/c$/, '').replace(/\/+$/, '')

const removeExcludedItems = (menuItems: Menu[], excludeSlugs: string[]) => {
  const excluded = excludeSlugs.map(normalizeSlug)

  return menuItems.filter(
    (item) => !(item.slug && excluded.includes(normalizeSlug(item.slug)))
  )
}

const parseSegment = (segmentToken?: string): { regionId?: string } => {
  if (!segmentToken) {
    return {}
  }

  try {
    return (
      JSON.parse(Buffer.from(segmentToken, 'base64').toString('utf-8')) ?? {}
    )
  } catch (e) {
    return {}
  }
}

const getRegionSellerIds = async (
  regionId: string | undefined,
  ctx: Context
): Promise<string[]> => {
  if (!regionId) {
    return []
  }

  const cached = regionSellersCache.get(regionId)

  if (cached) {
    return cached
  }

  try {
    const regionSellers = await ctx.clients.region.getRegionSellers(regionId)
    const sellerIds: string[] = (regionSellers?.[0]?.sellers ?? [])
      .map((seller: { id?: string }) => seller?.id)
      .filter(Boolean)

    regionSellersCache.set(regionId, sellerIds)

    return sellerIds
  } catch (err) {
    ctx.vtex.logger.warn({
      message: 'mega-menu: region sellers lookup failed, menu not filtered',
      regionId,
      error: err?.message,
    })

    return []
  }
}

export const menus = async (
  _: unknown,
  {
    filterMenuItems,
    excludeSlugs,
  }: { filterMenuItems: boolean; excludeSlugs?: string[] | null },
  ctx: Context
) => {
  const {
    clients: { vbase },
  } = ctx

  const sellerIds = filterMenuItems
    ? await getRegionSellerIds(
        parseSegment(ctx.vtex.segmentToken).regionId,
        ctx
      )
    : []

  let menuItems: Menu[] = []

  try {
    const storedMenu = (await vbase.getJSON<Menu[]>('menu', 'menuItems')) ?? []

    menuItems = JSON.parse(JSON.stringify(storedMenu))

    sellerIds.forEach((sellerId) => {
      menuItems = parseSellerIDs(menuItems, sellerId)
    })

    if (filterMenuItems) {
      menuItems = removeHiddenItems(menuItems)
    }

    if (excludeSlugs?.length) {
      menuItems = removeExcludedItems(menuItems, excludeSlugs)
    }
  } catch (err) {
    const errStr = err.toString()

    if (errStr === 'Error: Request failed with status code 404') {
      await vbase.saveJSON('menu', 'menuItems', [])
    } else {
      throw err
    }
  }

  replaceStyles(menuItems)

  return orderArray(menuItems)
}

export const menu = async (
  _: unknown,
  { id }: { id: string },
  ctx: Context
) => {
  const menusId = await ctx.clients.vbase.getJSON<Menu[]>('menu', 'menuItems')
  const response = menusId.filter((menuId: Menu) => menuId.id === id)

  return response[0]
}

export const createMenu = async (
  _: unknown,
  { menuInput }: Args,
  { clients: { vbase } }: Context
) => {
  let menuItems: Menu[] = []

  // eslint-disable-next-line vtex/prefer-early-return
  if (menuInput.id) {
    try {
      menuItems = await vbase.getJSON<Menu[]>('menu', 'menuItems')
    } catch (err) {
      const errStr = err.toString()

      if (errStr !== 'Error: Request failed with status code 404') {
        throw err
      }
    }

    menuInput.order = menuItems.length + 1

    return vbase
      .saveJSON('menu', 'menuItems', [...menuItems, menuInput])
      .then(() => menuInput)
  }

  return 'Error creating the item'
}

export const uploadMenu = async (
  _: unknown,
  { menuData }: ArgsUpload,
  { clients: { vbase } }: Context
) => {
  const menuItems = await vbase.getJSON<Menu[]>('menu', 'menuItems')

  if (menuItems.length > 0) {
    menuItems.forEach((item) => menuData.push(item))
  }

  return vbase.saveJSON('menu', 'menuItems', menuData).then(() => menuData)
}

export const editMenu = async (
  _: unknown,
  { menuInput }: Args,
  { clients: { vbase } }: Context
) => {
  const menuEdit = await vbase.getJSON<Menu[]>('menu', 'menuItems')

  const newArray = orderArray([
    ...menuEdit.filter((menuItem: Menu) => menuItem.id !== menuInput.id),
    menuInput,
  ])

  return vbase.saveJSON('menu', 'menuItems', newArray).then(() => newArray)
}

export const deleteMenu = async (
  _: unknown,
  { id, idSecond, idThird }: { id: string; idSecond: string; idThird: string },
  { clients: { vbase } }: Context
) => {
  const menuDelete = await vbase.getJSON<Menu[]>('menu', 'menuItems')
  let deleteArray: Menu[] = []

  if (!id && !idSecond && !idThird) {
    deleteArray = menuDelete.filter(
      (itemArray: Menu) =>
        itemArray.id !== '' &&
        itemArray.id !== undefined &&
        itemArray.id !== null
    )
    const sortnewArray = deleteArray.sort((a, b) => a.order - b.order)
    let count = 1

    sortnewArray.map((as) => (as.order = count++))
    deleteArray = sortnewArray
  } else if (id && !idSecond && !idThird) {
    deleteArray = menuDelete.filter((itemArray: Menu) => itemArray.id !== id)
    const getMenuOrder = menuDelete.filter(
      (menuOrder: Menu) => menuOrder.id === id
    )

    for (let i = 0; i < menuDelete.length; i++) {
      const valueOrder = menuDelete[i].order

      if (menuDelete[i].order > getMenuOrder[0].order) {
        menuDelete[i].order = valueOrder - 1
      }
    }
  } else if (id && idSecond && !idThird) {
    deleteArray = menuDelete.filter((itemArray: Menu) => itemArray.id === id)
    const tempSecondArray = deleteArray[0].menu.filter(
      (i: Menu) => i.id !== idSecond
    )

    const getMenuOrder = deleteArray[0].menu.filter(
      (menuOrder: Menu) => menuOrder.id === idSecond
    )

    for (let i = 0; i < tempSecondArray.length; i++) {
      const valueOrder = tempSecondArray[i].order

      if (tempSecondArray[i].order > getMenuOrder[0].order) {
        tempSecondArray[i].order = valueOrder - 1
      }
    }

    deleteArray[0].menu = tempSecondArray

    menuDelete.forEach((itemDelete: Menu) => {
      if (itemDelete.id === deleteArray[0].id) {
        itemDelete.menu = deleteArray[0].menu
      }
    })

    deleteArray = menuDelete
  } else {
    deleteArray = menuDelete.filter((itemArray: Menu) => itemArray.id === id)
    const tempSecondArray = deleteArray[0].menu.filter(
      (seconItem: Menu) => seconItem.id === idSecond
    )

    const tempThirdArray = tempSecondArray[0].menu.filter(
      (thirdItem: Menu) => thirdItem.id !== idThird
    )

    const getMenuOrder = tempSecondArray[0].menu.filter(
      (menuOrder: Menu) => menuOrder.id === idThird
    )

    for (let i = 0; i < tempThirdArray.length; i++) {
      const valueOrder = tempThirdArray[i].order

      if (tempThirdArray[i].order > getMenuOrder[0].order) {
        tempThirdArray[i].order = valueOrder - 1
      }
    }

    tempSecondArray[0].menu = tempThirdArray

    menuDelete.forEach((itemDelete: Menu) => {
      if (itemDelete.id === deleteArray[0].id) {
        itemDelete.menu.forEach((subItemDelete: Menu) => {
          if (subItemDelete.id === idSecond) {
            subItemDelete.menu = tempSecondArray[0].menu
          }
        })
      }
    })

    deleteArray = menuDelete
  }

  return vbase
    .saveJSON('menu', 'menuItems', deleteArray)
    .then(() => deleteArray)
}

export const menuQueries = {
  menu,
  menus,
}

export const menuMutations = {
  createMenu,
  editMenu,
  deleteMenu,
  uploadMenu,
}
