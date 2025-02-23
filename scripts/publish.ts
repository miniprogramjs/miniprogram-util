import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const pkgPath = resolve(__dirname, '../packages/storage/package.json');
const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));

// 增加版本号
const version = pkgJson.version.split('.');
version[2] = String(Number(version[2]) + 1);
pkgJson.version = version.join('.');

// 写回 package.json
writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2));

// 执行构建
execSync('cross-env PKG=storage pnpm run build', { stdio: 'inherit' });

// 创建发布预览目录
const previewDir = resolve(__dirname, '../preview');
const versionDir = resolve(previewDir, pkgJson.version);

// 展示目录结构的函数
function showDirectoryStructure(dir: string, prefix = ''): void {
    const files = readdirSync(dir, { withFileTypes: true });
    files.forEach((file, index) => {
        const isLast = index === files.length - 1;
        const newPrefix = prefix + (isLast ? '└── ' : '├── ');
        console.log(newPrefix + file.name);
        if (file.isDirectory()) {
            showDirectoryStructure(
                resolve(dir, file.name),
                prefix + (isLast ? '    ' : '│   ')
            );
        }
    });
}

try {
    mkdirSync(previewDir, { recursive: true });
    mkdirSync(versionDir, { recursive: true });
    mkdirSync(resolve(versionDir, 'dist'), { recursive: true });

    // 复制打包结果到 dist 目录
    const distDir = resolve(__dirname, '../packages/storage/dist');
    const files = readdirSync(distDir);
    files.forEach(file => {
        copyFileSync(resolve(distDir, file), resolve(versionDir, 'dist', file));
    });

    // 复制 package.json
    copyFileSync(pkgPath, resolve(versionDir, 'package.json'));

    // 展示打包结果
    console.log('\n📦 打包结果已保存到：', versionDir);
    console.log('\n📁 目录结构：');
    showDirectoryStructure(versionDir);

    console.log('\n📄 ES Module 内容预览：');
    execSync(`cat ${versionDir}/dist/index.js | head -n 20`, { stdio: 'inherit' });
    console.log('\n📄 CommonJS 内容预览：');
    execSync(`cat ${versionDir}/dist/index.cjs | head -n 20`, { stdio: 'inherit' });
    console.log('\n📄 类型声明预览：');
    execSync(`cat ${versionDir}/dist/index.d.ts | head -n 20`, { stdio: 'inherit' });
} catch (error) {
    console.error('创建预览目录失败：', error);
    process.exit(1);
}

// 确认是否发布
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
});

readline.question('\n确认发布? (y/n) ', (answer: string) => {
    if (answer.toLowerCase() === 'y') {
        // 发布包
        execSync('cd packages/storage && npm publish', { stdio: 'inherit' });
        console.log(`\n✅ Published @miniprogram-util/storage@${pkgJson.version}`);
    } else {
        console.log('\n❌ 取消发布');
    }
    readline.close();
});
