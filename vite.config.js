import path, { resolve } from 'path';
import { normalizePath } from 'vite';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default {
    base: './',
    plugins: [
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