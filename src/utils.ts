import { CompElem, showTagError } from "compelem"
import { clone, compact, concat, each, eachRight, every, filter, flatMap, isEmpty, isString, isUndefined, join, last, map, remove, set, trim } from "myfx"
import qs from 'query-string'
import { ComponentRoutesMap, EntrancePropsMap, GlobalRouteNameMap, LastActiveLinks, NextRouteOnComp, OutletRenderedMap, PATH_PATTERN, PATH_SPLITTER, RootComponentContainerMap, ROUTE_REDIRECT_FLAT, RouteItemDerivedMap, RouteMatchedInfo, RouterLinkToExactMap, RouterLinkToMap } from "./const"
import { Router } from "./router/Router"
import { getRouteHub, setRoute } from "./store"
import type { MatchableRouteMeta, Route, RouteItem, RouteItemDerivedInfo, RouteItemMatchedInfo, RouteOption, RouterOption } from "./types"

let router: Router
//可选匹配列表
let MatchableRoutes: MatchableRouteMeta[]
//当前路由参数
const CurrentRouteInfo: RouteItemMatchedInfo = { routeMeta: {} as any, matchedPath: [] }

export function createRouter(options: RouterOption) {
    // 初始化路由状态宿主（响应式代理的创建上下文）
    getRouteHub()
    router = new Router(options.mode)
    if (options.beforeEach)
        router.beforeEach = options.beforeEach
    if (options.beforeResolve)
        router.beforeResolve = options.beforeResolve
    if (options.afterEach)
        router.afterEach = options.afterEach
    MatchableRoutes = []
    each(options.routes, r => {
        let segs = compact(r.path.split(PATH_SPLITTER))
        buildPathSegments(r, segs, null)
    })
    router.routes = options.routes
    return router
}

export function useRouter() {
    return router
}

/**
 * 执行路由匹配与守卫，**只更新路由状态，不操作 DOM**。
 * 视图渲染由 outlet 结构指令负责——这样切换过程才会经过
 * 指令更新周期（产出 REPLACE），从而支持过渡动画。
 */
