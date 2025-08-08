const logger = require("./logger");
const { CACHE_TTL, REDIS_HOST, REDIS_PORT, REDIS_DB, MAX_CACHE_SIZE, REDIS_URL } = require("../config");
const Redis = require("ioredis");

let redisCache = null;
let useRedis = false;
const localCache = new Map();

if (REDIS_HOST && REDIS_PORT && REDIS_DB) {
	redisCache = new Redis({
		host: REDIS_HOST,
		port: parseInt(REDIS_PORT),
		db: parseInt(REDIS_DB),
	});

	useRedis = true;
} else if (REDIS_URL) {
	redisCache = new Redis(REDIS_URL);
	useRedis = true;
}

// Lock map to prevent race conditions
const locks = new Map();

async function withLock(key, fn) {
	if (!key) return;

	// If there's already a pending lock, wait for it
	while (locks.has(key)) {
		await locks.get(key);
	}

	// Create a new lock
	let resolve;
	const lockPromise = new Promise((res) => (resolve = res));
	locks.set(key, lockPromise);

	try {
		await fn(); // Run the code that uses the cache
	} finally {
		locks.delete(key);
		resolve(); // Unlock
	}
}

/**
 * Retrieves data from the cache.
 * @param {string} key - The cache key (e.g., search query).
 * @returns {any|null} - Cached data or null if expired/not found.
 */
async function getCache(key) {
	if (!key) return null;

	try {
		if (useRedis && redisCache) {
			const cached = await redisCache.get(key);
			if (cached) {
				logger.cache("RETRIEVED CACHE", key);
				return JSON.parse(cached);
			}
		} else {
			if (localCache.has(key)) {
				const cached = localCache.get(key);

				const expired = Date.now() - cached.lastUpdated > CACHE_TTL;

				if (cached && !expired) {
					logger.cache("RETRIEVED CACHE", key);
					return cached.data;
				} else {
					localCache.delete(key);
					return null;
				}
			}
		}
		return null;
	} catch (err) {
		logger.error("Error reading from cache:", err);
		return null;
	}
}

/**
 * Stores data in the cache.
 * @param {string} key - The cache key.
 * @param {array} data - Data to cache.
 */
async function setCache(key, data) {
	if (!key) return;

	try {
		if (useRedis && redisCache) {
			await redisCache.set(key, JSON.stringify(data), "EX", Math.floor(CACHE_TTL));
			logger.cache("SAVE CACHE", key);
		} else {
			// If cache size exceeds max limit, remove the oldest entry
			if (localCache.size >= MAX_CACHE_SIZE) {
				const oldestKey = localCache.keys().next().value; // Get the first inserted key
				localCache.delete(oldestKey); // Remove oldest entry
			}

			localCache.set(key, { lastUpdated: Date.now(), data: data });
			logger.cache("SAVE CACHE", key);
		}
	} catch (err) {
		logger.error("Error writing to cache:", err);
	}
}

async function deleteCache(key) {
	await redisCache.del(key);
}

/**
 * Creates a cache key based on search parameters.
 * @param {string} searchTitle - The search title.
 * @param {string} searchYear - The search year.
 * @param {string} searchType - The media type (movie/series).
 * @param {string} source - The recommendation source.
 * @returns {string|null} - The generated cache key.
 */
async function createCatalogCacheKey(searchTitle, searchYear, searchType, source) {
	if (!searchTitle || searchTitle === "") {
		return null;
	}

	const cacheSearchKey = searchTitle.trim().replace(/\s+/g, "_");

	// If year/type is missing, set it to "any"
	const cacheYear = searchYear || "any";
	const cacheType = searchType || "any";

	return `catalog:${cacheSearchKey.toLowerCase()}_${cacheYear}_${cacheType}_${source}`;
}

/**
 * Creates a cache key based on search parameters.
 * @param {string} imdbId - ImdbId
 * @returns {string} - The generated cache key.
 */
async function createMetaCacheKey(imdbId, metaSource, language) {
	return `meta:${imdbId}:${metaSource}:${language}`;
}

async function createRecCacheKey(imdbId, recSource) {
	return `recs:${imdbId}:${recSource}`;
}

module.exports = {
	getCache,
	setCache,
	deleteCache,
	createCatalogCacheKey,
	createMetaCacheKey,
	createRecCacheKey,
};
