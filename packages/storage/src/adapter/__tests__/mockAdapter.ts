import { Adapter } from '../adpter';

export const mockAdapter: Adapter = {
    name: 'mock',
    store: new Map<string, unknown>(),

    setItem(key: string, value: unknown) {
        this.store.set(key, value);
        return this;
    },

    getItem(key: string) {
        return this.store.get(key);
    },

    removeItem(key: string) {
        this.store.delete(key);
        return this;
    },

    size() {
        return this.store.size;
    },

    keys() {
        return Array.from(this.store.keys());
    },

    clear() {
        this.store.clear();
        return this;
    },
};
