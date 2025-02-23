import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';
import fs from 'fs';

interface PackageJson {
    buildOptions?: {
        name: string;
        formats: Array<'es' | 'cjs' | 'umd'>;
        entry: string;
    };
}

// 获取当前正在构建的包名
const pkgName = process.env.PKG;

if (!pkgName) {
    throw new Error('请设置 PKG 环境变量指定要构建的包名');
}

// 读取包的 package.json
const pkgPath = resolve(__dirname, `packages/${pkgName}`);
const pkg = JSON.parse(fs.readFileSync(resolve(pkgPath, 'package.json'), 'utf-8')) as PackageJson;

if (!pkg.buildOptions) {
    throw new Error(`packages/${pkgName}/package.json 中缺少 buildOptions 配置`);
}

const { buildOptions } = pkg;

export default defineConfig({
    build: {
        lib: {
            entry: resolve(pkgPath, buildOptions.entry),
            name: buildOptions.name,
            formats: buildOptions.formats,
            fileName: (format) =>
                `index.${format === 'es' ? 'js' : format === 'cjs' ? 'cjs' : 'umd.js'}`,
        },
        outDir: resolve(pkgPath, 'dist'),
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
            },
            format: {
                comments: false,
            },
        },
        rollupOptions: {
            output: {
                exports: 'named',
            },
        },
    },
    plugins: [
        dts({
            entryRoot: resolve(pkgPath, 'src'),
            outDir: resolve(pkgPath, 'dist'),
            insertTypesEntry: true,
            rollupTypes: true,
        }),
    ],
});
