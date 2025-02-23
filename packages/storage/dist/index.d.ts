declare interface Cache_2 {
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T, stdTTL?: number | undefined): this;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
}

export declare function createStorage(config?: StorageConfig): Storage_2;

export declare const storage: Storage_2;

declare interface Storage_2 {
    getItem<T>(key: string): T | undefined;
    setItem<T>(key: string, value: T, stdTTL?: number): Storage_2;
    removeItem(key: string): Storage_2;
    clear(predicate: (key: string) => boolean | Promise<boolean>): void;
    keys: string[];
    cache: Cache_2;
}

declare interface StorageConfig {
    prefix?: string;
    id?: string;
}

export {};
