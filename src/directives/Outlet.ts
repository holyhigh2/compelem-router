import type { CompElem } from "compelem"
import { EnterPointType, directive, isCompElemNode } from "compelem"
import { GuardObserverMap, NextRouteOnComp, OutletRenderedMap } from "../const"
import {
  getCurrentRouteItem,
  getLastRouteChange,
  getRouteVersion,
  registerOutletHost,
} from "../store"
import type { RouteItem } from "../types"
import { navigate, renderRoute, setEntryComponent, useRouter } from "../utils"

// 每个 outlet 挂载点当前已渲染的路由项：只在目标路由项变化时才重新渲染
const RenderedRouteMap = new WeakMap<Node, RouteItem | undefined>()
// 每个 outlet 挂载点已应用的路由版本号，用于判断是否需要 routeUpdate
const VersionMap = new WeakMap<Node, number>()

/**
 * 监听 outlet 挂载点的子节点变化，在路由组件进入/离开 DOM 时
 * 记录 OutletRenderedMap，保证 routeLeave 能正确配对。
 */
function ensureGuardObserver(pointNode: Node) {
  if (GuardObserverMap.has(pointNode)) return
  const parent = pointNode.parentNode
  if (!parent) return
  const ob = new MutationObserver((records) => {
    const [to, from] = getLastRouteChange()
    records.forEach((r) => {
      r.addedNodes.forEach((n: any) => {
        if (n.nodeType !== 1 || !isCompElemNode(n)) return
        const prev = OutletRenderedMap.get(pointNode) as any
        if (prev && prev !== n) prev.routeLeave?.(to, from)
        OutletRenderedMap.set(pointNode, n)
      })
      r.removedNodes.forEach((n: any) => {
        if (OutletRenderedMap.get(pointNode) === n) {
          OutletRenderedMap.delete(pointNode)
            ; (n as any).routeLeave?.(to, from)
        }
      })
    })
  })
  ob.observe(parent, { childList: true })
  GuardObserverMap.set(pointNode, ob)
}

/**
 * 路由内容显示出口（结构指令，文本位使用）。
 *
 * ```html
 * <div class="page">${outlet()}</div>
 * <div class="page">${outlet({ entry: 'side' })}</div>
 * ```
 *
 *
 * @param props 传递给路由组件的属性
 */
export const outlet = directive(function Outlet(props?: Record<string, any>) {
  return (pointNode: Node, newArgs: any[], oldArgs: any[] | undefined, meta?: { renderComponent?: CompElem }) => {
    const router = useRouter()
    const comp = meta?.renderComponent!
    const outletProps = (newArgs[0] ?? props) as Record<string, any> | undefined

    // 注册入口组件 / 挂载点
    setEntryComponent(comp, pointNode, outletProps)
    registerOutletHost(comp)

    if (!oldArgs && router?.entryComponent === comp) {
      // 首次渲染：完成初始深链匹配（首次加载不会触发 hashchange）
      navigate()
    }

    // 根出口渲染当前匹配项；嵌套出口渲染父路由登记的下一级路由项
    const targetRoute: RouteItem | undefined =
      router?.entryComponent === comp
        ? getCurrentRouteItem()
        : (NextRouteOnComp.get(comp.constructor as any) as RouteItem | undefined)

    const rendered = RenderedRouteMap.get(pointNode)
    if (targetRoute === rendered) return
    RenderedRouteMap.set(pointNode, targetRoute)

    const version = getRouteVersion()
    const lastVersion = VersionMap.get(pointNode)
    VersionMap.set(pointNode, version)

    ensureGuardObserver(pointNode)

    const last = OutletRenderedMap.get(pointNode) as any
    void renderRoute(targetRoute as RouteItem, pointNode, outletProps).then(() => {
      const c = OutletRenderedMap.get(pointNode) as any
      if (!c || !last) return
      // 同一组件实例复用、仅参数变化 → 触发 routeUpdate
      if (c === last && lastVersion !== undefined && lastVersion !== version) {
        const [to, from] = getLastRouteChange()
        c.routeUpdate?.(to, from)
      }
    })
  }
}, [EnterPointType.TEXT, EnterPointType.SLOT])