import { CompElem, h, state, tag, Template } from 'compelem'
import { useRoute } from '../../src'
import type { Route } from '../../src/types'

/**
 * 文章页：/post/:id{\d+}  —— 演示带正则约束的动态参数
 */
@tag('post-comp')
export class PostComp extends CompElem {
  @state route: Route = useRoute()

  render(): Template {
    const id = this.route.params?.id
    return h`
      <div>
        <h2>文章 #${id}</h2>
        <p>路径模板 <code>/post/:id{\\d+}</code>，id 必须为纯数字否则落入兜底路由。</p>
        <p>参数 id : <b>${id}</b></p>
        <p>path : <b>${this.route.path}</b></p>
      </div>
    `
  }
}