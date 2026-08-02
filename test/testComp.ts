import { CompElem, Template, h, model, prop, tag, watch } from 'compelem';


@tag("test-comp")
export class TestComp extends CompElem {
  //////////////////////////////////// props
  @prop childData: Record<string, any> = {}

  //////////////////////////////////// watch
  @watch('childData', { deep: true })
  function(nv: Record<string, any>,) {
    console.log('子组件变更...', nv)
  }
  @watch('childData.a')
  watchCa(nv: Record<string, any>,) {
    console.log('子组件变更222...', nv)
  }

  //////////////////////////////////// styles


  mounted(): void {

  }
  render(): Template {
    console.log('子组件视图......')
    return h`<div>${JSON.stringify(this.childData)} <button @click="${this.changeTest}">修改子组件并更新父组件</button><select ${model(this.childData.a)}>
      <option value="123">123</option>
      <option value="234">234</option>
      <option value="345">345</option>
    </select></div>`
  }
  changeTest() {
    this.childData.a = Math.random() * 100 >> 0
  }
}