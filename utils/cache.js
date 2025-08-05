const logger = require("./logger");
const { CACHE_TTL, MAX_CACHE_SIZE } = require("../config");

const catalogCache = new Map();
const idCache = new Map();

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
	if (!key) {
		return null;
	}

	// Determine which cache
	let cache = {};
	if (key.startsWith("catalog")) {
		cache = catalogCache;
	} else if (key.startsWith("id")) {
		cache = idCache;
	}

	if (cache.has(key)) {
		const entry = cache.get(key);

		const expired = Date.now() - entry.lastUpdated > CACHE_TTL;

		// If the entry exists and has not expired, return it
		if (entry && !expired) {
			logger.cache("RETRIEVED CACHE", key);
			return entry.data;
		} else {
			// Otherwise, remove the expired entry and return null
			cache.delete(key); // Remove expired entry
			return null;
		}
	}

	return null;
}

/**
 * Stores data in the cache.
 * @param {string} key - The cache key.
 * @param {array} data - Data to save to cache
 */
async function setCache(key, data) {
	if (!key) {
		return;
	}

	// Call with lock so that async calls don't overwrite each other
	await withLock(key, async () => {
		// Determine which cache
		let cache = {};
		if (key.startsWith("catalog")) {
			cache = catalogCache;
		} else if (key.startsWith("id")) {
			cache = idCache;
		}

		// If cache size exceeds max limit, remove the oldest entry
		if (cache.size >= MAX_CACHE_SIZE) {
			const oldestKey = cache.keys().next().value; // Get the first inserted key
			cache.delete(oldestKey); // Remove oldest entry
		}

		cache.set(key, { lastUpdated: Date.now(), data: data });
		logger.cache("SAVE CACHE", key);
	});
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
 * @param {string} source - Metadata source
 * @param {string} language - Language
 * @param {bool} rpdb - If rpdb was used
 * @returns {string|null} - The generated cache key.
 */
async function createIdCacheKey(imdbId) {
	return `id:${imdbId}`;
}

module.exports = {
	getCache,
	setCache,
	createCatalogCacheKey,
	createIdCacheKey,
};
