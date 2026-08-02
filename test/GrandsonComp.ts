import { CompElem, Template, h, state, tag } from 'compelem';
import { Route, useRoute } from '../src';


@tag("grandson-comp")
export class GrandsonComp extends CompElem {
  //////////////////////////////////// props
  @state route: Route = useRoute()
  //////////////////////////////////// watch

  //////////////////////////////////// styles
  routeUpdate(to, from) {
    console.log('孙 路由更新...', 'from', from?.path, 'to', to?.path)
  }
  routeEnter(to, from) {
    console.log('孙 路由进入...', 'from', from?.path, 'to', to?.path)
  }
  routeLeave(to, from) {
    console.log('孙 路由离开...', 'from', from?.path, 'to', to?.path)
  }
  render(): Template {
    return h`<div>
      孙 组件
      <br>
      params: ${JSON.stringify(this.route?.params)} 
      <br>
      path: ${this.route?.path}
      <br>
      query: ${JSON.stringify(this.route?.query)}
      <br>
      meta: ${JSON.stringify(this.route?.meta)}
    </div>`
  }
}