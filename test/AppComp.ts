import { CompElem, css, csscope, Csscope, h, startViewTransition, state, tag, Template } from 'compelem'
import { createRouter, onRouteChange, outlet, useRoute, useRouter } from '../src'
import type { Route } from '../src/types'
import { AboutComp } from './components/AboutComp'
import { HomeComp } from './components/HomeComp'
import { NotFoundComp } from './components/NotFoundComp'
import { PostComp } from './components/PostComp'
import { ProductsComp } from './components/ProductsComp'
import { StatusComp } from './components/StatusComp'
import { UserComp } from './components/user/UserComp'
import { UserPosts } from './components/user/UserPosts'
import { UserProfile } from './components/user/UserProfile'

/**
 * 示例根组件：创建路由、渲染导航栏，并通过 <transition> 为根出口的
 * 路由切换添加过渡动画。
 *
 * 本示例覆盖了 compelem-router 的主要特性：
 *  - Hash 模式路由
 *  - 静态路由 / 动态参数(:id) / 参数正则(:id{\d+}) / 可选参数(?/:topic)
 *  - 通配符兜底(*)
 *  - 重定向 redirect
 *  - 嵌套路由 + 嵌套 outlet（/user/:id 下挂 profile / posts 子路由）
 *  - 多路由入口：两个 outlet() 并存，同一路由变化同时驱动两个入口；
 *    入口通过 props 注入 entry 标识，路由组件据此显示不同内容（/status）
 *  - 命名路由跳转（RouterLink 的 to={{ name, params, query }}）
 *  - 查询参数 query / queryString
 *  - 三类全局守卫（beforeEach / beforeResolve / afterEach）
 *  - 路由项守卫 beforeEnter、组件守卫 routeEnter / routeUpdate / routeLeave
 *  - 响应式路由状态 useRoute + 路由变更订阅 onRouteChange
 *  - 路由切换动画：根出口用 <transition name="page">（结构指令包裹），
 *    嵌套子路由用组件级 CSS @keyframes（嵌套 outlet 为命令式渲染，无法被 <transition> 包裹）
 */
@tag('app-comp')
export class AppComp extends CompElem {
  // 绑定响应式路由：访问 this.route.xxx 会在路由变化时自动驱动组件重渲染
  @state route: Route = useRoute()

  constructor() {
    super()

    createRouter({
      mode: 'hash',
      routes: [
        // 重定向：根路径 → 首页
        { path: '/', redirect: '/home' },

        // 静态路由
        { path: '/home', name: 'Home', component: HomeComp },

        // 命名路由 + 编程式导航演示页
        { path: '/products', name: 'Products', component: ProductsComp },

        // 多路由入口演示：同一路由由页面上两个 outlet 入口同时响应，
        // 路由组件按入口注入的 entry prop 显示不同内容（见 StatusComp / HomeComp）
        { path: '/status', name: 'Status', component: StatusComp },

        // 动态参数 :id，且限制为纯数字（参数正则语法为 :id{\\d+}）
        { path: '/post/:id{\\d+}', name: 'Post', component: PostComp },

        // 可选参数语法为 ?/:topic + 路由项元数据 + 路由项守卫 beforeEnter
        {
          path: '/about/?:topic', name: 'About', component: AboutComp,
          meta: { title: '关于' },
          async beforeEnter(to, from) {
            console.log('[route-item beforeEnter]', from?.path, '->', to.path)
            return true
          },
        },

        // 嵌套路由：父组件保持挂载，仅子出口切换
        {
          path: '/user/:id', name: 'User', component: UserComp,
          children: [
            { path: 'profile', name: 'UserProfile', component: UserProfile },
            { path: 'posts', name: 'UserPosts', component: UserPosts },
          ],
        },

        // 通配符兜底 404
        { path: '*', name: 'NotFound', component: NotFoundComp },
      ],

      // 全局守卫
      async beforeEach(to, from) {
        console.log('[beforeEach]', from?.fullPath ?? '(init)', '->', to?.fullPath)
        return true
      },
      async beforeResolve(to, from) {
        console.log('[beforeResolve]', from?.fullPath ?? '(init)', '->', to?.fullPath)
        return true
      },
      afterEach(to, from) {
        console.log('[afterEach]', from?.fullPath ?? '(init)', '->', to?.fullPath)
      },
    })

    onRouteChange((to) => {
      console.log('[onRouteChange] path =', to.path, 'fullPath =', to.fullPath)
    })
  }

