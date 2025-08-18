const cache = require("../utils/cache");
const rpdb = require("../services/rpdb");
const { generateMeta } = require("./metadataManager");

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

async function createMetaPreview(imdbId, type, rpdbApiKey, metadataSource) {
	// When using Cinemeta, can just return id and type for Cinemeta's metadata
	if (metadataSource.source === "cinemeta") {
		if (rpdbApiKey.valid) {
			const rpdbPoster = await rpdb.getRPDBPoster(imdbId, rpdbApiKey.key);
			return { id: imdbId, type: type, poster: rpdbPoster };
		}
		return { id: imdbId, type: type };
	}

	let meta = await generateMeta(imdbId, type, rpdbApiKey, metadataSource);

	if (meta) {
		// Set custom addon id so that Stremio can call this addon's meta handler
		meta.id = metadataSource.source === "tmdb" ? "mlt-" + imdbId : imdbId;
	}

	return meta;
}

/**
 * Creates a Stremio recommendation catalog
 * @param {array} recs - an array of IMDB Ids
 * @param {string} mediaType - Media type of catalog. Either "movie" or "series"
 * @param {object} rpdbApiKey - Contains API Key and valid flag
 * @param {object} metadataSource - Indicate what source to use to obtain meta data
 * @returns {array} - Stremio Catalog
 */
async function createRecCatalog(recs, mediaType, rpdbApiKey, metadataSource) {
	if (!recs || recs.length === 0) {
		return null;
	}

	let catalog = await Promise.all(
		recs
			.filter((row) => row != null)
			.map(async (rec) => {
				const meta = await createMetaPreview(rec.id, mediaType, rpdbApiKey, metadataSource);
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