export async function navigate() {
    router.routerInstance!.render(async (newUrl, newQueryString) => {
        console.log('[navigate] cbk start, url:', newUrl)
        router.url = newUrl

        CurrentRouteInfo.params = {}
        CurrentRouteInfo.queryString = newQueryString
        CurrentRouteInfo.query = qs.parse(newQueryString) as any
        CurrentRouteInfo.matchedPath = []

        let targetRoute = matchRoutes(router.routes, newUrl)

        let redirect = targetRoute.routeItem?.redirect
        if (redirect) {
            router.replace(redirect)
            return
        }

        NextRouteOnComp.clear()
        each(targetRoute.routeStack, (r, i) => {
            let nextR = targetRoute.routeStack[i + 1]
            if (r.component && nextR) {
                NextRouteOnComp.set(r.component, nextR)
            }
        })

        CurrentRouteInfo.routeMeta = targetRoute

        let dels: any[] = []
        remove(LastActiveLinks, link => !link.deref() || link.deref()?.isDestroyed)
        //router-link active
        each(LastActiveLinks, link => {
            link.deref()?.toggleActive(false)
            dels.push(link)
        })
        remove(LastActiveLinks, link => dels.includes(link))
        // let redirectFlat = sessionStorage.getItem(ROUTE_REDIRECT_FLAT)
        sessionStorage.removeItem(ROUTE_REDIRECT_FLAT)
        if (targetRoute) {
            let exactLinks = RouterLinkToExactMap.get(newUrl)!
            let links = RouterLinkToMap.get(newUrl)!
            // remove(exactLinks, link => !link.deref())
            each(exactLinks, link => {
                link.deref()?.toggleActive(true)
                LastActiveLinks.push(link)
            })
            // remove(links, link => !link.deref())
            each(links, link => {
                let linkUrl = link.deref()?._getPath()!
                let linkUrlParts = linkUrl.split('/')
                let routerUrlParts = newUrl.split('/')
                if (linkUrlParts.length <= routerUrlParts.length && every(linkUrlParts, (p, i) => p === routerUrlParts[i])) {
                    link.deref()?.toggleActive(true)
                    LastActiveLinks.push(link)
                }
            })
        }

        let startI = 0
        each(RouteMatchedInfo.last?.routeMeta?.routeStack, (r, i) => {
            if (r !== CurrentRouteInfo.routeMeta.routeStack[i]) {
                startI = i
                return false
            }
        })

        const r = CurrentRouteInfo.routeMeta.routeStack[startI]
        const fromRouteItem = RouteMatchedInfo.last.routeMeta?.routeItem

        // 路由项守卫
        if (r?.beforeEnter instanceof Function) {
            let rs = await r.beforeEnter(r, fromRouteItem)
            if (rs !== true) return false
        }

        let fromRoute = buildRoute(fromRouteItem, RouteMatchedInfo.last.matchedPath)
        let toRoute = buildRoute(CurrentRouteInfo.routeMeta.routeItem)
        if (!toRoute) return false

        // 全局守卫
        if (await router.beforeEach(toRoute, fromRoute) !== true) return false
        if (await router.beforeResolve(toRoute, fromRoute) !== true) return false

        // 只更新路由状态：DOM 由 outlet 结构指令渲染
        setRoute(toRoute, CurrentRouteInfo.routeMeta.routeItem, fromRoute)
        router.afterEach(toRoute, fromRoute)

        RouteMatchedInfo.last = clone(CurrentRouteInfo)
    })
}
export async function renderRoute(targetRoute: RouteItem, pointNode: Node, props?: Record<string, any>, updateRoute?: Function) {
    if (targetRoute) {
        let fromRouteItem = RouteMatchedInfo.last.routeMeta?.routeItem
        if (targetRoute.beforeEnter instanceof Function) {
            let rs = await targetRoute.beforeEnter(targetRoute, fromRouteItem)
            if (rs !== true) return true
        }

        if (updateRoute) updateRoute()

        let fromRoute = buildRoute(fromRouteItem, RouteMatchedInfo.last.matchedPath)
        let toRoute = buildRoute(CurrentRouteInfo.routeMeta.routeItem)
        //todo 这里组件自身不直接实现守卫，通过useRouteGuard()实现
        let lastComponent = OutletRenderedMap.get(pointNode) as any
        //组件守卫

        if (lastComponent?.routeLeave)
            lastComponent?.routeLeave(toRoute, fromRoute)

        let c
        if (lastComponent) {
            if (lastComponent instanceof targetRoute.component!) {
                c = lastComponent
            } else {
                c = new targetRoute.component!()
                lastComponent.parentNode?.replaceChild(c, lastComponent);
                //todo 这里可以增加缓存
                (lastComponent as CompElem).destroy()
            }
        } else {
            c = new targetRoute.component!();
            (pointNode as HTMLElement).before(c)
        }

        OutletRenderedMap.set(pointNode!, c)

        ComponentRoutesMap.set(c, targetRoute)

        //组件守卫
        if (c.routeEnter) {
            c.routeEnter(toRoute, fromRoute)
        }

        //入口参数
        if (c && props) {
            each(props, (p, k) => {
                set(c, k, p)
            })
        }
    }
    else if (pointNode) {
        let lastComponent = OutletRenderedMap.get(pointNode!) as any
        //守卫
        if (lastComponent?.routeLeave) {
            let fromRoute = buildRoute(last(RouteMatchedInfo.last.routeMeta!.routeStack!))
            lastComponent?.routeLeave(undefined, fromRoute)
        }
        lastComponent.remove();
        (lastComponent as CompElem).destroy()
        OutletRenderedMap.delete(pointNode!)
    }
}
export function buildRoute(routeItem?: RouteItem, matchedPath?: string[]) {
    if (!routeItem) return routeItem
    let rs: Route = { path: '', fullPath: '' }
    let targetIndex = CurrentRouteInfo.routeMeta?.routeStack?.findIndex(item => item === routeItem) ?? -1

    // 归一路径：始终带前导斜杠，与 router.url 语义一致
    rs.path = '/' + ((matchedPath ?? CurrentRouteInfo.matchedPath?.slice(0, targetIndex + 1))?.join('/') ?? '')
    rs.query = CurrentRouteInfo.query
    rs.queryString = CurrentRouteInfo.queryString
    rs.fullPath = rs.path + (rs.queryString ? '?' + rs.queryString : '')
    rs.params = Object.freeze(CurrentRouteInfo.params)
    // rs.redirectedFrom = routeItem.redirect
    rs.meta = routeItem.meta
    rs.matched = clone(CurrentRouteInfo.routeMeta?.routeStack!)

    return rs
}
export function matchRoutes(routeList: RouteItem[], targetUrl: string) {
    let targetSegments = compact(targetUrl.split('/'))

    let defaultRoute
    each(routeList, r => {
        let derived = RouteItemDerivedMap.get(r)
        if (derived?.isDefault) {
            defaultRoute = { routeItem: r }
        }
    })
    let matchList: MatchableRouteMeta[] = []
    let alternatives: RouteItem[] = []
    let matchedPath: string[] = []
    let toMatchList = MatchableRoutes.filter(r => targetSegments.length >= r.minLength)
    each(targetSegments, (tSeg, tSegIndex) => {
        matchList = flatMap(toMatchList, r => {
            let seg = r.pathSegments[tSegIndex]
            if (!seg) {
                return []
            }
            if (seg.isStatic) {
                if (seg.isWildcard) {
                    return r
                } else if (seg.text === tSeg) {
                    return r
                }
            } else {
                let rs = seg.text.match(PATH_PATTERN)
                let { param, exp } = rs?.groups ?? {}
                if (rs && exp) {
                    let testStr = tSeg.replace(rs[0], '')
                    let expChecker = new RegExp(exp)
                    if (expChecker.test(testStr)) {
                        CurrentRouteInfo.params![param] = testStr
                    } else {
                        return []
                    }
                } else {
                    CurrentRouteInfo.params![param] = tSeg
                }
                return r
            }

            return []
        })
        if (!isEmpty(routeList)) {
            matchedPath.push(tSeg)
        } else {
            return false
        }
    })

    let zMatch = filter(toMatchList, m => m.minLength < 1)
    if (targetSegments.length < 1 && zMatch[0]) {
        matchList.push(zMatch[0])
    }

    let rs1 = matchList[0]
    let rs2 = alternatives[0]
    let rs = rs1 ?? rs2
    if (rs) {
        CurrentRouteInfo.matchedPath = matchedPath
    }
    return rs || defaultRoute
}
export function setEntryComponent(comp: CompElem, con: Node, props?: Record<string, any>) {
    if (router.entryComponent) return false
    router.entryComponent = comp
    RootComponentContainerMap.set(comp, con)
    EntrancePropsMap.set(con, props)
}

