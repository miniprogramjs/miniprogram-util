# 快速开始

## 安装

<VueMasteryLogoLink for="pinia-cheat-sheet">
</VueMasteryLogoLink>

```bash
npm add @miniprogram-util/storage
```

# 基础用法

## 创建实例

```js {2,5-6,8}
import { createStorage } from '@miniprogram-util/storage';

// 创建存储实例
const storage = createStorage();

// 存储数据
storage.setItem('name', 'John');

// 读取数据
const name = storage.getItem < string > 'name';

// 设置带过期时间的数据（5秒后过期）
storage.setItem('token', 'xxx', 5000);
```

## 创建实例

```js {1,3-4,12}
import { createStorage } from '@miniprogram-util/storage';
// 默认实例
const storage = createStorage();

// 带前缀的实例
const userStorage = createStorage({ prefix: 'user' });

// 独立数据空间的实例
const settingsStorage = createStorage({ id: 'settings' });
```
