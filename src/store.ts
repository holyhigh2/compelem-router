import type { CompElem } from "compelem"
import { batch, signal } from "compelem"
import type { Route, RouteItem } from "./types"

export type RouteChangeCallback = (to: Route, from: Route | undefined) => void

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

/**
 * 路由状态本体：顶层每个字段各持有一个 signal。
 * Proxy 读字段时读对应 signal（读即在当前 effect/computed 里建依赖），
 * 写字段时写对应 signal（写即通知订阅者）。
 */
const routeState: Route = {
  path: "/",
  fullPath: "/",
  query: {},
  queryString: "",
  params: {},
  matched: [],
  meta: {},
}
const routeSigs = new Map<string, ReturnType<typeof signal<any>>>()

function routeSig(key: string) {
  let sig = routeSigs.get(key)
  if (!sig) {
    sig = signal((routeState as any)[key])
    routeSigs.set(key, sig)
  }
  return sig
}

/**
 * 响应式路由状态（模块级单例，跨组件共享同一身份）
 */
export const routeProxy: Route = new Proxy(routeState, {
  get(target, key, receiver) {
    if (typeof key === "symbol") return Reflect.get(target, key, receiver)
    return routeSig(key).value
  },
  set(target, key, value, receiver) {
    if (typeof key === "symbol") return Reflect.set(target, key, value, receiver)
    routeSig(key).value = value
    return Reflect.set(target, key, value, receiver)
  },
  deleteProperty(target, key) {
    if (typeof key !== "symbol") routeSigs.delete(key)
    return Reflect.deleteProperty(target, key)
  },
})

/**
 * 当前路由信息（响应式代理）
 *
 */
export function useRoute(): Route {
  return routeProxy
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
 */
export function setRoute(to: Route, item: RouteItem | undefined, from?: Route) {
  currentRouteItem = item
  lastTo = to
  lastFrom = from
  routeVersion++

  batch(() => {
    const next = to as Record<string, any>
    for (const key of Object.keys(next)) {
      ; (routeProxy as any)[key] = next[key]
    }
  })
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