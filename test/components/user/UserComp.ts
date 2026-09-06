import { CompElem, h, state, tag, Template } from 'compelem'
import { outlet, useRoute } from '../../../src'
import type { Route } from '../../../src/types'

/**
 * 用户页（父）：/user/:id
 * 演示：嵌套路由 + 嵌套 outlet + 组件守卫（routeEnter / routeUpdate / routeLeave）
 *
 * 当在 /user/:id 下切换子路由时，父组件保持挂载，仅子出口内容变化，
 * 因此会触发 routeUpdate（同组件实例、仅参数变化）。
 */
@tag('user-comp')
export class UserComp extends CompElem {
  @state route: Route = useRoute()

  routeEnter(to?: Route) {
    console.log('[user-comp] 组件守卫 routeEnter ->', to?.path)
  }
  routeUpdate(to?: Route, from?: Route) {
    console.log('[user-comp] 组件守卫 routeUpdate', from?.path, '->', to?.path)
  }
  routeLeave(to?: Route) {
    console.log('[user-comp] 组件守卫 routeLeave ->', to?.path)
  }

  render(): Template {
    const id = this.route.params?.id
    return h`
      <style>
        .user-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; }
        .user-nav { display: flex; gap: 8px; margin: 10px 0; }
        /* l-router-link 链接样式由组件自带，不再重复定义 */
        .user-sub { border-top: 1px dashed #e5e7eb; padding-top: 10px; }
      </style>
      <div class="user-card">
        <h2>用户 ${id}</h2>
        <p>父路由 <code>/user/:id</code>，切换下方子路由时父组件不重挂载。</p>
        <div class="user-nav">
          <l-router-link to="/user/${id}/profile">个人资料</l-router-link>
          <l-router-link to="/user/${id}/posts">动态</l-router-link>
        </div>
        <div class="user-sub">
          <!--
            嵌套出口：渲染当前 /user/:id 下的子路由（profile / posts）。
            重要：嵌套 outlet 走的是「命令式渲染」（renderRoute 直接增删组件），
            并非结构指令（when / forEach），因此它无法被 <transition> 包裹产生过渡。
            （<transition> 只对结构指令更新点生效，详见 src/directives/Outlet.ts 注释。）

            所以子路由切换动画改在子组件的 :host 上用 CSS @keyframes 实现，
            见 UserProfile / UserPosts 的 static get css。根出口（AppComp 内）
            因为是 when() 结构指令，仍可用 <transition name="page"> 正常过渡。
          -->
          ${outlet()}
        </div>
      </div>
    `
  }
}