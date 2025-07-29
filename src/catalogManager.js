const rpdb = require("../services/rpdb");
const cache = require("../utils/cache");
const { imdbToMeta } = require("./metadataManager");

async function checkCache(key, year, mediaType, source) {
	if (key == null || key === "") {
		return null;
	}

	const cacheKey = await cache.createCacheKey(key, year, mediaType, source);
	return await cache.getCache(cacheKey);
}

async function saveCache(key, year, mediaType, source, catalog) {
	if (key == null || key === "") {
		return null;
	}

	const cacheKey = await cache.createCacheKey(key, year, mediaType, source);
	await cache.setCache(cacheKey, catalog);
}

async function createMetaPreview(imdbId, type, rpdbApiKey, metadataSource) {
	const apiKey = rpdbApiKey.key;
	const validKey = rpdbApiKey.valid;

	const mediaType = type === "movie" ? "movie" : "series";
	const media = await imdbToMeta(imdbId, mediaType, metadataSource);

	let meta = {};
	if (media) {
		let poster = "";
		if (validKey) {
			poster = await rpdb.getRPDBPoster(imdbId, apiKey);
		}

		// If RPDB is not used or fails to provide a poster, then use default poster
		if (poster === "") {
			poster = media.poster ? media.poster : "";
		}

		// Remove media if there is no poster. Mostly for visual improvements for the catalogs
		if (poster === "") {
			return null;
		}

		meta = {
			id: metadataSource.source === "tmdb" ? "mlt-" + media.imdb_id : media.imdb_id,
			//id: media.imdb_id,
			name: media.title,
			poster: poster,
			type: mediaType,
		};
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
