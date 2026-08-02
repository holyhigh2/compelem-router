import { isObject, isString } from "myfx";
import { ROUTE_REDIRECT_FLAT } from "../const";
import type { RouteOption } from "../types";
import { buildRoutePath } from "../utils";
import { Routable } from "./Routable";

/**
 * 路由控制器，单例。负责监控url变化并分发给Routes；控制路由前进、后退、跳转等
 */
export class HashRouter implements Routable {
    render(cbk: (newUrl: string, newQueryString: string, oldUrl: string, oldQueryString: string) => void) {

        let [oldUrl, oldQueryString] = this.backUrl?.replace(/^#/, '').split('?') ?? []
        let [newUrl, newQueryString] = location.hash.replace(/^#/, '').split('?')

        this.backUrl = location.hash

        return cbk(newUrl, newQueryString, oldUrl, oldQueryString)
    }
    static instance: HashRouter

    static getInstance() {
        if (!this.instance) {
            this.instance = new HashRouter();
        }
        return this.instance;
    }

    backUrl: string | undefined


    /**
     * 同history.go
     */
    go(delta: number) {
        window.history.go(delta);
    }
    /**
     * 同history.back
     */
    back() {
        window.history.back();
    }
    /**
     * 同history.forward
     */
    forward() {
        window.history.forward();
    }
    /**
     * 向路由历史中增加一条记录并导航到指定地址
     * @param route 
     */
    push(route: string | RouteOption) {
        let path = ''
        if (isString(route)) {
            path = route
        } else if (isObject(route)) {
            path = buildRoutePath(route) + ''
        }
        window.location.hash = path;
    }
    /**
     * 替换当前路由历史记录并导航到指定地址
     * @param route 
     */
    replace(route: string) {
        let path = ''
        if (isString(route)) {
            path = route
        } else if (isObject(route)) {
            path = buildRoutePath(route) + ''
        }
        sessionStorage.setItem(ROUTE_REDIRECT_FLAT, '1')
        const url = window.location.origin + window.location.pathname + '#' + path;
        window.location.replace(url);
    }
    //guards
}