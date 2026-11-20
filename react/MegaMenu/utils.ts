import type { StorefrontMenuItem } from '../shared'

const normalizeSlug = (slug: string) =>
  slug.trim().toLowerCase().replace(/\/c$/, '').replace(/\/+$/, '')

/**
 * The resolver drops hidden and excluded departments. Blocks with the same
 * excluded slugs get the same variables, so they share one cached result.
 */
export const getQueryVariables = (excludeSlugs?: string[]) => ({
  filterMenuItems: true,
  excludeSlugs: Array.from(new Set((excludeSlugs ?? []).map(normalizeSlug)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b)),
})

export const getHref = (
  item: Pick<StorefrontMenuItem, 'slug' | 'isCollection'>
) => {
  if (!item.slug || item.slug === '#') {
    return null
  }

  return item.isCollection ? item.slug : `${item.slug}/c`
}

// Hidden and excluded items are dropped by the resolver.
export const getVisibleItems = <T extends StorefrontMenuItem>(
  items: T[] | undefined | null
): T[] => (items?.length ? items.filter(Boolean) : [])

/** Menu ids are "name + random" and may contain spaces or diacritics. */
export const toDomId = (prefix: string, id: string) =>
  `${prefix}-${id
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '')}`
