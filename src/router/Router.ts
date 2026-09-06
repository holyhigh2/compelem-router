import { CompElem } from "compelem";
import { onRouteChange } from "../store";
import { RouterMode, type Route, type RouteItem, type RouteOption } from "../types";
import { navigate } from "../utils";
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
                // 路由状态是唯一数据源：hashchange 只更新状态，
                // 不再依赖 outlet 注册的挂载点（无挂载点也能安全更新）
                window.addEventListener('hashchange', () => {
                    navigate()
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
     * 向路由历史中增加一条记录并导航到指定地址。
     * 返回的 Promise 在「路由状态更新 + 视图重渲染」完成后 resolve，
     * 因此可以直接用于 startViewTransition：
     * ```ts
     * startViewTransition(async () => { await router.push('/about') })
     * ```
     * @param route 
     */
    push(route: string | RouteOption): Promise<void> {
        return this.navigateTo(() => this.routerInstance?.push(route))
    }
    /**
     * 替换当前路由历史记录并导航到指定地址
     * @param route 
     */
    replace(route: string | RouteOption): Promise<void> {
        return this.navigateTo(() => this.routerInstance?.replace(route))
    }

    /**
     * 执行导航动作并等待本次路由变更落地
     */
    private navigateTo(action: () => void): Promise<void> {
        return new Promise<void>((resolve) => {
            let done = false
            const off = onRouteChange(() => {
                if (done) return
                done = true
                off()
                // 宏任务：等待 store 里 forceUpdate 触发的重渲染完成
                setTimeout(resolve, 0)
            })
            action()
            // 兜底：目标地址与当前地址相同时不会触发 hashchange
            setTimeout(() => {
                if (done) return
                done = true
                off()
                resolve()
            }, 100)
        })
    }

    //guards
    async beforeEach(to?: Route, from?: Route) {
        return true
    }
    async beforeResolve(to?: Route, from?: Route) {
        return true
    }
    afterEach(to?: Route, from?: Route) {
    }
}

