/**
 * compelem-router × compelem-devtools 接入点。
 *
 * 设计约束（与 compelem-store 的接入点保持同一套约定）：
 * - **零依赖、零副作用**：未安装 devtools 时这里只是往 globalThis 上挂一个对象，
 *   不注册监听、不持有额外引用；引入本模块不会产生任何可观测行为。
 * - **无环依赖**：本文件**不 import 本包任何其它模块**。provider 的全部能力都由
 *   `createRouter` 在登记时以闭包形式传入，因此 devtools.ts ← utils.ts 不会成环。
 * - **零开销**：路由表 / 当前路由都是「被读时才求值」的惰性函数；订阅走公开的
 *   `onRouteChange()`，面板没打开时 `listeners` 始终为空 → 无任何额外开销。
 *
 * 契约：`globalThis.__COMPELEM_ECOSYSTEM__.router`
 * 三个生态库共用同一个 globalThis 槽位，各自占一个命名空间键。
 */

export const ECOSYSTEM_KEY = '__COMPELEM_ECOSYSTEM__'

/** 路由表节点的可序列化投影（RouteItem 含 component 构造函数，不能直接透传） */
export interface RouterDevtoolsRouteNode {
  path: string
  name?: string
  redirect?: string
  /** 组件构造函数名（匿名组件为 'Anonymous'） */
  component?: string
  meta?: Record<string, any>
  /** 是否声明了路由项守卫 */
  hasBeforeEnter?: boolean
  /** 是否为通配兜底路由（path === '*'） */
  isDefault?: boolean
  /** 路径段解析结果，devtools 用它解释"为什么匹配/不匹配" */
  segments?: Array<{ text: string; isStatic: boolean; isWildcard: boolean; isOptional: boolean }>
  children?: RouterDevtoolsRouteNode[]
}

/** 当前路由的可序列化快照 */
export interface RouterDevtoolsCurrentRoute {
  path: string
  fullPath: string
  hash?: string
  name?: string
  params?: Record<string, any>
  query?: Record<string, any>
  queryString?: string
  meta?: Record<string, any>
  /** 匹配链（由外到内），只保留可序列化字段 */
  matched?: Array<{ path: string; name?: string; component?: string }>
  /** 路由版本号，每次变更自增 */
  version: number
  /** 最近一次变更的 from（用于排查"从哪跳来的"） */
  from?: { path: string; fullPath: string; name?: string } | null
  /** 路由驱动模式 */
  mode: string
  /** 当前 url（不含 hash 前缀） */
  url?: string
}

/** 一次「URL → 命中哪条路由」的试算结果 */
export interface RouterDevtoolsMatchResult {
  url: string
  matched: boolean
  /** 命中的最深路由项 */
  routeItem?: { path: string; name?: string; component?: string; redirect?: string }
  /** 匹配链（由外到内） */
  chain?: Array<{ path: string; name?: string; component?: string; redirect?: string }>
  /** 动态参数 */
  params?: Record<string, string>
  /** 实际被消费的路径段 */
  matchedPath?: string[]
}

/** 导航动作 */
export type RouterDevtoolsAction = 'push' | 'replace' | 'back' | 'forward' | 'go'

export interface RouterDevtoolsEntry {
  /** 路由实例 id（本包为单例，固定 'router'；重复 createRouter 会覆盖） */
  id: string
  /** 路由表树（惰性求值） */
  routes: () => RouterDevtoolsRouteNode[]
  /** 当前路由快照（惰性求值） */
  current: () => RouterDevtoolsCurrentRoute | null
  /** 「URL → 命中路由」试算，**无副作用**（不污染当前路由状态） */
  match: (url: string) => RouterDevtoolsMatchResult
  /** 导航控制：push / replace / back / forward / go */
  navigate: (action: RouterDevtoolsAction, payload?: any) => Promise<{ ok: boolean; url?: string; error?: string }>
  /** 订阅路由变更，返回退订函数 */
  subscribe: (cb: (to: any, from: any) => void) => () => void
}

export interface RouterDevtoolsProvider {
  /** 全部已登记的路由实例 id（正常只有一个） */
  list(): string[]
  /** 按 id 取接入项 */
  entry(id: string): RouterDevtoolsEntry | undefined
  /** 便捷取第一个（单例场景） */
  active(): RouterDevtoolsEntry | undefined
}

/**
 * 单例注册表：模块级 Map 而非 globalThis，保证多入口（ESM / UMD）下也只有一个。
 * devtools 只通过 provider 的方法访问它，不直接暴露 Map。
 */
const entries = new Map<string, RouterDevtoolsEntry>()

/**
 * 取得（必要时创建）provider 并挂到 globalThis。
 * 保留已存在的 `__COMPELEM_ECOSYSTEM__` 对象（store / i18n 可能先挂上来了）。
 */
function provider(): RouterDevtoolsProvider {
  const g = globalThis as any
  const eco = (g[ECOSYSTEM_KEY] = g[ECOSYSTEM_KEY] || {})
  if (!eco.router) {
    const p: RouterDevtoolsProvider = {
      list: () => Array.from(entries.keys()),
      entry: (id: string) => entries.get(id),
      active: () => entries.values().next().value,
    }
    Object.defineProperty(eco, 'router', {
      value: p,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }
  return eco.router
}

/**
 * 由 createRouter 内部调用：登记路由实例。
 * 路由在本包中是模块级单例（`let router`），重复 createRouter 会让旧实例失去
 * `navigate()` 的引用而成为死对象，因此这里直接覆盖同 id 的登记项。
 */
export function registerRouterDevtools(entry: RouterDevtoolsEntry): void {
  entries.set(entry.id, entry)
  provider()
}

/** 摘除登记（保留给测试 / 热重载） */
export function unregisterRouterDevtools(id: string): void {
  entries.delete(id)
}

/** 清空登记 */
export function clearRouterDevtools(): void {
  entries.clear()
}

/** 供控制台 / 测试直接读取全部登记项 */
export function getRouterDevtoolsEntries(): RouterDevtoolsEntry[] {
  return Array.from(entries.values())
}

/**
 * 模块加载期即把 provider 挂到 globalThis。
 *
 * 目的是让 devtools 能区分两种「没有 router」：
 * - **本库未加载** → `__COMPELEM_ECOSYSTEM__.router` 不存在；
 * - **本库已加载但尚未 createRouter** → 命名空间在、`list()` 为空。
 *
 * 若只在 `registerRouterDevtools` 里懒挂，两者对外完全同形，面板无法给出准确提示。
 * 这里只挂一个惰性 provider 对象（不注册监听、不持有额外引用、`list()` 才求值），
 * 因此「零副作用 / 零开销」的约束依然成立。
 */
provider()
