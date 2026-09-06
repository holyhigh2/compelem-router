import { CompElem, css, csscope, Csscope, h, prop, state, tag, Template } from 'compelem'
import { onRouteChange, useRoute } from '../../src'
import type { Route } from '../../src/types'

/**
 * 首页：静态路由 /home
 * 演示：响应式路由状态 useRoute + 路由变更订阅 onRouteChange
 *      + 多路由入口：组件根据所在入口注入的 entry prop 显示不同内容
 */
@tag('home-comp')
export class HomeComp extends CompElem {
  @state route: Route = useRoute()
  // 由所在入口注入：outlet({ entry: 'side' }) → 'side'，主入口为默认 'main'
  @prop({ type: String }) entry: string = 'main'
  // 记录最近一次路由变更，演示 onRouteChange 订阅
  lastChange = ''
  offChange?: () => void

  mounted() {
    this.offChange = onRouteChange((to) => {
      this.lastChange = to.fullPath
      this.forceUpdate()
    })
  }

  destroyed() {
    this.offChange?.()
  }

  render(): Template {
    const isSide = this.entry === 'side'

    if (isSide) {
      // 侧入口：紧凑摘要
      return h`
        <div class="compact">
          <span class="badge">入口: side（侧）</span>
          <h3>首页 · 摘要</h3>
          <p>path : <b>${this.route.path}</b></p>
        </div>
      `
    }

    // 主入口：完整内容
    return h`
      <div class="card">
        <span class="badge">入口: main（主）</span>
        <h2>首页</h2>
        <p>静态路由 <code>/home</code>。顶部导航的激活态通过 RouterLink 自动维护。</p>
        <p>path : <b>${this.route.path}</b></p>
        <p>fullPath : <b>${this.route.fullPath}</b></p>
        <p>最近一次路由变更（onRouteChange）: <b>${this.lastChange || '-'}</b></p>
      </div>
    `
  }

  @csscope(Csscope.INNER)
  static get css() {
    return [css`
      :host { display: block; }
      .badge {
        display: inline-block;
        margin-bottom: 8px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 11px;
        background: #eef2ff;
        color: #4f46e5;
        border: 1px solid #c7d2fe;
      }
      .compact h3 { margin: 4px 0; }
      .compact p { margin: 4px 0; font-size: 13px; }
    `]
  }
}
