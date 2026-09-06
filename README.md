# compelem-router

A router lib of compelem —— 基于 [compelem](https://www.npmjs.com/package/compelem) 的路由库，为 Web Components 应用提供声明式路由能力。

## 特性

- **Hash 模式路由**：基于 `location.hash` 监控 URL 变化并分发渲染
- **嵌套路由**：通过 `children` 配置路由层级，`outlet()` 指令渲染各级路由出口
- **灵活的路径语法**：静态段、动态参数 `:id`、参数正则 `:id{\d+}`、可选参数 `?:id`、通配符 `*`
- **重定向与兜底路由**：支持 `redirect` 配置项
- **命名路由**：通过 `name` + `params` / `query` 进行跳转
- **三类导航守卫**：全局守卫（`beforeEach` / `beforeResolve` / `afterEach`）、路由项守卫（`beforeEnter`）、组件守卫（`routeEnter` / `routeUpdate` / `routeLeave`）
- **`<l-router-link>` 链接组件**：自动匹配当前路由并添加激活样式
- **响应式路由状态**：`useRoute()` 获取响应式路由信息，`onRouteChange()` 订阅路由变更
- **过渡动画友好**：根 outlet 走结构指令渲染路径，路由切换可配合 `<transition>` 实现过渡动画

## 安装

```bash
npm i compelem-router compelem myfx query-string
```

## 快速开始

```ts
import { CompElem, defineComponents, h, tag } from 'compelem'
import { createRouter, outlet } from 'compelem-router'
import { HomeComp } from './HomeComp'
import { UserComp } from './UserComp'

@tag('app-root')
export class App extends CompElem {
  constructor() {
    super()
    // 创建路由。需在组件渲染前调用
    createRouter({
      mode: 'hash',
      routes: [
        { path: '/', redirect: '/home' },
        { path: '/home', component: HomeComp, name: 'Home' },
        { path: '/user/:id', component: UserComp },
        { path: '*', redirect: '/' } // 兜底路由
      ]
    })
  }

  render() {
    return h`<div>
      <nav>
        <l-router-link .to="/home">首页</l-router-link>
        <l-router-link .to="/user/1">用户1</l-router-link>
      </nav>
      <h3>路由出口</h3>
      ${outlet()}
    </div>`
  }
}

defineComponents()
```

首次渲染时根 outlet 会自动执行初始导航，支持页面首次加载的深链匹配。

## 路由配置

### RouteItem

| 属性 | 类型 | 说明 |
| ---- | ---- | ---- |
| `path` | `string` | 路由路径，必填。子路由的 `path` 为相对父级的路径段，无需以 `/` 开头 |
| `name` | `string` | 路由名称，**全局唯一**。可用于命名路由跳转 |
| `component` | `Constructor<any>` | 路由对应组件。存在 `children` 时可为空 |
| `redirect` | `string` | 重定向路径 |
| `children` | `RouteItem[]` | 子路由项数组 |
| `meta` | `Record<string, any>` | 路由元数据，可传递给守卫回调 |
| `beforeEnter` | `(to, from) => Promise<boolean>` | 路由项守卫，返回 `true` 放行 |

### 路径匹配语法

| 语法 | 示例 | 说明 |
| ---- | ---- | ---- |
| 静态段 | `/home` | 精确匹配路径段 |
| 动态参数 | `/user/:id` | 匹配任意段，通过 `route.params.id` 读取 |
| 参数正则 | `/user/:id{\d+}` | 仅匹配符合正则的段（此处为数字） |
| 可选参数 | `/list/?:id` | 末尾段可选，`/list` 与 `/list/1` 均可匹配 |
| 通配符 | `*` | 兜底默认路由，常配合 `redirect` 使用 |

### 嵌套路由

在父路由组件的模板中继续使用 `outlet()` 即可渲染子路由：

```ts
createRouter({
  mode: 'hash',
  routes: [
    {
      path: '/a/?:id',
      component: ParentComp,
      children: [
        { path: 'c/:name', component: ChildComp, name: 'ChildA' }
      ]
    }
  ]
})
```

匹配 `/a/1/c/xx` 时，`ParentComp` 渲染于根 outlet，`ChildComp` 渲染于 `ParentComp` 内的 outlet。

## API

### createRouter(options: RouterOption): Router

创建路由实例并初始化路由表，返回 `Router` 实例。

**RouterOption**

| 属性 | 类型 | 说明 |
| ---- | ---- | ---- |
| `mode` | `RouterMode` | 路由模式：`'hash'`（当前支持）；`'history'` 预留 |
| `routes` | `RouteItem[]` | 路由表 |
| `beforeEach` | `(to, from) => Promise<boolean>` | 全局前置守卫 |
| `beforeResolve` | `(to, from) => Promise<boolean>` | 全局解析守卫 |
| `afterEach` | `(to, from) => void` | 全局后置钩子 |

### useRouter(): Router

获取由 `createRouter` 创建的路由实例（单例）。

| 方法 | 说明 |
| ---- | ---- |
| `push(route: string \| RouteOption): Promise<void>` | 新增历史记录并导航 |
| `replace(route: string \| RouteOption): Promise<void>` | 替换当前历史记录并导航 |
| `back()` | 同 `history.back()` |
| `forward()` | 同 `history.forward()` |
| `go(delta: number)` | 同 `history.go()` |

`push` / `replace` 返回的 Promise 在「路由状态更新 + 视图重渲染」完成后 resolve，可直接配合 `startViewTransition` 实现过渡动画：

```ts
startViewTransition(async () => {
  await router.push('/about')
})
```

### 命名路由跳转（RouteOption）

`push` / `replace` 及 `<l-router-link>` 的 `to` 属性均支持 `RouteOption` 对象：

| 属性 | 类型 | 说明 |
| ---- | ---- | ---- |
| `name` | `string` | 目标路由名称（全局唯一） |
| `path` | `string` | 目标路径（与 `name` 二选一） |
| `params` | `Record<string, string \| number>` | 动态路由参数。**路径含动态参数时必传**，缺失将报错 |
| `query` | `Record<string, string \| number> \| string` | URL 查询参数，对象或字符串 |

```ts
router.push({ name: 'UserDetail', params: { id: 123 }, query: { tab: 'info' } })
// 等价于 /user/123?tab=info
```

### outlet 指令

路由内容显示出口，可在模板中任意位置使用：

```ts
import { outlet } from 'compelem-router'

render() {
  return h`<div>${outlet()}</div>`
}
```

- **根 outlet**（入口组件内的 outlet）：走结构指令渲染路径，路由切换经过指令更新周期（产出 REPLACE），可被 `<transition>` 包裹实现路由切换动画
- **嵌套 outlet**（路由组件内的 outlet）：命令式渲染子路由
- `outlet(props)` 可传递属性对象给当前渲染的路由组件：

```ts
${outlet({ userId: 1 })}
```

### RouterLink 组件（`<l-router-link>`）

路由链接组件，点击触发导航，并自动根据当前路由添加激活样式。需经 `defineComponents()` 注册后使用，且需在 `createRouter` 之后挂载。

| Props | 类型 | 默认值 | 说明 |
| ---- | ---- | ------ | ---- |
| `to` | `string \| RouteOption` | `''` | 目标地址 |
| `replace` | `boolean` | `false` | 使用替换方式跳转 |
| `activeClass` | `string` | `'router-link-active'` | 激活样式类名 |
| `exact` | `boolean` | `false` | 精确匹配。默认按前缀匹配（父路径激活时子路径链接也激活）；开启后仅全路径一致才激活 |

```ts
render() {
  return h`<nav>
    <l-router-link .to="/home">首页</l-router-link>
    <l-router-link .to=${{ name: 'UserDetail', params: { id: 1 } }}>用户1</l-router-link>
    <l-router-link .to="/home" .exact=${true} .activeClass="on">首页（精确匹配）</l-router-link>
  </nav>`
}
```

### useRoute(): Route

获取当前路由信息（响应式代理）。

**在组件内响应式读取时，必须把返回值绑定到组件自身的响应字段**：

```ts
@state route: Route = useRoute()
```

原因：compelem 的响应式通知按「创建上下文」派发，跨组件直接读取不会注册扩展上下文，收不到更新通知；绑定到自身 `@state` 字段后会完成路径重映射并建立通知链路。

### onRouteChange(cb: RouteChangeCallback): () => void

订阅路由变化，返回取消订阅函数：

```ts
const off = onRouteChange((to, from) => {
  console.log(to.path, from?.path)
})
// 取消订阅
off()
```

### Route 对象

| 属性 | 类型 | 说明 |
| ---- | ---- | ---- |
| `path` | `string` | 当前匹配路径（带前导 `/`） |
| `fullPath` | `string` | 含查询参数的全路径 |
| `params` | `Record<string, string \| string[]>` | 动态路由参数（已冻结） |
| `query` | `Record<string, string \| string[]>` | URL 查询参数（支持 `a[]=1&a[]=2` 数组形式） |
| `queryString` | `string` | 查询参数字符串 |
| `matched` | `RouteItem[]` | 匹配的路由项数组，按层级排序（可由末项读取当前路由的 `name` 等） |
| `meta` | `Record<string, any>` | 路由项元数据 |

## 导航守卫

### 全局守卫（createRouter 配置或 Router 实例属性）

```ts
const router = createRouter({
  mode: 'hash',
  routes: [...],
  // 返回 Promise<boolean>，true 放行
  async beforeEach(to, from) {
    return true
  },
  async beforeResolve(to, from) {
    return true
  },
  // 导航确认后触发
  afterEach(to, from) {
    console.log('导航完成', to.fullPath)
  }
})
```

### 路由项守卫（beforeEnter）

配置在 `RouteItem` 上，进入该路由项时触发：

```ts
{
  path: '/admin',
  component: AdminComp,
  async beforeEnter(to, from) {
    return await checkAuth() // true 放行，否则中断导航
  }
}
```

### 组件守卫（routeEnter / routeUpdate / routeLeave）

定义在路由组件上，随组件进出 outlet 自动触发（兼容过渡动画延迟插入的场景）：

```ts
@tag('user-comp')
export class UserComp extends CompElem {
  // 组件随路由进入 DOM 时触发
  routeEnter(to: Route, from?: Route) { }
  // 组件实例复用、仅参数变化时触发（如 /user/1 → /user/2）
  routeUpdate(to: Route, from?: Route) { }
  // 组件随路由离开 DOM 时触发
  routeLeave(to: Route, from?: Route) { }
}
```

### 执行顺序

```
URL 变化
  → 路由匹配
  → 路由项守卫 beforeEnter
  → 全局守卫 beforeEach → beforeResolve
  → 更新路由状态（触发视图渲染、组件守卫 routeEnter / routeUpdate / routeLeave）
  → 全局后置钩子 afterEach
```

## 导出清单

```ts
// 组件
export { RouterLink }              // <l-router-link>

// 指令
export { outlet }                  // 路由出口结构指令

// 路由
export { createRouter }            // 创建路由实例
export { useRouter }               // 获取路由实例

// 路由状态
export { useRoute }                // 响应式路由信息
export { onRouteChange }           // 订阅路由变化
export type { RouteChangeCallback }

// 类型与常量
export type { Route, RouteItem, RouteOption, RouterOption, ComponentGuards, ... }
export { RouterMode }              // 'hash' | 'history'
```

## 开发

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建产物（ESM / UMD）至 dist
npm run preview  # 预览构建产物
```

## License

[MIT](./LICENSE)
