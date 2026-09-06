import { CompElem, h, tag, Template } from 'compelem'
import { useRouter } from '../../src'
import type { Router } from '../../src/router/Router'

/**
 * 商品页：/products
 * 演示：命名路由跳转（to={{ name, params, query }}）与编程式导航 router.push / router.replace
 */
@tag('products-comp')
export class ProductsComp extends CompElem {
  router!: Router

  constructor() {
    super()
    this.router = useRouter()
  }

  render(): Template {
    return h`
      <div>
        <h2>商品 / 编程导航</h2>
        <p>通过 <code>&lt;l-router-link&gt;</code> 命名路由 to={{name, params, query}} 跳转：</p>
        <ul>
          <li><l-router-link .to=${{ name: 'User', params: { id: '101' }, query: { tab: 'profile' } }}>查看用户 101</l-router-link></li>
          <li><l-router-link .to=${{ name: 'Post', params: { id: '88' } }}>查看文章 88</l-router-link></li>
        </ul>
        <p>或使用编程式导航：</p>
        <button @click="${this.goToUser}">route.push({name:'User',params:{id:'303'},query:{tab:'posts'}})</button>
        <button @click="${this.goHome}">route.replace('/home')</button>
      </div>
    `
  }

  goToUser() {
    this.router?.push({ name: 'User', params: { id: '303' }, query: { tab: 'posts' } })
  }

  goHome() {
    this.router?.replace('/home')
  }
}