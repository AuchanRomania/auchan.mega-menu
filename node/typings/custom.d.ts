export interface Menu {
  id: string
  name: string
  icon: string
  slug: string
  sellerIDs?: string
  isCollection?: boolean
  styles: string
  menu: Menu[]
  display: boolean
  enableSty: boolean
  order: number
  slugRoot?: string
  slugRelative?: string
  uploadedIcon?: string
  isCmsOfferPage?: boolean
  offerCollectionId?: string
}
interface Args {
  menuInput: Menu
}
interface ArgsUpload {
  menuData: [Menu]
}

export type Maybe<T> = T | void
