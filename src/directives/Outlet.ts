import { CompElem, Constructor, directive, EnterPointType } from "compelem";
import { NextRouteOnComp, OutletRenderedMap } from "../const";
import { renderRootRoute, renderRoute, setEntryComponent, useRouter } from "../utils";

/**
 * 路由内容显示出口
 * @param routes 路由表对象
 */
export const outlet = directive(function Outlet(props?: Record<string, any>) {
  return (pointNode: Node, _newArgs: any[], _oldArgs: any[] | undefined, meta?: { renderComponent?: CompElem }) => {

    let router = useRouter()
    let comp = meta?.renderComponent!

    //保存入口组件
    setEntryComponent(comp, pointNode, props)

    if (router.entryComponent === meta?.renderComponent) {
      //刷新时调用
      renderRootRoute(pointNode, props)
      return
    }

    let lastComponent = OutletRenderedMap.get(pointNode)
    let targetRoute = NextRouteOnComp.get(comp.constructor as Constructor<any>)
    if (targetRoute) {
      if (!lastComponent)
        renderRoute(targetRoute, pointNode, props)
    } else {
      if (lastComponent) {
        lastComponent.remove()
        OutletRenderedMap.delete(pointNode)
      }
    }

  };
}, [EnterPointType.TEXT, EnterPointType.SLOT])