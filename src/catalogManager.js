const cache = require("../utils/cache");
const { createMetaPreview } = require("./metadataManager");

async function checkCache(imdbId, year, mediaType, source) {
	if (imdbId == null || imdbId === "") {
		return null;
	}

	const cacheKey = await cache.createCatalogCacheKey(imdbId, year, mediaType, source);
	return await cache.getCache(cacheKey);
}

async function saveCache(imdbId, year, mediaType, source, catalog) {
	if (imdbId == null || imdbId === "") {
		return null;
	}

	const cacheKey = await cache.createCatalogCacheKey(imdbId, year, mediaType, source);
	await cache.setCache(cacheKey, catalog);
}

/**
 * Creates a Stremio recommendation catalog
 * @param {array} recs - an array of rec ids
 * @param {string} mediaType - Media type of catalog. Either "movie" or "series"
 * @param {object} rpdbApiKey - Contains API Key and valid flag
 * @param {object} metadataSource - Indicate what source to use to obtain meta data
 * @returns {array} - Stremio Catalog
 */
async function createRecCatalog(recs, mediaType, apiKeys, metadataSource) {
	if (!recs || recs.length === 0) {
		return null;
	}

	let catalog = await Promise.all(
		recs
			.filter((row) => row != null)
			.map(async (rec) => {
				const meta = await createMetaPreview(rec, mediaType, apiKeys, metadataSource);
				if (!meta || Object.keys(meta).length === 0) {
					return null;
				}
				return { ...meta };
			}),
	);
	catalog = catalog.filter((row) => row != null);

	return catalog;
}

module.exports = {
	checkCache,
	saveCache,
	createRecCatalog,
};
