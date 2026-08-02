import { CompElem, Template, h, state, tag, watch } from 'compelem';
import { Route, useRoute } from '../src';
import { outlet } from '../src/directives/Outlet';


@tag("parent-comp")
export class ParentComp extends CompElem {
  //////////////////////////////////// props
  @state route: Route = useRoute()

  //////////////////////////////////// watch
  @watch('route', { deep: true })
  function(nv: Route, ov: Route, src: string[], snv: any, sov: any) {
    console.log(nv, ov, '........', snv, sov, src)
  }
  //////////////////////////////////// styles 


  propsReady(props: Record<string, any>): void {

  }
  routeUpdate(to, from) {
    console.log('父 路由更新...', 'from', from?.path, 'to', to?.path)
  }
  routeEnter(to, from) {
    console.log('父 路由进入...', 'from', from?.path, 'to', to?.path)
  }
  routeLeave(to, from) {
    console.log('父 路由离开...', 'from', from?.path, 'to', to?.path)
  }
  render(): Template {
    return h`<div>
      父 组件
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