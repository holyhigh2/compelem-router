import { CompElem, state, tag, watch } from "compelem";
import { Route } from "../types";

/**
 * 提供全局响应状态
 */
@tag('l-router-route-hub', true)
export class RouteReativeHub extends CompElem {
  @state route: Route = {
    path: "/",
    fullPath: "/",
    query: {},
    queryString: "",
    params: {},
    matched: [],
    meta: {}
  };

  @watch('route')
  watchRoute(nv: any, ov: any) {
  }
}