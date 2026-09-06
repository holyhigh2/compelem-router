import { CompElem, css, csscope, Csscope, h, state, tag, Template } from 'compelem'
import { useRoute } from '../../../src'
import type { Route } from '../../../src/types'

/**
 * 用户资料子路由：/user/:id/profile
 */
@tag('user-profile')
export class UserProfile extends CompElem {
  @state route: Route = useRoute()

  // 子路由入场动画：嵌套 outlet 为命令式渲染，无法被 <transition> 包裹，
  // 故在组件挂载时通过 :host 的 CSS 动画实现切换过渡。
  // 注意：compelem 组件样式必须经 @csscope 装饰器收集，条目须为 css tagged template。
  @csscope(Csscope.INNER)
  static get css() {
    return [css`
      :host {
        display: block;
        animation: userProfileIn .3s ease both;
      }
      @keyframes userProfileIn {
        from { opacity: 0; transform: translateX(-12px); }
        to   { opacity: 1; transform: none; }
      }
    `]
  }

  render(): Template {
    return h`
      <div>
        <h3>个人资料</h3>
        <p>用户 ID : <b>${this.route.params?.id}</b></p>
        <p>query : ${JSON.stringify(this.route.query)}</p>
        <p>path : <b>${this.route.path}</b></p>
      </div>
    `
  }
}