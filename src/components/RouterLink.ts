
import { CompElem, event, prop, showTagError, tag } from "compelem";
import { every, isObject, remove } from "myfx";
import { GlobalRouteNameMap, LastActiveLinks, RouterLinkToExactMap, RouterLinkToMap } from "../const";
import { Router } from "../router/Router";
import type { RouteOption } from "../types";
import { useRouter } from "../utils";

/**
 * 路由链接
 * @props
 *  to {string|RouteOption} 路由选项
 *  replace {boolean} 使用替换方式跳转，默认false
 *  activeClass {string} 激活样式，默认 router-link-active
 *  exact {boolean} 精确匹配，开启后匹配全路径，否则按前缀匹配，默认false
 *
 * @events
 *  routechange({isRedirect,newUrl,oldUrl}) 当任意包裹元素触发hover效果时触发
 *
 * @author holyhigh2
 */
@tag('l-router-link')
export class RouterLink extends CompElem<null> {

  //////////////////////////////////// props
  @prop({ type: [String, Object] }) to: string | RouteOption = ''
  @prop replace = false
  @prop activeClass = 'router-link-active'
  @prop exact = false

  router!: Router
  weakThis: WeakRef<RouterLink>
  /////////////////////////////////// watches

  //////////////////////////////////// lifecycles
  constructor() {
    super()
    this.weakThis = new WeakRef(this)
  }
  beforeMount(): void {
    this.router = useRouter()

    let toUrl = this._getPath()
    let itemsInPath = this.exact ? RouterLinkToExactMap.get(toUrl as string) : RouterLinkToMap.get(toUrl as string)
    if (!itemsInPath) {
      itemsInPath = []
      this.exact ? RouterLinkToExactMap.set(toUrl as string, itemsInPath) : RouterLinkToMap.set(toUrl as string, itemsInPath)
    }
    itemsInPath.push(this.weakThis)

    //match link
    this.matchUrl(toUrl as string)
  }
  mounted(): void {
  }
  disconnectedCallback(): void {
    let toUrl = this._getPath()
    let itemsInPath = this.exact ? RouterLinkToExactMap.get(toUrl as string) : RouterLinkToMap.get(toUrl as string)
    if (itemsInPath) {
      remove(itemsInPath, item => item === this.weakThis)
    }
    remove(LastActiveLinks, link => link === this.weakThis)
  }
  //////////////////////////////////// hooks
  @event('click')
  onMouseEnter() {
    if (this.replace) {
      this.router.replace(this.to)
    } else {
      this.router.push(this.to)
    }
  }
  //////////////////////////////////// methods
  matchUrl(linkUrl: string) {
    if (this.exact) {
      if (this.router.url === linkUrl) {
        this.toggleActive(true)
        LastActiveLinks.push(this.weakThis)
        return
      }
    } else {
      let linkUrlParts = linkUrl.split('/')
      let routerUrlParts = this.router.url?.split('/') ?? []
      if (linkUrlParts.length <= routerUrlParts.length && every(linkUrlParts, (p, i) => p === routerUrlParts[i])) {
        this.toggleActive(true)
        LastActiveLinks.push(this.weakThis)
        return
      }
    }
    this.toggleActive(false)
  }
  toggleActive(force: boolean) {
    if (force) {
      this.classList.add(this.activeClass)
    } else {
      this.classList.remove(this.activeClass)
    }
  }
  _getPath(): string {
    let path = this.to
    if (isObject(this.to)) {
      if (this.to.name) {
        let item = GlobalRouteNameMap.get(this.to.name)
        if (!item) {
          showTagError('Router', `Cannot find RouterItem with name '${this.to.name}'`)
          return ''
        }
        path = item.path
      } else {
        path = this.to.path!
      }
    }
    return path as string
  }
}
