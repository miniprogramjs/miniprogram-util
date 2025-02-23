import { describe, it, expect, beforeEach, vi } from 'vitest';
import { wxAdapter } from '../adapter/wx';
import { mockAdapter } from '../adapter/__tests__/mockAdapter';
import { createStorage } from '../createStorage';

// Mock adapter factory
vi.mock('../adapter', () => ({
    wxAdapter,
}));

// Mock cache with real functionality
const cacheStore = new Map<string, unknown>();
vi.mock('../cache', () => ({
    createCache: () => ({
        get: (key: string) => cacheStore.get(key),
        set: (key: string, value: unknown) => {
            cacheStore.set(key, value);
            return { get: () => value };
        },
        has: (key: string) => cacheStore.has(key),
        delete: (key: string) => cacheStore.delete(key),
        clear: () => cacheStore.clear(),
    }),
}));

describe('Storage', () => {
    beforeEach(() => {
        mockAdapter.clear();
        cacheStore.clear();
        vi.clearAllMocks();
    });

    it('should store and retrieve values', () => {
        const storage = createStorage();
        storage.setItem('test', 'value');
        expect(storage.getItem('test')).toBe('value');
    });

    it('should handle expiration', async () => {
        const storage = createStorage();
        storage.setItem('test', 'value', 100); // 100ms expiration

        // 验证初始值
        expect(storage.getItem('test')).toBe('value');

        // 等待过期
        await new Promise((resolve) => setTimeout(resolve, 150));

        // 验证过期后的值
        expect(storage.getItem('test')).toBeUndefined();
    });

    it('should handle prefixed keys', () => {
        const storage = createStorage({ prefix: 'test' });
        storage.setItem('key', 'value');
        expect(mockAdapter.getItem('test//key')).toBeDefined();
    });

    it('should handle isolated storage', () => {
        const storage = createStorage({ id: 'test' });
        storage.setItem('key', 'value');
        const storedData = mockAdapter.getItem('test');
        expect(storedData).toBeDefined();
        expect(JSON.parse(storedData as string)).toHaveProperty('key', 'value');
    });

    it('should clear storage with predicate', async () => {
        const storage = createStorage();
        storage.setItem('test1', 'value1');
        storage.setItem('test2', 'value2');
        storage.setItem('other', 'value3');

        await storage.clear((key) => key.startsWith('test'));

        // 验证被清除的数据
        expect(storage.getItem('test1')).toBeUndefined();
        expect(storage.getItem('test2')).toBeUndefined();
        expect(storage.getItem('other')).toBe('value3');
    });
});