function buildPathSegments(r: RouteItem, segs: string[], parentRoute: RouteItem | null, pathSegs: Record<string, any>[] = [], stackRoutes: RouteItem[] = []) {
    let segLastIndex = segs.length - 1
    let derived = {} as RouteItemDerivedInfo
    let pathSegments = derived.pathSegments = segs.map((seg, i) => {
        let isStatic = !seg.includes(':')
        let isWildcard = seg === '*'
        let isOptional = false
        if (seg[0] === '?' && segLastIndex === i && isEmpty(r.children)) {
            isOptional = true
            seg = seg.substring(1)
        }
        return { text: seg, isStatic, isWildcard, isOptional }
    })
    if (r.path === '*' && segLastIndex === 0) {
        derived.isDefault = true
    }
    if (r.name) {
        GlobalRouteNameMap.set(r.name, r)
    }
    if (parentRoute) {
        derived.parentRouteItem = parentRoute
    }
    RouteItemDerivedMap.set(r, derived)

    if (r.component || r.redirect) {
        stackRoutes.push(r)
        pathSegments = concat(pathSegs, pathSegments)
        let i = pathSegments.length
        eachRight(pathSegments, seg => {
            if (seg.isOptional) {
                i--
                return
            }
            return false
        })
        MatchableRoutes.push({ routeItem: r, pathSegments, routeStack: stackRoutes, minLength: i })
    }

    if (r.children) {
        each(r.children, cr => {
            let segs = compact(cr.path.split(PATH_SPLITTER))
            buildPathSegments(cr, segs, r, pathSegments, clone(stackRoutes))
        })
    }

}
export function buildRoutePath(route: RouteOption) {
    let routeItem = GlobalRouteNameMap.get(route?.name ?? '')
    if (!routeItem) return
    let params = route.params
    let pathAry: string[] = []
    while (routeItem) {
        let derived: RouteItemDerivedInfo = RouteItemDerivedMap.get(routeItem)!
        let pathStr = join(map(derived.pathSegments!, seg => {
            let rs = ''
            if (seg.isStatic) {
                rs = seg.text
            } else {
                rs = seg.text.replace(PATH_PATTERN, (_a: string, b: string) => {
                    if (!params || isUndefined(params[b])) {
                        showTagError('Router', `Missing URL param '${b}'`)
                        return
                    }

                    return params[b]
                })
            }
            if (rs[0] === '?') {
                rs = trim(rs).substring(1)
            }
            return rs
        }), '/')
        pathAry.unshift(pathStr)
        routeItem = derived.parentRouteItem
    }
    let query = ''
    if (route.query) {
        if (isString(route.query)) {
            query = route.query
        } else {
            query = qs.stringify(route.query)
        }
        query = query.replace(/^\?/, '')
    }
    return '/' + join(pathAry, '/') + '?' + query
}