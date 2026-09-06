import type { CompElem, Constructor } from "compelem"
import { RouterLink } from "./components/RouterLink"
import type { RouteItem, RouteItemDerivedInfo, RouteItemMatchedInfo } from "./types"

export const ComponentContainersMap = new WeakMap<CompElem, Record<string, HTMLElement>>()
export const RootRouteContainers: Record<string, HTMLElement> = {}
export const ComponentRoutesMap = new WeakMap<CompElem, RouteItem>()
export const RouteItemDerivedMap = new WeakMap<RouteItem, RouteItemDerivedInfo>()
export const RouteMatchedInfo = {
    current: {} as RouteItemMatchedInfo,
    last: {} as RouteItemMatchedInfo
}
export const PATH_SPLITTER = /(?<!\\)\//
export const PATH_PATTERN = /:(?<param>\w+)(\{(?<exp>[^}]+)\})?/
export const RootComponentContainerMap = new WeakMap()
export const EntrancePropsMap = new WeakMap()
export const GlobalRouteNameMap = new Map<string, RouteItem>()

export const RouterLinkToMap = new Map<string, WeakRef<RouterLink>[]>()
export const RouterLinkToExactMap = new Map<string, WeakRef<RouterLink>[]>()
export const LastActiveLinks = new Array<WeakRef<RouterLink>>()
export const ROUTE_REDIRECT_FLAT = 'c-route-redirect'

//记录每个outlet渲染组件
export const OutletRenderedMap = new WeakMap<Node, CompElem>()
//outlet 挂载点 -> 组件守卫观察器（routeEnter/routeLeave）
export const GuardObserverMap = new WeakMap<Node, MutationObserver>()
//嵌套组件路由关系
export const NextRouteOnComp = new Map<Constructor<any>, RouteItem>()