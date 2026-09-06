import type { CompElem } from "compelem"
import { assign } from "myfx"
import { RouteReativeHub } from "./components/RouteReativeHub"
import type { Route, RouteItem } from "./types"

export type RouteChangeCallback = (to: Route, from: Route | undefined) => void

let hub: RouteReativeHub | undefined
// 当前匹配的路由项（outlet 结构指令的分支判别依据）
let currentRouteItem: RouteItem | undefined
// 最近一次路由变更的 to/from，供组件守卫回调使用
let lastTo: Route | undefined
let lastFrom: Route | undefined
// 每次路由变更自增，用于判断 outlet 是否需要调用 routeUpdate
let routeVersion = 0

const listeners = new Set<RouteChangeCallback>()
// 注册了 outlet 的宿主组件：路由变化时自动 forceUpdate，驱动结构指令重渲染
const outletHosts = new Set<CompElem>()

export function getRouteHub(): RouteReativeHub {
  if (!hub) {
    hub = new RouteReativeHub()
    hub.setup()
  }
  return hub
}

/**
 * 当前路由信息（响应式代理）
 *
 * 若要在组件内响应式读取，必须把返回值绑定到组件自身的响应字段：
 * ```ts
 * \@state route = useRoute()
 * ```
 * 原因：compelem 的响应式通知按「创建上下文」派发（reactive(obj, context)），
 * 跨组件直接读取不会注册扩展上下文，因此收不到更新通知；绑定到自身
 * state 字段后会完成路径重映射并建立通知链路。
 */
export function useRoute(): Route {
  return getRouteHub().route
}

/**
 * 订阅路由变化。返回取消订阅函数
 */
export function onRouteChange(cb: RouteChangeCallback) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** outlet 宿主注册。路由变化时由 store 统一驱动重渲染 */
export function registerOutletHost(comp: CompElem) {
  outletHosts.add(comp)
}
export function unregisterOutletHost(comp: CompElem) {
  outletHosts.delete(comp)
}

export function getCurrentRouteItem() {
  return currentRouteItem
}
export function getRouteVersion() {
  return routeVersion
}
export function getLastRouteChange(): [Route | undefined, Route | undefined] {
  return [lastTo, lastFrom]
}

/**
 * 更新路由状态并通知所有订阅者 / outlet 宿主。
 * 采用原地 assign 以保持代理身份——已绑定到组件 state 的引用不会失效。
 */
export function setRoute(to: Route, item: RouteItem | undefined, from?: Route) {
  currentRouteItem = item
  lastTo = to
  lastFrom = from
  routeVersion++

  assign(getRouteHub().route, to)
  emitRouteChange(to, from)
}

export function emitRouteChange(to: Route, from?: Route) {
  Array.from(listeners).forEach((cb) => cb(to, from))

  const hosts = Array.from(outletHosts)
  if (!hosts.length) return
  // 延迟到微任务：避免在宿主 render 期间（outlet 首次执行会触发初始导航）
  // 重入 forceUpdate
  Promise.resolve().then(() => {
    hosts.forEach((c) => {
      if (c.isDestroyed) {
        outletHosts.delete(c)
        return
      }
      c.forceUpdate()
    })
  })
}
