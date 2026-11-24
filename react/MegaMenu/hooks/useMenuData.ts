import { useCallback, useEffect, useRef, useState } from 'react'
import type { QueryResult } from 'react-apollo'
import { useApolloClient, useQuery } from 'react-apollo'
import { canUseDOM } from 'vtex.render-runtime'

import GET_MENUS_L1 from '../../graphql/queries/getMenusL1.graphql'
import GET_MENUS_TREE from '../../graphql/queries/getMenusTree.graphql'
import type { StorefrontMenusResponse } from '../../shared'
import { getQueryVariables } from '../utils'

const RETRY_DELAYS = [1000, 3000, 10000, 30000]

const useRetry = (
  result: QueryResult<StorefrontMenusResponse>,
  skip = false
): QueryResult<StorefrontMenusResponse> => {
  const { data, loading, refetch } = result
  const failed = !skip && !loading && !data?.menus
  const attempts = useRef(0)
  const [gaveUp, setGaveUp] = useState(false)

  useEffect(() => {
    if (!failed) {
      return undefined
    }

    if (attempts.current >= RETRY_DELAYS.length) {
      setGaveUp(true)

      return undefined
    }

    let active = true
    let timer: number | undefined

    const retry = () => {
      timer = window.setTimeout(() => {
        attempts.current += 1
        refetch().catch(() => {
          if (!active) {
            return
          }

          if (attempts.current < RETRY_DELAYS.length) {
            retry()
          } else {
            setGaveUp(true)
          }
        })
      }, RETRY_DELAYS[attempts.current])
    }

    retry()

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [failed, refetch])

  return failed && !gaveUp
    ? { ...result, loading: true, error: undefined }
    : result
}

/** Level 1 for the header overlay, browser only. */
export const useMenusL1 = (excludeSlugs: string[] | undefined, skip = false) =>
  useRetry(
    useQuery<StorefrontMenusResponse>(GET_MENUS_L1, {
      ssr: false,
      skip,
      variables: getQueryVariables(excludeSlugs),
    }),
    skip
  )

/** The tree's menus only if already cached; never sends a request. */
export const useCachedMenuTree = (excludeSlugs: string[] | undefined) =>
  useQuery<StorefrontMenusResponse>(GET_MENUS_TREE, {
    ssr: false,
    fetchPolicy: 'cache-only',
    variables: getQueryVariables(excludeSlugs),
  }).data?.menus

/**
 * Full tree. Browser only and on user intent, except for the homepage list,
 * which renders every link in the first HTML (`ssr`).
 */
export const useMenuTree = (
  excludeSlugs: string[] | undefined,
  enabled: boolean,
  ssr = false
) =>
  useRetry(
    useQuery<StorefrontMenusResponse>(GET_MENUS_TREE, {
      ssr,
      skip: !enabled,
      variables: getQueryVariables(excludeSlugs),
      errorPolicy: canUseDOM ? 'none' : 'all',
    }),
    !enabled
  )

/** Warms the Apollo cache with the full tree before the overlay opens. */
export const usePrefetchMenus = (excludeSlugs: string[] | undefined) => {
  const client = useApolloClient()
  const requested = useRef(false)
  const variablesKey = JSON.stringify(getQueryVariables(excludeSlugs))

  return useCallback(() => {
    if (requested.current) {
      return
    }

    requested.current = true
    client
      .query({ query: GET_MENUS_TREE, variables: JSON.parse(variablesKey) })
      .catch(() => {
        requested.current = false
      })
  }, [client, variablesKey])
}
