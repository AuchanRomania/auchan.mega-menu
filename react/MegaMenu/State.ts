import { makeAutoObservable } from 'mobx'

import type { DataMenu, GlobalConfig, MenuItem } from '../shared'

type ChangeOpenMenu = boolean | ((isOpen: boolean) => boolean)

class MegaMenuState {
  public config: GlobalConfig = {}
  public departments: MenuItem[] = []
  public departmentActive: MenuItem | null = null
  public isOpenMenu = false
  public isHomePage = false
  /** Desktop home: true while the hero row (menu + banner) is in the viewport */
  public isHomeHeroMegaVisible = true
  /**
   * After the user closes the mega menu on homepage, the wrapper must not call openMenu(true) again
   * (avoids reopen on remount / effect); cleared when leaving store.home. Opening via Produse still works.
   */
  public homeMegaSuppressAutoOpen = false

  constructor() {
    makeAutoObservable(this)
  }

  public setConfig = (config: GlobalConfig) => {
    this.config = config
  }

  public setDepartments = (departments: MenuItem[]) => {
    this.departments = departments
  }

  public setIsHomePage = (value: boolean) => {
    this.isHomePage = value
  }

  public setHomeHeroMegaVisible = (value: boolean) => {
    this.isHomeHeroMegaVisible = value
  }

  public setHomeMegaSuppressAutoOpen = (value: boolean) => {
    this.homeMegaSuppressAutoOpen = value
  }

  public setDepartmentActive = (department: MenuItem | null) => {
    this.departmentActive = department
  }

  public openMenu = (value: ChangeOpenMenu = true) => {
    if (typeof value === 'boolean') {
      this.isOpenMenu = value
    } else {
      this.isOpenMenu = value(this.isOpenMenu)
    }

    if (!this.isOpenMenu) {
      this.departmentActive = null
      if (this.isHomePage) {
        this.homeMegaSuppressAutoOpen = true
      }
    }
  }

  public getCategories = () => {
    let categories: DataMenu[] = []

    if (this.departmentActive) {
      return this.departmentActive?.menu ?? []
    }

    this.departments.forEach((department: any) => {
      if (department?.menu?.length) {
        categories = categories.concat(department.menu)
      }
    })

    return categories
  }
}

export const megaMenuState = new MegaMenuState()
