const cacheStore = new Map()

function now() {
    return Date.now()
}

exports.getCache = (key) => {
    const cached = cacheStore.get(key)
    if (!cached) {
        return null
    }
    if (cached.expiresAt <= now()) {
        cacheStore.delete(key)
        return null
    }
    return cached.value
}

exports.setCache = (key, value, ttlMs = 30_000) => {
    cacheStore.set(key, {
        value,
        expiresAt: now() + ttlMs
    })
}

exports.invalidateByPrefix = (prefix) => {
    for (const key of cacheStore.keys()) {
        if (key.startsWith(prefix)) {
            cacheStore.delete(key)
        }
    }
}
