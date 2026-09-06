import { CompElem, h, state, tag, Template } from 'compelem'
import { useRoute } from '../../src'
import type { Route } from '../../src/types'

/**
 * 关于页：演示可选参数(?/:topic) + 路由项 meta + 路由项守卫 beforeEnter
 */
@tag('about-comp')
export class AboutComp extends CompElem {
  @state route: Route = useRoute()

  routeEnter(to?: Route) {
    console.log('[about-comp] 组件守卫 routeEnter ->', to?.path)
  }
  routeLeave(to?: Route) {
    console.log('[about-comp] 组件守卫 routeLeave ->', to?.path)
  }

  render(): Template {
    const topic = this.route.params?.topic
    return h`
      <div>
        <h2>关于</h2>
        <p>路径模板 <code>/about/?:topic</code> —— topic 是<em>可选参数</em>。
          带 topic 时（如导航里的 <code>/about/team</code>）会以 topic 展示。</p>
        <p>可选参数 topic : <b>${topic ?? '（未提供）'}</b></p>
        <p>meta : ${JSON.stringify(this.route.meta)}</p>
        <p>path : <b>${this.route.path}</b></p>
      </div>
    `
  }
}