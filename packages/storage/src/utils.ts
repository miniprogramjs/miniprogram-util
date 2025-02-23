export enum RuntimeEnvironment {
    wx,
    unknown,
}

export function getRuntimeEnvironment(): RuntimeEnvironment {
    if (typeof wx !== 'undefined' && typeof wx.canIUse === 'function') {
        return RuntimeEnvironment.wx;
    }
    return RuntimeEnvironment.unknown;
}

export interface ExpirationData<T> {
    expirationDate: number;
    data: T;
}

export function createExpirationData<T>(stdTTL: number, data: T): ExpirationData<T> {
    return {
        expirationDate: Date.now() + stdTTL,
        data,
    };
}

export function isExpirationData(value: unknown): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const data = value as Record<string, unknown>;
    return typeof data.expirationDate === 'number' && 'data' in data;
}

export function checkExpired(data: unknown): boolean {
    if (isExpirationData(data)) {
        const expData = data as ExpirationData<unknown>;
        return Date.now() > expData.expirationDate;
    }
    return false;
}

export function createStorageKey(prefix: string | undefined, key: string): string {
    return prefix ? `${prefix}-${key}` : key;
}

const spaceKeyPrefix = 'app*space-';

export const createStorageSpaceKey = (id: string): string => {
    return createStorageKey(spaceKeyPrefix, id);
};

export const checkStorageSpaceKey = (storageKey: string): boolean => {
    const regex = /^app\*space-/;

    return regex.test(storageKey);
};

export function getOriginalKey(prefix: string | undefined, storageKey: string): string {
    if (!prefix) {
        return storageKey;
    }

    const prefixPattern = `${prefix}-`;
    const regex = new RegExp(`^${prefixPattern}(.*)$`);
    const match = storageKey.match(regex);

    return match?.[1] ?? storageKey;
}
