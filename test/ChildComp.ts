import { CompElem, Template, h, state, tag } from 'compelem';
import { Route, useRoute } from '../src';
import { outlet } from '../src/directives/Outlet';


@tag("child-comp")
export class ChildComp extends CompElem {
  //////////////////////////////////// props
  @state route: Route = useRoute()
  //////////////////////////////////// watch

  //////////////////////////////////// styles
  routeUpdate(to, from) {
    console.log('子路由更新...', 'from', from?.path, 'to', to?.path)
  }
  routeEnter(to, from) {
    console.log('子路由进入...', 'from', from?.path, 'to', to?.path)
  }
  routeLeave(to, from) {
    console.log('子路由离开...', 'from', from?.path, 'to', to?.path)
  }
  render(): Template {
    return h`<div>
      子 组件
      <br>
      params: ${JSON.stringify(this.route?.params)} 
      <br>
      path: ${this.route?.path}
      <br>
      query: ${JSON.stringify(this.route?.query)}
      <br>
      meta: ${JSON.stringify(this.route?.meta)}
      
      <h3>孙路由点</h3>
                  ${outlet()}
    </div>`
  }
}