  // 注意：compelem 组件样式必须经 @csscope 装饰器收集（纯 static get css 不会被读取），
  // 条目须为 css tagged template 产物（纯字符串会被 csscope 忽略）。
  @csscope(Csscope.INNER)
  static get css() {
    return [css`
      :host {
        display: block;
        max-width: 760px;
        margin: 0 auto;
        padding: 18px;
        font-family: system-ui, -apple-system, sans-serif;
        color: #1f2937;
      }
      h1.title {
        margin: 0 0 6px;
        font-size: 22px;
        border-bottom: 2px solid #4f46e5;
        padding-bottom: 8px;
      }
      .sub { color: #6b7280; font-size: 12px; margin-bottom: 10px; }

      nav {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        align-items: center;
        padding: 8px 0 12px;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 12px;
      }
      nav .sep { color: #d1d5db; font-size: 12px; }
      nav .vt {
        margin-left: auto;
        border: 0;
        cursor: pointer;
        background: #10b981;
        color: #fff;
        padding: 5px 11px;
        border-radius: 6px;
        font-size: 12px;
      }
      /* l-router-link 的链接样式由组件自带（:host 默认样式 + :host(.router-link-active)），
         此处不再重复定义，宿主如需定制可在外部样式表中覆盖 */

      .route-meta {
        font-size: 12px;
        color: #6b7280;
        background: #f9fafb;
        border: 1px solid #f3f4f6;
        border-radius: 8px;
        padding: 8px 12px;
        margin-bottom: 12px;
      }
      .route-meta b { color: #374151; }

      .page { min-height: 220px; }

      /* ---- 多路由入口：主/侧双入口布局 ---- */
      .entries {
        display: flex;
        gap: 14px;
        align-items: flex-start;
        flex-wrap: wrap;
      }
      .entry-pane {
        border: 1px dashed #e5e7eb;
        border-radius: 10px;
        padding: 10px;
        min-width: 0;
      }
      .main-pane { flex: 1.4; }
      .side-pane { flex: 1; background: #fafafa; }
      .entry-label {
        font-size: 11px;
        color: #9ca3af;
        font-family: ui-monospace, monospace;
        margin-bottom: 8px;
      }
      .side-pane .page { min-height: 160px; }
      @media (max-width: 640px) {
        .main-pane, .side-pane { flex: 1 1 100%; }
      }

      .vt-hint {
        color: #9ca3af;
        font-size: 12px;
        margin-top: 10px;
      }
      .vt-hint code { background: #f3f4f6; padding: 1px 5px; border-radius: 4px; }

      /* ---- 根出口路由切换动画（name=page, out-in 先离后入） ---- */
      .page-enter-active, .page-leave-active {
        transition: opacity .35s ease, transform .35s ease;
      }
      .page-enter-from { opacity: 0; transform: translateX(48px); }
      .page-leave-to   { opacity: 0; transform: translateX(-48px); }

      /* 子路由（/user/:id 下的 profile / posts）的切换动画在子组件 :host
         上用 CSS @keyframes 实现（@csscope 收集），因为嵌套 outlet 为命令式渲染、
         无法被 <transition> 包裹。详见 UserProfile / UserPosts。 */

      l-router-link {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 6px;
        cursor: pointer;
        color: #4f46e5;
        background: transparent;
        text-decoration: none;
        font-size: 14px;
        line-height: 1.5;
        user-select: none;
        transition: background .15s ease, color .15s ease;
      
        &:hover { background: #eef2ff; }
        &.router-link-active {
          background: #4f46e5;
          color: #fff;
        }
      }
    `]
  }

  render(): Template {
    return h`
      <h1 class="title">compelem-router 特性示例</h1>
      <div class="sub">Hash 模式 · 嵌套路由 · 多入口 · 动态/可选/正则参数 · 守卫 · &lt;transition&gt; 动画</div>

      <nav>
        <l-router-link to="/home">首页</l-router-link>
        <l-router-link to="/products">商品</l-router-link>
        <l-router-link to="/status">多入口</l-router-link>
        <l-router-link to="/about">关于</l-router-link>
        <l-router-link to="/about/team">关于·团队</l-router-link>
        <l-router-link to="/post/1024">文章 1024</l-router-link>
        <span class="sep">|</span>
        <l-router-link to="/user/7/profile">用户 7</l-router-link>
        <l-router-link to="/definitely/not/exist">404</l-router-link>
        <button class="vt" @click="${() => this.vtGo()}">VT 整页过渡</button>
      </nav>

      <div class="route-meta">
        当前路径: <b>${this.route.path}</b> &nbsp;|&nbsp;
        fullPath: <b>${this.route.fullPath}</b> &nbsp;|&nbsp;
        名称: <b>${this.route.name ?? '-'}</b> &nbsp;|&nbsp;
        query: <b>${JSON.stringify(this.route.query)}</b>
      </div>

      <!-- 多路由入口：两个 outlet() 并存，同一路由变化同时驱动两个入口刷新。
           侧入口传入 { entry: 'side' }，路由组件据此显示不同内容 -->
      <div class="entries">
        <section class="entry-pane main-pane">
          <div class="entry-label">入口 1 · outlet()</div>
          <div class="page">
            <transition name="page" mode="out-in">
              ${outlet()}
            </transition>
          </div>
        </section>
        <section class="entry-pane side-pane">
          <div class="entry-label">入口 2 · outlet({ entry: 'side' })</div>
          <div class="page">
            <transition name="page" mode="out-in">
              ${outlet({ entry: 'side' })}
            </transition>
          </div>
        </section>
      </div>

      <p class="vt-hint">
        导航链接走 <code>&lt;transition&gt;</code> 组件级过渡；绿色按钮走 <code>startViewTransition</code> 整页级过渡；
        两个入口同时响应同一路由，路由组件按入口注入的 <code>entry</code> prop 显示不同内容
      </p>
    `
  }

  /**
   * 整页级过渡导航：push() 返回的 Promise 在「路由状态更新 + 视图重渲染」
   * 完成后 resolve，直接 await 即可——VT 的新快照拍到的已是新 DOM。
   */
  private vtGo() {
    startViewTransition(async () => {
      await useRouter().push(this.route.path === '/about' ? '/home' : '/about')
    })
  }
}