import { CompElem } from "compelem";
import { EntrancePropsMap, RootComponentContainerMap } from "../const";
import { RouterMode, type RouteItem, type RouteOption } from "../types";
import { renderRootRoute } from "../utils";
import { HashRouter } from "./HashRouter";
import { Routable } from "./Routable";


/**
 * 路由控制器，单例。负责监控url变化并分发给Routes；控制路由前进、后退、跳转等
 */
export class Router {
    url: string | undefined
    queryString: string = ''
    query: Record<string, any> = {}
    routes: RouteItem[] = []
    routerInstance: Routable | undefined
    entryComponent: CompElem | undefined
    constructor(mode: string) {
        switch (mode) {
            case RouterMode.Hash:
                this.routerInstance = HashRouter.getInstance()
                const that = this
                window.addEventListener('hashchange', (e) => {
                    let entranceNode = RootComponentContainerMap.get(that.entryComponent!)
                    let props = EntrancePropsMap.get(entranceNode)

                    renderRootRoute(entranceNode, props)
                })
                break
            case RouterMode.History:
                break
        }
    }

    /**
     * 同history.go
     */
    go(delta: number) {
        this.routerInstance?.go(delta)
    }
    /**
     * 同history.back
     */
    back() {
        this.routerInstance?.back()
    }
    /**
     * 同history.forward
     */
    forward() {
        this.routerInstance?.forward()
    }
    /**
     * 向路由历史中增加一条记录并导航到指定地址
     * @param route 
     */
    push(route: string | RouteOption) {
        this.routerInstance?.push(route)
    }
    /**
     * 替换当前路由历史记录并导航到指定地址
     * @param route 
     */
    replace(route: string | RouteOption) {
        this.routerInstance?.replace(route)
    }

    //guards
    async beforeEach() {
        return true
    }
    async beforeResolve() {
        return true
    }
    afterEach() {
    }
}

