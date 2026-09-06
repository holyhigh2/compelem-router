import { CompElem, h, state, tag, Template } from 'compelem'
import { onRouteChange, useRoute } from '../../src'
import type { Route } from '../../src/types'

/**
 * 首页：静态路由 /home
 * 演示：响应式路由状态 useRoute + 路由变更订阅 onRouteChange
 */
@tag('home-comp')
export class HomeComp extends CompElem {
  @state route: Route = useRoute()
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
    return h`
      <div class="card">
        <h2>首页</h2>
        <p>静态路由 <code>/home</code>。顶部导航的激活态通过 RouterLink 自动维护。</p>
        <p>path : <b>${this.route.path}</b></p>
        <p>fullPath : <b>${this.route.fullPath}</b></p>
        <p>最近一次路由变更（onRouteChange）: <b>${this.lastChange || '-'}</b></p>
      </div>
    `
  }
}