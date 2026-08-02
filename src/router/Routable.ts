import type { RouteOption } from "../types"


export interface Routable {
    render(cbk: (newUrl: string, newQueryString: string, oldUrl: string, oldQueryString: string) => void): void
    /**
         * 同history.go
         */
    go(delta: number): void
    /**
     * 同history.back
     */
    back(): void
    /**
     * 同history.forward
     */
    forward(): void
    /**
     * 向路由历史中增加一条记录并导航到指定地址
     * @param path 
     */
    push(path: string | RouteOption): void
    /**
     * 替换当前路由历史记录并导航到指定地址
     * @param path 
     */
    replace(path: string | RouteOption): void
} 