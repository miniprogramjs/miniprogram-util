import { describe, it, expect } from 'vitest';
import { Adapter } from '../adapter/adpter';
import { createStorage } from '../createStorage';
const mockStorage = new Map();

const mockAdapter: Adapter = {
    name: 'mockAdpter',
    setItem(key: string, value: unknown): Adapter {
        mockStorage.set(key, value);
        return this;
    },
    getItem(key: string) {
        return mockStorage.get(key);
    },
    removeItem(key: string): Adapter {
        mockStorage.delete(key);
        return this;
    },
    size() {
        // 用size模拟下
        return mockStorage.size;
    },
    keys() {
        const keys: Array<string> = [];

        mockStorage.forEach((_, key) => {
            keys.push(key);
        });

        return keys;
    },
};

describe('Storage', () => {
    const [id, prefix] = ['user', 'test'];

    const storage = createStorage({ adapter: mockAdapter });
    const userSpaceStorage = createStorage({ id, adapter: mockAdapter });
    const prefixStorage = createStorage({ prefix, adapter: mockAdapter });

    it('测试setItem,getItem是否生效', () => {
        storage.setItem('key', 'value1');
        userSpaceStorage.setItem('key', 'value2');
        prefixStorage.setItem('key', 'value3');

        expect(storage.getItem('key')).toBe('value1');
        expect(userSpaceStorage.getItem('key')).toBe('value2');
        expect(prefixStorage.getItem('key')).toBe('value3');
    });

    it('测试cache功能是否生效', () => {
        storage.cache.set('key', 'value1');
        userSpaceStorage.cache.set('key', 'value2');
        prefixStorage.cache.set('key', 'value3');

        expect(storage.cache.get('key')).toBe('value1');
        expect(userSpaceStorage.cache.get('key')).toBe('value2');
        expect(prefixStorage.cache.get('key')).toBe('value3');
    });

    it('测试有效期', async () => {
        storage.setItem('key2', 'value1', 100);
        userSpaceStorage.setItem('key2', 'value2', 100);
        prefixStorage.setItem('key2', 'value3', 100);

        // 验证初始值
        expect(storage.getItem('key2')).toBe('value1');
        expect(userSpaceStorage.getItem('key2')).toBe('value2');
        expect(prefixStorage.getItem('key2')).toBe('value3');

        // 等待过期
        await new Promise((resolve) => setTimeout(resolve, 150));

        // 验证过期后的值
        expect(storage.getItem('key2')).toBeUndefined();
        expect(userSpaceStorage.getItem('key2')).toBeUndefined();
        expect(prefixStorage.getItem('key2')).toBeUndefined();
    });

    it('测试id空间隔离', () => {
        userSpaceStorage.setItem('test', 'value');
        const userStoredData = mockAdapter.getItem(`app*space-${id}`);

        expect(userStoredData).toBeDefined();
        expect(JSON.parse(userStoredData as string)).toHaveProperty('test', 'value');
    });

    it('测试prefix', () => {
        storage.setItem('key3', 'value1');
        prefixStorage.setItem('key3', 'value3');

        const userPrefixStorage = createStorage({ id: 'user2', prefix, adapter: mockAdapter });
        userPrefixStorage.setItem('user', 'value');

        expect(mockAdapter.getItem('key3')).toBe('value1');
        expect(mockAdapter.getItem(`${prefix}-key3`)).toBe('value3');

        // id 与 prefix 只能生效 id
        expect(mockAdapter.getItem(`app*space-user2${prefix}`)).toBeUndefined();
        const storeData = JSON.parse(mockAdapter.getItem('app*space-user2'));
        expect(storeData).toHaveProperty('user', 'value');
    });

    it('测试清除数据', async () => {
        storage.setItem('test1', 'value1');
        storage.setItem('test2', 'value2');
        storage.setItem('other', 'value3');

        await storage.clear((key) => key.startsWith('test'));

        // 验证被清除的数据
        expect(storage.getItem('test1')).toBeUndefined();
        expect(storage.getItem('test2')).toBeUndefined();
        expect(storage.getItem('other')).toBe('value3');
    });

    it('测试缓存是否有效', async () => {
        mockStorage.clear();
        expect(storage.getItem('other')).toBe('value3');
    });
});
