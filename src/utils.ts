import { CompElem, showTagError } from "compelem"
import { clone, compact, concat, each, eachRight, every, filter, flatMap, isEmpty, isString, isUndefined, join, last, map, remove, set, trim } from "myfx"
import qs from 'query-string'
import { ComponentRoutesMap, EntrancePropsMap, GlobalRouteNameMap, LastActiveLinks, NextRouteOnComp, OutletRenderedMap, PATH_PATTERN, PATH_SPLITTER, RootComponentContainerMap, ROUTE_REDIRECT_FLAT, RouteItemDerivedMap, RouteMatchedInfo, RouterLinkToExactMap, RouterLinkToMap } from "./const"
import { Router } from "./router/Router"
import { registerRouterDevtools, type RouterDevtoolsEntry, type RouterDevtoolsRouteNode } from "./devtools"
import { getLastRouteChange, getRouteHub, getRouteVersion, onRouteChange, setRoute } from "./store"
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
    // devtools 接入点：未安装 devtools 时这里只是往 globalThis 挂一个惰性 provider
    registerRouterDevtools(buildRouterDevtoolsEntry(options.mode))
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

        // 无任何匹配（且未注册通配符兜底路由）时放弃本次导航
        if (!targetRoute) return false

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

    if (RouteItemDerivedMap.get(routeItem)?.isDefault) {
        targetIndex = (CurrentRouteInfo.matchedPath?.length ?? 1) - 1
    }

    // 归一路径：始终带前导斜杠，与 router.url 语义一致
    rs.path = '/' + ((matchedPath ?? CurrentRouteInfo.matchedPath?.slice(0, targetIndex + 1))?.join('/') ?? '')
    rs.query = CurrentRouteInfo.query
    rs.queryString = CurrentRouteInfo.queryString
    rs.fullPath = rs.path + (rs.queryString ? '?' + rs.queryString : '')
    rs.params = Object.freeze(CurrentRouteInfo.params)
    rs.meta = routeItem.meta
    rs.name = routeItem.name
    rs.matched = clone(CurrentRouteInfo.routeMeta?.routeStack!)

    return rs
}
/**
 * 路由匹配。**只做匹配，不落地路由状态**（状态由调用方决定写到哪里）。
 *
 * @param sink 匹配结果的写入目标。默认写模块级的 `CurrentRouteInfo`（即真实的
 *   当前路由状态）。devtools 的「URL 试算」会传入一个临时 sink，从而在不污染
 *   当前路由的前提下回答"这个 URL 会命中哪条路由"。
 */
export function matchRoutes(routeList: RouteItem[], targetUrl: string, sink: RouteItemMatchedInfo = CurrentRouteInfo) {
    let targetSegments = compact(targetUrl.split('/'))

    let defaultRoute: MatchableRouteMeta | undefined
    each(routeList, r => {
        let derived = RouteItemDerivedMap.get(r)
        if (derived?.isDefault) {
            defaultRoute = { routeItem: r, pathSegments: [], routeStack: [r], minLength: 0 }
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
                        sink.params![param] = testStr
                    } else {
                        return []
                    }
                } else {
                    sink.params![param] = tSeg
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
        sink.matchedPath = matchedPath
        return rs
    }

    if (defaultRoute) {
        sink.matchedPath = targetSegments
    }
    return defaultRoute
}
/**
 * 「URL → 命中哪条路由」试算。**完全无副作用**：
 * 用一次性 sink 承接 matchRoutes 的参数/路径写入，不触碰真实的 `CurrentRouteInfo`。
 * 因此可以在任意时刻被 devtools 反复调用，用于回答"为什么我的路由没匹配上"。
 */
export function tryMatchRoute(url: string) {
    const sink: RouteItemMatchedInfo = {
        routeMeta: {} as MatchableRouteMeta,
        matchedPath: [],
        params: {},
        query: {},
        queryString: '',
    }
    const meta = matchRoutes(router?.routes ?? [], url, sink)
    if (!meta || !meta.routeItem) {
        return { url, matched: false, chain: [], params: {}, matchedPath: sink.matchedPath ?? [] }
    }
    return {
        url,
        matched: true,
        routeItem: toRouteBrief(meta.routeItem),
        chain: (meta.routeStack ?? []).map(toRouteBrief),
        params: { ...(sink.params ?? {}) },
        matchedPath: sink.matchedPath ?? [],
    }
}

// ---------------------------------------------------------------------------
// devtools 接入
// ---------------------------------------------------------------------------

function componentName(c?: unknown) {
    if (!c) return undefined
    return (c as any).name || 'Anonymous'
}

/** RouteItem → 可序列化的简要投影（component 是构造函数，不能直接透传） */
function toRouteBrief(r: RouteItem) {
    return {
        path: r.path,
        name: r.name,
        component: componentName(r.component),
        redirect: r.redirect,
    }
}

/** RouteItem → 可序列化的路由表节点（含 devtools 解释匹配用的段解析结果） */
function toRouteNode(r: RouteItem): RouterDevtoolsRouteNode {
    const derived = RouteItemDerivedMap.get(r)
    return {
        path: r.path,
        name: r.name,
        redirect: r.redirect,
        component: componentName(r.component),
        meta: r.meta,
        hasBeforeEnter: typeof r.beforeEnter === 'function',
        isDefault: !!derived?.isDefault,
        segments: derived?.pathSegments?.map(s => ({
            text: s.text,
            isStatic: s.isStatic,
            isWildcard: s.isWildcard,
            isOptional: s.isOptional,
        })),
        children: r.children?.length ? r.children.map(toRouteNode) : undefined,
    }
}

/** Route → 可序列化快照（matched 是 RouteItem[]，只保留 path/name/component） */
function snapshotRoute(r?: Route | null) {
    if (!r) return null
    return {
        path: r.path,
        fullPath: r.fullPath,
        hash: r.hash,
        name: r.name,
        params: r.params ? { ...r.params } : undefined,
        query: r.query ? { ...r.query } : undefined,
        queryString: r.queryString,
        meta: r.meta,
        matched: r.matched?.map(m => ({ path: m.path, name: m.name, component: componentName(m.component) })),
    }
}

/** 组装登记项。全部能力以闭包形式持有，devtools.ts 因此不需要 import 本模块。 */
function buildRouterDevtoolsEntry(mode: string): RouterDevtoolsEntry {
    return {
        id: 'router',
        routes: () => (router?.routes ?? []).map(toRouteNode),
        current: () => {
            const snap = snapshotRoute(getRouteHub().route as Route)
            if (!snap) return null
            const [, lastFrom] = getLastRouteChange()
            return {
                ...snap,
                version: getRouteVersion(),
                from: snapshotRoute(lastFrom),
                mode,
                url: router?.url,
            }
        },
        match: (url: string) => tryMatchRoute(url),
        navigate: async (action, payload) => {
            try {
                switch (action) {
                    case 'back': router.back(); return { ok: true }
                    case 'forward': router.forward(); return { ok: true }
                    case 'go': router.go(Number(payload) || 0); return { ok: true }
                    case 'replace': await router.replace(payload); return { ok: true, url: router.url }
                    case 'push':
                    default: await router.push(payload); return { ok: true, url: router.url }
                }
            } catch (e: any) {
                return { ok: false, error: String(e?.message ?? e) }
            }
        },
        subscribe: (cb) => onRouteChange((to, from) => cb(snapshotRoute(to), snapshotRoute(from))),
    }
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