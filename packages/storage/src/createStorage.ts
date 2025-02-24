import { Adapter } from './adapter/adpter';
import { createCache, Cache } from './cache';
import {
    createStorageKey,
    getOriginalKey,
    createStorageSpaceKey,
    checkStorageSpaceKey,
    createExpirationData,
    isExpirationData,
    checkExpired,
} from './utils';

export interface StorageConfig {
    prefix?: string;
    id?: string;
    adapter: Adapter;
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

export function createStorage(config: StorageConfig): Storage {
    const localCache = createCache();
    const cache = createCache();

    const { prefix, id } = config;

    if (!config?.adapter) {
        throw new Error('');
    }

    const adapter = config.adapter;

    // 初始化全局缓存
    initializeGlobalCache(adapter);

    // 如果配置了id，初始化数据空间
    const storageSpaceKey = typeof id === 'string' ? createStorageSpaceKey(id) : '';

    if (storageSpaceKey) {
        const data = adapter.getItem<string>(storageSpaceKey);

        if (data) {
            const storageSpace = JSON.parse(data);

            Object.keys(storageSpace).forEach((key) => {
                localCache.set(key, storageSpace[key]);
            });
        }
    }

    function persistStorageSpace(): void {
        if (storageSpaceKey) {
            adapter.setItem(storageSpaceKey, JSON.stringify(localCache.recordData()));
        }
    }

    function returnValue<T>(key: string, value: T): T | undefined {
        if (isExpirationData(value) && checkExpired(value)) {
            adapter.removeItem(key);
            return;
        }

        return value;
    }

    return {
        getItem<T>(key: string): T | undefined {
            if (storageSpaceKey) {
                return localCache.get(key);
            }

            const storageKey = createStorageKey(prefix, key);

            const cacheValue = globalCache.get<T>(storageKey);

            if (cacheValue) {
                return cacheValue;
            }

            const value = returnValue(storageKey, adapter.getItem<T>(storageKey));

            if (value) {
                globalCache.set(storageKey, value);
            }

            return value;
        },

        setItem<T>(key: string, value: T, stdTTL?: number): Storage {
            if (storageSpaceKey) {
                localCache.set(key, value, stdTTL);
                persistStorageSpace();
                return this;
            }

            const storageKey = createStorageKey(prefix, key);

            const data =
                typeof stdTTL === 'number' && stdTTL > 0
                    ? createExpirationData(stdTTL, value)
                    : value;

            adapter.setItem(storageKey, data);
            globalCache.set(storageKey, data);

            return this;
        },

        removeItem(key: string): Storage {
            if (storageSpaceKey) {
                localCache.delete(key);
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
                const keys = Object.keys(localCache.keys());

                for (const key of keys) {
                    const result = await Promise.resolve(predicate(key));

                    if (result) {
                        localCache.delete(key);
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
            return id ? localCache.keys() : adapter.keys();
        },

        get cache(): Cache {
            return cache;
        },
    };
}
