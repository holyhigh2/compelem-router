import { defineComponents } from 'compelem'
import { AppComp } from './AppComp'

// 注册所有使用了 @tag 装饰器的组件（RouterLink 及本示例中的各路由组件 / 子组件）
defineComponents()

export { AppComp }