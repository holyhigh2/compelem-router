import { CompElem, h, query, tag, Template } from "compelem";
import { createRouter, outlet } from '../src/index';
import { ChildComp } from "./ChildComp";
import { GrandsonComp } from "./GrandsonComp";
import { HomeComp } from "./HomeComp";
import { ParentComp } from "./ParentComp";
import { ParentComp2 } from "./ParentComp2";

@tag("page-test")
export class PageTest extends CompElem {
  //////////////////////////////////// props

  //////////////////////////////////// computed

  //////////////////////////////////// watch

  //////////////////////////////////// styles
  //静态样式
  static get css(): Array<string | CSSStyleSheet> {
    return [`:host{
        font-size:16px;
        background:gray;
      }
        a{
          margin-left:1rem;
        }
      `];
  }
  //动态样式变量
  get cssVars() {
    return {

    }
  }

  @query('i[name="text"]')
  text: HTMLElement | undefined
  sloganIndex = 0

  //////////////////////////////////// lifecycles
  constructor() {
    super();

    (window as any).rr = createRouter({
      mode: 'hash',
      routes: [
        { path: '/', redirect: '/home' },
        { path: '/home', component: HomeComp, name: 'Home' },
        {
          path: '/a/?:id', component: ParentComp, meta: { cu: '父 自定义aaa' }
        },
        {
          path: '/a/?:id', component: ParentComp, meta: { cu: '父 自定义222' }, children: [
            { path: 'c/:name', component: ChildComp, meta: { cu: '子 自定义222' }, name: "ChildA" }
          ], async beforeEnter(from, to) {
            return true
          }
        },
        {
          path: '/b/:id', component: ParentComp2, meta: { cu: '父 自定义bbb' }, children: [
            {
              path: 'd/:name', component: ChildComp, children: [
                { path: 'x/:zz{\\d+}', component: GrandsonComp, meta: { cu: '孙 自定义bbb' } }
              ]
            }
          ]
        },
        { path: '*', redirect: '/' }
      ]
    })
  }
  updated(changed: Record<string, any>): void {
    console.log('updated......')
  }
  mounted(): void {

  }
  render(): Template {
    console.log('render......')
    return h`<div>
    <nav>
      <a href="#/">Home</a>  
      <a href="#/a">/a</a>
      <a href="#/a/1?a=1&b=2&x&b=4">/a/1?a=1&b=2&x&b=4</a>
      <a href="#/a/1/c/xx">/a/1/c/xx</a>
      <a href="#/a/2/c/yy">/a/2/c/yy</a>

      <a href="#/b">/b</a>
      <a href="#/b/1">/b/1</a>
      <a href="#/b/1/d/xx?a[]=1&a[]=2&x&b=4">/b/1/d/xx?a[]=1&a[]=2&x&b=4</a>
      <a href="#/b/2/d/yy">/b/2/d/yy</a>

      <a href="#/b/1/d/xx/x/11?a[]=1&a[]=2&x&b=4">/b/1/d/xx/x/11?a[]=1&a[]=2&x&b=4</a>
      <a href="#/b/2/d/yy/x/zz">/b/2/d/yy/x/zz</a>
    </nav>
      <h3>路由点1</h3>
      ${outlet()}
    </div>`
  }
}