import { CompElem, h, tag, Template } from 'compelem'

/**
 * 404 页：通配符 * 兜底
 */
@tag('not-found-comp')
export class NotFoundComp extends CompElem {
  render(): Template {
    return h`
      <div class="nf">
        <h2>404 - 页面不存在</h2>
        <p>当前路径未被任何路由项匹配，已落入通配符兜底路由。</p>
        <l-router-link to="/home">返回首页</l-router-link>
      </div>
    `
  }
}