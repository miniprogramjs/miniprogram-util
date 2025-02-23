import { Adapter } from './adapter/adpter';
import { createCache, Cache } from './cache';
import {
    createStorageKey,
    getOriginalKey,
    createStorageSpaceKey,
    checkStorageSpaceKey,
} from './utils';

export interface StorageConfig {
    prefix?: string;
    id?: string;
}

export interface Storage {
    getItem<T>(key: string): T | undefined;
    setItem<T>(key: string, value: T, stdTTL?: number): Storage;
    removeItem(key: string): Storage;
    clear(predicate: (key: string) => boolean | Promise<boolean>): void;
    keys: string[];
    cache: Cache;
}

const globalCache = createCache();

const initializeGlobalCache = (adapter: Adapter): void => {
    const keys = adapter.keys();

    keys.forEach((key: string) => {
        setTimeout(() => {
            const value = adapter.getItem(key);
            globalCache.set(key, value);
        }, 0);
    });
};

export function createStorage(config: StorageConfig = {}, adapter: Adapter): Storage {
    const localCache = createCache();
    const { prefix, id } = config;

    // 初始化全局缓存
    initializeGlobalCache(adapter);

    // 如果配置了id，初始化数据空间
    let storageSpace: Record<string, unknown> = {};
    const storageSpaceKey = typeof id === 'string' ? createStorageSpaceKey(id) : '';

    if (storageSpaceKey) {
        const data = adapter.getItem<string>(storageSpaceKey);

        if (data) {
            storageSpace = JSON.parse(data);
        }
    }

    function persistStorageSpace(): void {
        if (storageSpaceKey) {
            adapter.setItem(storageSpaceKey, JSON.stringify(storageSpace));
        }
    }

    return {
        getItem<T>(key: string): T | undefined {
            if (storageSpaceKey) {
                return storageSpace[key] as T;
            }

            const storageKey = createStorageKey(prefix, key);

            if (globalCache.has(storageKey)) {
                return globalCache.get<T>(storageKey);
            }

            const value = adapter.getItem<T>(storageKey);

            globalCache.set(storageKey, value);

            return value;
        },

        setItem<T>(key: string, value: T, stdTTL?: number): Storage {
            if (storageSpaceKey) {
                storageSpace[key] = value;
                persistStorageSpace();
                return this;
            }

            const storageKey = createStorageKey(prefix, key);

            adapter.setItem(storageKey, value);
            globalCache.set(storageKey, value, stdTTL);

            return this;
        },

        removeItem(key: string): Storage {
            if (storageSpaceKey) {
                delete storageSpace[key];
                persistStorageSpace();
                return this;
            }

            const storageKey = createStorageKey(prefix, key);

            adapter.removeItem(storageKey);
            globalCache.delete(storageKey);

            return this;
        },

        async clear(predicate: (key: string) => boolean | Promise<boolean>): Promise<void> {
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }

            // 配置了id
            if (storageSpaceKey) {
                const keys = Object.keys(storageSpace);

                for (const key of keys) {
                    const result = await Promise.resolve(predicate(key));

                    if (result) {
                        delete storageSpace[key];
                    }
                }

                persistStorageSpace();

                return;
            }

            const keys = adapter.keys();

            for (const key of keys) {
                // 跳过其他storageSpaceKey
                if (checkStorageSpaceKey(key)) {
                    continue;
                }

                const originalKey = getOriginalKey(prefix, key);

                // 有前缀 & 原始key与前缀key相同，非当前storage的数据
                if (prefix && originalKey === key) {
                    continue;
                }

                const result = await Promise.resolve(predicate(originalKey));

                if (result) {
                    adapter.removeItem(key);
                    globalCache.delete(key);
                }
            }
        },

        get keys(): string[] {
            return id ? Object.keys(storageSpace) : adapter.keys();
        },

        get cache(): Cache {
            return localCache;
        },
    };
}
