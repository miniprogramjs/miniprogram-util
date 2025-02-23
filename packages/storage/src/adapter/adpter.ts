export interface Adapter {
    name: string;
    setItem(key: string, value: unknown): Adapter;
    getItem<T>(key: string): T;
    removeItem(key: string): Adapter;
    size(): number;
    keys(): string[];
}
