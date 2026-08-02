import type { Constructor } from "compelem"

export interface RouteOption {
    name?: string
    path?: string
    params?: Record<string, string | number>
    query?: Record<string, string | number> | string
}
/**
 * 路由项信息，用于创建路由表
 */
export interface RouteItem {
    //路径
    path: string
    //路由表唯一名称，
    name?: string
    //路由对应组件，如果有children可为空
    component?: Constructor<any>
    //重定向路径
    redirect?: string
    //子路由项数组
    children?: Array<RouteItem>
    //路由项元数据，可被传递给守卫回调
    meta?: Record<string, any>
    //路由项守卫
    beforeEnter?: (to: RouteItem, from: RouteItem | undefined) => Promise<boolean>
}

export interface RouteItemDerivedInfo {
    pathSegments?: Array<{ text: string, isStatic: boolean, isWildcard: boolean, isOptional: boolean }>
    isDefault?: boolean
    parentRouteItem?: RouteItem
}

export interface RouteItemMatchedInfo {
    routeMeta: MatchableRouteMeta
    matchedPath: string[]
    params?: Record<string, string>
    query?: Record<string, string>
    queryString?: string
}

/**
 * 可匹配路由信息
 */
export interface MatchableRouteMeta {
    pathSegments: Record<string, any>[]
    routeItem: RouteItem
    routeStack: RouteItem[]
    //最小匹配长度
    minLength: number
}

/**
 * 路由信息。用于了解当前路由的详细信息
 */
export class Route {
    path: string = ''
    //含参数的全路径
    fullPath: string = ''
    hash?: string = ''

    //动态参数
    params?: Record<string, string | string[]>
    //url参数
    query?: Record<string, string | string[]>
    queryString?: string

    //当前匹配路由项的name
    name?: string
    //匹配路由项数组，按层级排序
    matched?: RouteItem[]

    //重定向来源路由点
    redirectedFrom?: Route
    //路由点元数据
    meta?: Record<string, any>
}


export interface ComponentGuards {
    routeEnter: (to?: Route, from?: Route) => void
    routeUpdate: (from?: Route, to?: Route) => void
    routeLeave: (from?: Route, to?: Route) => void
}

export const RouterMode = {
    Hash: 'hash',
    History: 'history'
} as const;

export type RouterMode = typeof RouterMode[keyof typeof RouterMode];

export type PromiseRouteCallback = (to?: Route, from?: Route) => Promise<boolean>
export type RouteCallback = (to?: Route, from?: Route) => void
export interface RouterOption {
    mode: RouterMode
    routes: RouteItem[]
    beforeEach?: PromiseRouteCallback
    beforeResolve?: PromiseRouteCallback
    afterEach?: RouteCallback
}