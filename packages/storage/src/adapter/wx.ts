import type { Adapter } from './adpter';

export const wxAdapter: Adapter = {
    name: 'wx',
    setItem(key: string, value: unknown) {
        wx.setStorageSync(key, value);
        return this;
    },
    getItem(key: string) {
        return wx.getStorageSync(key);
    },
    removeItem(key: string) {
        wx.removeStorageSync(key);
        return this;
    },
    size() {
        return wx.getStorageInfoSync().currentSize;
    },
    keys() {
        return wx.getStorageInfoSync().keys;
    },
};
