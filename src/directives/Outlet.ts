import type { Template } from "compelem"
import {
  CompElem,
  Constructor,
  DirectiveUpdateTag,
  EnterPointType,
  directive,
  h,
  isCompElemNode,
  showTagError,
  when,
} from "compelem"
import { isEmpty, keys } from "myfx"
import { GuardObserverMap, NextRouteOnComp, OutletRenderedMap } from "../const"
import {
  getCurrentRouteItem,
  getLastRouteChange,
  getRouteVersion,
  registerOutletHost,
} from "../store"
import type { RouteItem } from "../types"
import { navigate, renderRoute, setEntryComponent, useRouter } from "../utils"

type Case = [(v: any) => boolean, () => Template]

const EMPTY_PROPS = {}
// 按 props 对象缓存分支表：props 通常是稳定引用，避免每次 render 重建
const CasesByProps = new WeakMap<object, Case[]>()
const TagNameCache = new WeakMap<Function, string>()
// 每个 outlet 挂载点已应用的路由版本号，用于判断是否需要 routeUpdate
const VersionMap = new WeakMap<Node, number>()

/**
 * 解析路由组件对应的自定义标签名。
 * 结构指令需要通过模板渲染组件，而模板标签名是静态的，
 * 因此这里用 customElements.getName() 反查后动态拼装模板。
 */
function getTagName(Ctor: Constructor<any>): string | undefined {
  let t = TagNameCache.get(Ctor)
  if (t) return t
  const getName = (customElements as any).getName
  t = getName ? (getName.call(customElements, Ctor) as string | undefined) : undefined
  if (!t) {
    showTagError(
      'Router',
      `Cannot resolve the tag name of route component '${(Ctor as any).name ?? Ctor}'. ` +
      `Register it before rendering: use @tag('name', true), or call defineComponents().`
    )
    return undefined
  }
  TagNameCache.set(Ctor, t)
  return t
}

/** 生成渲染该路由项组件的模板函数（支持入口 props 的 prop 绑定） */
function tplFnOf(item: RouteItem, props?: Record<string, any>): () => Template {
  const Ctor = item.component!
  const ks = props && !isEmpty(props) ? keys(props) : []
  if (!ks.length) {
    return () => {
      const t = getTagName(Ctor)
      return (t ? h(`<${t}></${t}>` as any) : h``) as Template
    }
  }
  return () => {
    const t = getTagName(Ctor)
    if (!t) return h`` as Template
    const strs: string[] = []
    const vals: any[] = []
    ks.forEach((k: string, i: number) => {
      strs.push(i === 0 ? `<${t} .${k}="` : `" .${k}="`)
      vals.push(props![k])
    })
    strs.push(`"></${t}>`)
    return h(strs as any, ...vals) as Template
  }
}

/** 由路由表构建 when 的分支表。用路由项对象身份做判别，避开路径格式差异 */
function getCases(props?: Record<string, any>): Case[] {
  const key = (props ?? EMPTY_PROPS) as object
  let cases = CasesByProps.get(key)
  if (!cases) {
    const router = useRouter()
    const items: RouteItem[] = []
    const walk = (list: RouteItem[]) => {
      list.forEach((r) => {
        if (r.component) items.push(r)
        if (r.children) walk(r.children)
      })
    }
    walk(router?.routes ?? [])
    cases = items.map((item) => [(v: any) => v === item, tplFnOf(item, props)] as Case)
    // 路由表尚未就绪（createRouter 未调用）时不缓存，下次重新构建
    if (items.length) CasesByProps.set(key, cases)
  }
  return cases
}

/**
 * 监听 outlet 挂载点的子节点变化，在路由组件进入/离开 DOM 时
 * 调用 routeEnter / routeLeave 组件守卫。
 * 结构指令的插入时机受过渡模式影响（out-in 会延迟入场），
 * 用 MutationObserver 可以覆盖所有模式。
 */
function ensureGuardObserver(pointNode: Node) {
  if (GuardObserverMap.has(pointNode)) return
  const parent = pointNode.parentNode
  if (!parent) return
  const ob = new MutationObserver((records) => {
    const [to, from] = getLastRouteChange()
    records.forEach((r) => {
      r.addedNodes.forEach((n: any) => {
        if (n.nodeType !== 1 || !isCompElemNode(n)) return
        const prev = OutletRenderedMap.get(pointNode) as any
        if (prev && prev !== n) prev.routeLeave?.(to, from)
        OutletRenderedMap.set(pointNode, n)
        n.routeEnter?.(to, from)
      })
      r.removedNodes.forEach((n: any) => {
        if (OutletRenderedMap.get(pointNode) === n) {
          OutletRenderedMap.delete(pointNode)
            ; (n as any).routeLeave?.(to, from)
        }
      })
    })
  })
  ob.observe(parent, { childList: true })
  GuardObserverMap.set(pointNode, ob)
}

/** 处理 routeUpdate：同一路由组件实例复用、仅参数变化时触发 */
function trackGuards(pointNode: Node, rs: any[]) {
  if (!rs || !rs.length) return
  const version = getRouteVersion()
  const last = VersionMap.get(pointNode)
  VersionMap.set(pointNode, version)

  ensureGuardObserver(pointNode)

  if (rs[0] === DirectiveUpdateTag.REFRESH && last !== undefined && last !== version) {
    const c = OutletRenderedMap.get(pointNode) as any
    const [to, from] = getLastRouteChange()
    c?.routeUpdate?.(to, from)
  }
}

/**
 * 路由内容显示出口。
 *
 * 根出口（entryComponent 内的 outlet）走**结构指令**路径：
 * 内部委托 when() 执行器产出 DirectiveUpdateTag.REPLACE，
 * 因此可以直接被 `<transition>` / transition() 包裹实现路由切换动画。
 *
 * 嵌套出口（路由组件内部的 outlet）保留原命令式渲染逻辑。
 *
 * @param props 传递给路由组件的属性
 */
export const outlet = directive(function Outlet(props?: Record<string, any>) {
  return (pointNode: Node, newArgs: any[], oldArgs: any[] | undefined, meta?: { renderComponent?: CompElem }) => {
    const router = useRouter()
    const comp = meta?.renderComponent!
    const outletProps = (newArgs[0] ?? props) as Record<string, any> | undefined

    // 注册入口组件 / 挂载点
    setEntryComponent(comp, pointNode, outletProps)
    registerOutletHost(comp)

    if (router.entryComponent === comp) {
      if (!oldArgs) {
        // 首次渲染：完成初始深链匹配（首次加载不会触发 hashchange）
        navigate()
      }

      const key = getCurrentRouteItem()
      const cases = getCases(outletProps)
      // when 的 value 参数类型较窄（string|number），路由项判别走条件函数，此处放宽
      const inst: any = when(key as any, cases)
      const rs = inst[0](pointNode, inst[1], oldArgs, meta)
      trackGuards(pointNode, rs)
      return rs
    }

    let lastComponent = OutletRenderedMap.get(pointNode)
    let targetRoute = NextRouteOnComp.get(comp.constructor as Constructor<any>)
    if (targetRoute) {
      if (!lastComponent) renderRoute(targetRoute, pointNode, outletProps)
    } else if (lastComponent) {
      lastComponent.remove()
      OutletRenderedMap.delete(pointNode)
    }
  }
}, [EnterPointType.TEXT, EnterPointType.SLOT])