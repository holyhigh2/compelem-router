import { CompElem, h, state, tag, Template } from 'compelem';
import { outlet, Route, useRoute } from '../src';


@tag("parent-comp2")
export class ParentComp2 extends CompElem {
  //////////////////////////////////// props
  @state route: Route = useRoute()

  //////////////////////////////////// watch

  //////////////////////////////////// styles

  mounted(): void {
  }
  routeUpdate(to, from) {
    console.log('父2 路由更新...', 'from', from?.path, 'to', to?.path)
  }
  routeEnter(to, from) {
    console.log('父2 路由进入...', 'from', from?.path, 'to', to?.path)
  }
  routeLeave(to, from) {
    console.log('父2 路由离开...', 'from', from?.path, 'to', to?.path)
  }
  render(): Template {
    return h`<div>
      父2 组件
      <br>
      params: ${JSON.stringify(this.route?.params!)} 
      <br>
      path: ${this.route?.path}
      <br>
      query: ${JSON.stringify(this.route?.query)}
      <br>
      meta: ${JSON.stringify(this.route?.meta)}

      <h3>子路由点</h3>
            ${outlet()}
    </div>`
  }
}