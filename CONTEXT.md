# CONTEXT.md - 项目上下文

## 项目背景

compelem-router 是为 compelem Web Components 框架设计的路由解决方案。compelem 是一个轻量级的 Web Components 库，提供声明式渲染、响应式状态管理和结构指令。

## 核心概念

### 路由器架构
- **Router**: 主路由器类，管理路由配置和导航
- **HashRouter**: Hash模式的具体实现，监听location.hash变化
- **Routable**: 路由匹配逻辑，处理路径解析和参数提取
- **Store**: 路由状态管理，维护当前路由信息

### 组件系统
- **RouterLink**: 路由链接组件，支持激活样式和命名路由
- **outlet**: 结构指令，渲染路由出口

### 路由守卫
- **全局守卫**: beforeEach, beforeResolve, afterEach
- **路由项守卫**: beforeEnter
- **组件守卫**: routeEnter, routeUpdate, routeLeave

## 文件依赖关系

```
index.ts
├── router/Router.ts
│   ├── router/HashRouter.ts
│   └── router/Routable.ts
├── store.ts
├── types.ts
├── utils.ts
├── const.ts
├── components/RouterLink.ts
└── directives/outlet.ts
```

## 状态管理

路由状态通过store.ts实现单例模式，包含以下状态：
- 当前路由对象
- 路由历史记录
- 匹配的路由配置

## 路由匹配流程

1. URL变化触发（hashchange事件）
2. 提取hash值
3. 遍历路由表进行匹配
4. 提取动态参数和查询参数
5. 执行路由守卫
6. 更新路由状态
7. 渲染对应组件

## 性能考虑

- 路由匹配使用扁平化路由表，避免深度遍历
- 组件渲染使用结构指令，支持过渡动画
- 状态更新采用响应式通知，减少不必要的重渲染

## 扩展性

- 支持自定义路由模式（history模式预留）
- 支持路由懒加载
- 支持路由元数据（meta）
- 支持路由重定向

## 测试覆盖

测试应覆盖：
- 路由匹配逻辑
- 参数解析
- 守卫执行顺序
- 组件生命周期
- 状态管理
- 边界情况（404、重定向等）
