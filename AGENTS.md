# AGENTS.md - AI助手指南

## 项目概述

**compelem-router** 是一个基于 [compelem](https://www.npmjs.com/package/compelem) 的前端路由库，为 Web Components 应用提供声明式路由能力。

## 项目结构

```
compelem-router/
├── src/
│   ├── components/          # 路由相关组件（如RouterLink）
│   ├── directives/          # 结构指令（如outlet）
│   ├── router/              # 核心路由实现
│   │   ├── HashRouter.ts    # Hash模式路由实现
│   │   ├── Routable.ts      # 路由匹配逻辑
│   │   └── Router.ts        # 路由器主类
│   ├── index.ts             # 主入口文件
│   ├── store.ts             # 路由状态管理
│   ├── types.ts             # TypeScript类型定义
│   ├── utils.ts             # 工具函数
│   └── const.ts             # 常量定义
├── test/                    # 测试文件
├── package.json
├── tsconfig.json
└── vite.config.js           # Vite构建配置
```

## 技术栈

- **语言**: TypeScript
- **框架**: compelem (Web Components库)
- **构建工具**: Vite
- **依赖**: compelem, myfx, query-string
- **开发**: npm scripts

## 核心功能

1. **Hash模式路由**: 基于location.hash监控URL变化
2. **嵌套路由**: 通过children配置路由层级
3. **路径语法**: 支持静态段、动态参数、正则参数、可选参数、通配符
4. **导航守卫**: 全局守卫、路由项守卫、组件守卫
5. **响应式路由状态**: useRoute()获取响应式路由信息
6. **路由链接组件**: <l-router-link>自动匹配激活样式

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建产物（ESM / UMD）至dist
npm run preview  # 预览构建产物
```

## 代码规范

- 使用TypeScript严格模式
- 遵循compelem的组件开发模式
- 使用装饰器语法（@tag, @state等）
- 保持函数式编程风格

## 常见任务

### 添加新路由功能
1. 在`src/router/`中修改路由匹配逻辑
2. 在`src/types.ts`中更新类型定义
3. 在`src/index.ts`中导出新API

### 添加新组件
1. 在`src/components/`中创建组件文件
2. 使用compelem的@tag装饰器定义组件
3. 在主入口文件中导出

### 修改指令
1. 在`src/directives/`中修改指令实现
2. 确保与compelem的指令系统兼容

## 注意事项

- 本库依赖compelem，请确保版本兼容性
- 路由状态管理通过store.ts实现单例模式
- 组件守卫需要考虑Web Components的生命周期
- 构建产物包括ESM和UMD两种格式

## 测试策略

- 测试文件位于`test/`目录
- 使用Vite的测试支持
- 覆盖路由匹配、守卫执行、状态管理等核心功能

## 性能优化

- 使用事件委托处理路由变化
- 实现路由懒加载支持
- 优化路由匹配算法
- 减少不必要的DOM更新
