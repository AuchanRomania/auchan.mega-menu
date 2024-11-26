import { method } from '@vtex/api'
import { keepAlive } from './keepAlive'
import { listMenu } from './listMenu'

export default {
  keepAlive: method({
    GET: keepAlive,
  }),
  listMenu: method({
    GET: listMenu,
  }),
}
