const wxAdapter = {
  name: "wx",
  setItem(key, value) {
    wx.setStorageSync(key, value);
    return this;
  },
  getItem(key) {
    return wx.getStorageSync(key);
  },
  removeItem(key) {
    wx.removeStorageSync(key);
    return this;
  },
  size() {
    return wx.getStorageInfoSync().currentSize;
  },
  keys() {
    return wx.getStorageInfoSync().keys;
  }
};
var RuntimeEnvironment = /* @__PURE__ */ ((RuntimeEnvironment2) => {
  RuntimeEnvironment2[RuntimeEnvironment2["wx"] = 0] = "wx";
  RuntimeEnvironment2[RuntimeEnvironment2["unknown"] = 1] = "unknown";
  return RuntimeEnvironment2;
})(RuntimeEnvironment || {});
function getRuntimeEnvironment() {
  if (typeof wx !== "undefined" && typeof wx.canIUse === "function") {
    return 0;
  }
  return 1;
}
function createExpirationData(stdTTL, data) {
  return {
    expirationDate: Date.now() + stdTTL,
    data
  };
}
function isExpirationData(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const data = value;
  return typeof data.expirationDate === "number" && "data" in data;
}
function checkExpired(data) {
  if (isExpirationData(data)) {
    const expData = data;
    return Date.now() > expData.expirationDate;
  }
  return false;
}
function createStorageKey(prefix, key) {
  return prefix ? `${prefix}-${key}` : key;
}
const spaceKeyPrefix = "app*space-";
const createStorageSpaceKey = (id) => {
  return createStorageKey(spaceKeyPrefix, id);
};
const checkStorageSpaceKey = (storageKey) => {
  const regex = /^app\*space-/;
  return regex.test(storageKey);
};
function getOriginalKey(prefix, storageKey) {
  if (!prefix) {
    return storageKey;
  }
  const prefixPattern = `${prefix}-`;
  const regex = new RegExp(`^${prefixPattern}(.*)$`);
  const match = storageKey.match(regex);
  return (match == null ? void 0 : match[1]) ?? storageKey;
}
function createAdapter() {
  const environment = getRuntimeEnvironment();
  if (environment === RuntimeEnvironment.wx) {
    return wxAdapter;
  }
  throw new Error("小程序运行环境有误");
}
const createCache = () => {
  const store = /* @__PURE__ */ new Map();
  return {
    get(key) {
      const data = store.get(key);
      if (!isExpirationData(data)) {
        return data;
      }
      if (checkExpired(data)) {
        return void 0;
      }
      return data.data;
    },
    set(key, value, stdTTL) {
      const data = typeof stdTTL === "number" && stdTTL > 0 ? createExpirationData(stdTTL, value) : value;
      store.set(key, data);
      return this;
    },
    has(key) {
      return store.has(key);
    },
    delete(key) {
      return store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
};
const globalCache = createCache();
const initializeGlobalCache = (adapter) => {
  const keys = adapter.keys();
  keys.forEach((key) => {
    setTimeout(() => {
      const value = adapter.getItem(key);
      globalCache.set(key, value);
    }, 0);
  });
};
function createStorage(config = {}) {
  const adapter = createAdapter();
  const localCache = createCache();
  const { prefix, id } = config;
  initializeGlobalCache(adapter);
  let storageSpace = {};
  const storageSpaceKey = typeof id === "string" ? createStorageSpaceKey(id) : "";
  if (storageSpaceKey) {
    const data = adapter.getItem(storageSpaceKey);
    if (data) {
      storageSpace = JSON.parse(data);
    }
  }
  function persistStorageSpace() {
    if (storageSpaceKey) {
      adapter.setItem(storageSpaceKey, JSON.stringify(storageSpace));
    }
  }
  return {
    getItem(key) {
      if (storageSpaceKey) {
        return storageSpace[key];
      }
      const storageKey = createStorageKey(prefix, key);
      if (globalCache.has(storageKey)) {
        return globalCache.get(storageKey);
      }
      const value = adapter.getItem(storageKey);
      globalCache.set(storageKey, value);
      return value;
    },
    setItem(key, value, stdTTL) {
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
    removeItem(key) {
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
    async clear(predicate) {
      if (typeof predicate !== "function") {
        throw new TypeError("predicate must be a function");
      }
      if (storageSpaceKey) {
        const keys2 = Object.keys(storageSpace);
        for (const key of keys2) {
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
        if (checkStorageSpaceKey(key)) {
          continue;
        }
        const originalKey = getOriginalKey(prefix, key);
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
    get keys() {
      return id ? Object.keys(storageSpace) : adapter.keys();
    },
    get cache() {
      return localCache;
    }
  };
}
createStorage();
const storage = createStorage();
export {
  createStorage,
  storage
};
