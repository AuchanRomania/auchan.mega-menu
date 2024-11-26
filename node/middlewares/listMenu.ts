import { Menu } from "../typings/custom"

export async function listMenu(ctx: Context, next: () => Promise<void>) {
  const {
    vtex: { logger },
    clients: { vbase },
  } = ctx

  try {
    const menuItems = await vbase.getJSON<Menu[]>('menu', 'menuItems')
    ctx.body = menuItems
    ctx.status = 200
  } catch (error) {
    logger.error({
      message: 'Error in listMenu',
      data: error,
    })
    console.error(`Error in listMenu: ${error}`)
    ctx.status = error.response?.status || 500
    ctx.body = error.response?.data || 'Internal server error'
    return
  }
  await next()
}
