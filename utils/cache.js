const logger = require("./logger");
const { CACHE_TTL, REDIS_HOST, REDIS_PORT, REDIS_DB, MAX_CACHE_SIZE, REDIS_URL } = require("../config");
const Redis = require("ioredis");

let redisCache = null;
let useRedis = false;
const localCache = new Map();

if (REDIS_URL) {
	redisCache = new Redis(REDIS_URL);
	useRedis = true;
} else if (REDIS_HOST && REDIS_PORT && REDIS_DB) {
	redisCache = new Redis({
		host: REDIS_HOST,
		port: parseInt(REDIS_PORT),
		db: parseInt(REDIS_DB),
	});

	useRedis = true;
}

/**
 * Retrieves data from the cache.
 * @param {string} key - The cache key (e.g., search query).
 * @returns {any|null} - Cached data or null if expired/not found.
 */
async function getCache(key) {
	if (!key) return null;

	try {
		// Use local cache for meta or if Redis is not set up
		if (key.startsWith("meta") || !useRedis || !redisCache) {
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
		} else if (useRedis && redisCache) {
			const cached = await redisCache.get(key);
			if (cached) {
				logger.cache("RETRIEVED CACHE", key);
				return JSON.parse(cached);
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
		// Use local cache for meta or if Redis is not set up
		if (key.startsWith("meta") || !useRedis || !redisCache) {
			// If cache size exceeds max limit, remove the oldest entry
			if (localCache.size >= MAX_CACHE_SIZE) {
				const oldestKey = localCache.keys().next().value; // Get the first inserted key
				localCache.delete(oldestKey); // Remove oldest entry
			}

			localCache.set(key, { lastUpdated: Date.now(), data: data });
			logger.cache("SAVE CACHE", key);
		} else if (useRedis && redisCache) {
			await redisCache.set(key, JSON.stringify(data), "EX", Math.floor(CACHE_TTL));
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
 * @param {string} imdbId - The search title.
 * @param {string} year - The search year.
 * @param {string} type - The media type (movie/series).
 * @param {string} source - The recommendation source.
 * @returns {string|null} - The generated cache key.
 */
async function createCatalogCacheKey(imdbId, year, type, source) {
	if (!imdbId || imdbId === "") {
		return null;
	}

	const cacheSearchKey = imdbId.trim().replace(/\s+/g, "_");

	// If year/type is missing, set it to "any"
	const cacheYear = year || "any";
	const cacheType = type || "any";

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

async function createRecCacheKey(imdbId, type, recSource) {
	return `recs:${imdbId}:${type}:${recSource}`;
}

module.exports = {
	getCache,
	setCache,
	deleteCache,
	createCatalogCacheKey,
	createMetaCacheKey,
	createRecCacheKey,
};
