import { checkExpired, createExpirationData, isExpirationData } from './utils';
import type { ExpirationData } from './utils';

export interface Cache {
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T, stdTTL?: number | undefined): this;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    keys(): Array<string>;
    recordData(): Record<string, unknown>;
}

export const createCache = (): Cache => {
    const store = new Map<string, unknown>();
    const keys = new Set<string>();
    return {
        get<T>(key: string): T | undefined {
            const data = store.get(key);

            if (!isExpirationData(data)) {
                return data as T;
            }

            if (checkExpired(data)) {
                store.delete(key);
                return undefined;
            }

            return (data as ExpirationData<T>).data;
        },

        set<T>(key: string, value: T, stdTTL?: number): Cache {
            const data =
                typeof stdTTL === 'number' && stdTTL > 0
                    ? createExpirationData(stdTTL, value)
                    : value;

            store.set(key, data);
            keys.add(key);

            return this;
        },

        has(key: string): boolean {
            return store.has(key);
        },

        delete(key: string): boolean {
            keys.delete(key);
            return store.delete(key);
        },

        clear(): void {
            store.clear();
            keys.clear();
        },

        keys(): Array<string> {
            return Array.from(keys);
        },

        recordData(): Record<string, unknown> {
            const storageSpace: Record<string, unknown> = {};

            store.forEach((value, key) => {
                storageSpace[key] = value;
            });

            return storageSpace;
        },
    };
};
