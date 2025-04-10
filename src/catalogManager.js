const rpdb = require("../services/rpdb");
const cache = require("../utils/cache");
const logger = require("../utils/logger");
const { imdbToMeta, titleToImdb } = require("./convertMetadata");

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

async function createMeta(imdbId, type, rpdbApiKey, metaSource) {
	const apiKey = rpdbApiKey.key;
	const validKey = rpdbApiKey.valid;

	const mediaType = type === "movie" ? "movie" : "series";
	const media = await imdbToMeta(imdbId, mediaType, metaSource);

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
			id: media.imdb_id,
			name: media.title,
			poster: poster,
			backdrop: media.backdrop,
			type: mediaType,
			year: media.year,
			genres: media.genres,
		};
	}

	return meta;
}

/**
 * Creates a Stremio recommendation catalog
 * @param {array} recs - an array of IMDB Ids
 * @param {string} mediaType - Media type of catalog. Either "movie" or "series"
 * @param {object} rpdbApiKey - Contains API Key and valid flag
 * @param {object} metaSource - Indicate what source to use to obtain meta data
 * @returns {array} - Stremio Catalog
 */
async function createRecCatalog(recs, mediaType, rpdbApiKey, metaSource) {
	if (!recs || recs.length === 0) {
	}

	let catalog = await Promise.all(
		recs
			.filter((row) => row != null)
			.map(async (rec, index) => {
				const meta = await createMeta(rec, mediaType, rpdbApiKey, metaSource);
				if (meta == null || Object.keys(meta).length === 0) {
					return null;
				}
				return { ...meta, ranking: index + 1 };
			}),
	);
	catalog = catalog.filter((row) => row != null);

	return catalog;
}

async function getCombinedRecCatalog(searchKey, searchYear, searchType, apiKeys, metaSource) {
	if (searchKey === "") {
		return [];
	}

	// Check cache for previously saved catalog associated with the search input and return if exist
	let cachedRecsCatalog = await checkCache(searchKey, searchYear, searchType, "combined");
	if (cachedRecsCatalog) {
		return cachedRecsCatalog;
	}

	// Get recs from all sources
	let tmdbRecs = (await getTMDBRecCatalog(searchKey, searchYear, searchType, apiKeys.tmdb, apiKeys.rpdb, metaSource)) || [];
	let traktRecs = (await getTraktRecCatalog(searchKey, searchYear, searchType, apiKeys.trakt, apiKeys.rpdb, metaSource)) || [];
	let geminiRecs = (await getGeminiRecCatalog(searchKey, searchYear, searchType, apiKeys.gemini, apiKeys.rpdb, metaSource)) || [];
	let tastediveRecs = (await getTastediveRecCatalog(searchKey, searchYear, searchType, apiKeys.tastedive, apiKeys.rpdb, metaSource)) || [];

	// Merge recs into one array
	const merged = [...tmdbRecs, ...traktRecs, ...tastediveRecs, ...geminiRecs];

	if (merged == []) {
		logger.emptyCatalog("Combined: Empty catalogy after merge", searchKey);
		return [];
	}

	// Count occurrences of each media ID and sum their ranking within the recommendations
	const countMap = merged.reduce((acc, media) => {
		if (!acc[media.id]) {
			acc[media.id] = { count: 0, rankingSum: 0 };
		}
		acc[media.id].count += 1;
		acc[media.id].rankingSum += media.ranking;
		return acc;
	}, {});

	// Sort movies first by frequency, then by ranking sum
	let sorted = merged.sort((a, b) => {
		// First, sort by frequency (higher count first)
		if (countMap[b.id].count !== countMap[a.id].count) {
			return countMap[b.id].count - countMap[a.id].count;
		}
		// If frequencies are the same, sort by the sum of rankings (lower ranking first)
		return countMap[a.id].rankingSum / countMap[a.id].count - countMap[b.id].rankingSum / countMap[b.id].count;
	});

	// Remove duplicates
	let catalog = [];
	const seenIds = new Set();

	for (const media of sorted) {
		if (!seenIds.has(media.id)) {
			catalog.push(media);
			seenIds.add(media.id);
		}
	}

	// Save to cache via search input
	await saveCache(searchKey, searchYear, searchType, "combined", catalog);

	// Save to cache via imdb id
	let searchedMediaImdbId = null;
	if (searchKey.startsWith("tt")) {
		searchedMediaImdbId = searchKey;
	} else {
		searchedMediaImdbId = await titleToImdb(title, year, searchType);
	}

	if (searchedMediaImdbId) {
		await saveCache(searchedMediaImdbId, null, searchType, "combined", catalog);
	}

	return catalog;
}

module.exports = {
	getCombinedRecCatalog,
	checkCache,
	saveCache,
	createRecCatalog,
};
