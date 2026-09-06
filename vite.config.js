import path, { resolve } from 'path';
import { normalizePath } from 'vite';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import ts from 'typescript';

/**
 * Vite 8 默认使用 oxc 转换 TS 装饰器，但 oxc 对 legacy（experimentalDecorators）
 * 的类成员装饰器处理有缺陷：会把 `@state`/`@prop` 等成员装饰器引用的导入名从
 * import 语句中剔除，却仍生成 `_decorate([state], ...)`，导致运行时
 * "ReferenceError: xxx is not defined"。
 *
 * 这里在 oxc 之前先用 TypeScript 编译器将 legacy 装饰器完整降级为普通 JS，
 * 使转换产物与 compelem 自身（rollup-plugin-typescript2）的行为保持一致。
 */
function legacyDecorators() {
  return {
    name: 'legacy-decorators',
    enforce: 'pre',
    configResolved(config) {
      // 确保实例级转换（transformRequest）也经过本插件
      return undefined
    },
    transform(code, id) {
      if (!id.endsWith('.ts')) return null
      if (id.includes('node_modules')) return null
      const out = ts.transpileModule(code, {
        fileName: id,
        reportDiagnostics: false,
        compilerOptions: {
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          experimentalDecorators: true,
          emitDecoratorMetadata: false,
          importHelpers: false,
          esModuleInterop: true,
          isolatedModules: true,
          verbatimModuleSyntax: false,
          allowSyntheticDefaultImports: true,
        },
      })
      const fatal = out.diagnostics?.filter(
        (d) => d.category === ts.DiagnosticCategory.Error
      )
      if (fatal?.length) {
        // 交给 vite 自行报告原始错误
        return null
      }
      return { code: out.outputText, map: null }
    },
  }
}

export default {
    base: './',
    // 禁用 oxc 对 TS/JS 的再转换：oxc 会错误地剔除 legacy 装饰器引用的导入名，
    // 由上方 legacyDecorators() 插件统一用 TypeScript 完成装饰器降级。
    oxc: false,
    plugins: [
        legacyDecorators(),
        dts({
            tsconfigPath: path.resolve(__dirname, 'tsconfig.build.json'),
            outDir: 'dist/types',
            insertTypesEntry: true,
        }),
        viteStaticCopy({
            targets: [
                { src: normalizePath(resolve(__dirname, './package.json')), dest: normalizePath(resolve(__dirname, './dist')) },
                { src: normalizePath(resolve(__dirname, './README.md')), dest: normalizePath(resolve(__dirname, './dist')) },
                { src: normalizePath(resolve(__dirname, './LICENSE')), dest: normalizePath(resolve(__dirname, './dist')) },
            ]
        })
    ],
    build: {
        minify: false,
        lib: {
            entry: resolve(__dirname, 'src/index.ts'), // 入口文件，包含导出组件的代码
            name: 'compelem-router', // 打包后的库名称，将会是 UMD/ESM/IIFE 格式的库名
            fileName: (format) => `index.${format}.js` // 输出文件名格式
        },
        rollupOptions: {
            external: ['compelem', 'myfx', 'query-string'],
        }
    }
}