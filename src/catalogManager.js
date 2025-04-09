const tmdb = require("../services/tmdb");
const trakt = require("../services/trakt");
const gemini = require("../services/gemini");
const rpdb = require("../services/rpdb");
const tastedive = require("../services/tastedive");
const cache = require("../utils/cache");
const logger = require("../utils/logger");
const { imdbToMeta, titleToImdb, IdToTitleYearType } = require("./convertMetadata");
const recManager = require("./recManager");

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

async function getTraktRecCatalog(searchKey, searchYear, searchType, traktApiKey, rpdbApiKey, metaSource) {
	const apiKey = traktApiKey.key;
	const validKey = traktApiKey.valid;
	if (!validKey || searchKey === "") {
		return [];
	}

	// Check cache for previously saved catalog associated with the search input and return if exist
	let cachedRecsCatalog = await checkCache(searchKey, searchYear, searchType, "trakt");
	if (cachedRecsCatalog) {
		return cachedRecsCatalog;
	}

	// Get specific Trakt terminlogy for movie/series for API endpoints
	const mediaTypeForAPI = await trakt.getAPIEndpoint(searchType);

	// Get searched media's title and year for search
	const { title, year, type } = searchKey.startsWith("tt") || searchKey.startsWith("kitsu") ? await IdToTitleYearType(searchKey, searchType, metaSource) : { title: searchKey, year: searchYear, type: searchType };

	if (type !== searchType) {
		return [];
	}

	// Get Imdb Id for search
	let searchedMediaImdbId = searchKey.startsWith("tt") ? searchKey : await titleToImdb(title, year, searchType);

	// If Imdb ID can't be found from title/year, search search result as a backup
	if (!searchedMediaImdbId) {
		// Search Trakt's search results for a title and fetch the top result
		const searchResults = await trakt.fetchSearchResult(title, mediaTypeForAPI, apiKey);
		if (!searchResults || searchResults.length === 0) {
			logger.emptyCatalog("Trakt: No search result found", { searchKey, searchType });
			return [];
		}
		foundMedia = searchResults[0][mediaTypeForAPI];

		// If the IMDB Id's media does not match catalog type, skip the catalog
		const mediaType = foundMedia.released ? "movie" : "series";

		if (mediaType !== searchType) {
			return [];
		}

		searchedMediaImdbId = foundMedia.ids.imdb;
	}

	logger.info("Trakt: Searched Media", { title, year, searchType, searchedMediaImdbId });

	// Check cache for previously saved catalog associated with the associated IMDB Id and return if exist
	cachedRecsCatalog = await checkCache(searchedMediaImdbId, null, searchType, "trakt");
	if (cachedRecsCatalog) {
		await saveCache(searchKey, searchYear, searchType, "trakt", cachedRecsCatalog); // Save cached catalog for searchinput as well
		return cachedRecsCatalog;
	}

	// Get recs based on the found media
	const recs = (await trakt.fetchRecommendations(searchedMediaImdbId, mediaTypeForAPI, apiKey)).filter((row) => row !== undefined);
	if (!recs || recs.length === 0) {
		logger.emptyCatalog(`Trakt: No recs found`, searchKey);
		return [];
	}

	// Get IMDB Id for all recs
	const recsImdbId = await Promise.all(
		recs.map(async (rec) => {
			return rec.ids.imdb;
		}),
	);

	const catalog = await createRecCatalog(recsImdbId, searchType, rpdbApiKey, metaSource);

	// Save to cache
	await saveCache(searchKey, searchYear, searchType, "trakt", catalog);
	if (searchedMediaImdbId != null) {
		await saveCache(searchedMediaImdbId, null, searchType, "trakt", catalog);
	}

	return catalog;
}

async function getTastediveRecCatalog(searchKey, searchYear, searchType, tastediveApiKey, rpdbApiKey, metaSource) {
	const apiKey = tastediveApiKey.key;
	const validKey = tastediveApiKey.valid;
	if (!validKey || searchKey === "") {
		return [];
	}

	// Check cache for previously saved catalog for the search input
	let cachedRecsCatalog = await checkCache(searchKey, searchYear, searchType, "tastedive");
	if (cachedRecsCatalog) {
		return cachedRecsCatalog;
	}

	// Get specific terminlogy for movie/series for API endpoints
	const mediaTypeForAPI = await tastedive.getAPIEndpoint(searchType);

	// Get searched media's title and year for search
	const { title, year, type } = searchKey.startsWith("tt") || searchKey.startsWith("kitsu") ? await IdToTitleYearType(searchKey, searchType, metaSource) : { title: searchKey, year: searchYear, type: searchType };

	if (type !== searchType) {
		return [];
	}

	logger.info("Tastedive: Searched Media", { title, year, searchType });

	// Before getting recs, perform another cache check, but with the IMDB Id of the search media
	let searchedMediaImdbId = null;
	if (searchKey.startsWith("tt")) {
		searchedMediaImdbId = searchKey;
	} else {
		searchedMediaImdbId = await titleToImdb(title, year, searchType);
	}

	if (searchedMediaImdbId) {
		cachedRecsCatalog = await checkCache(searchedMediaImdbId, null, searchType, "tastedive");
		if (cachedRecsCatalog) {
			await saveCache(searchKey, searchYear, searchType, "tastedive", cachedRecsCatalog); // Save cached catalog for searchinput as well
			return cachedRecsCatalog;
		}
	}

	// Get recs titles from Tastedive
	const recTitles = await tastedive.fetchRecs(title, year, mediaTypeForAPI, apiKey);
	if (!recTitles || recTitles.length === 0) {
		logger.emptyCatalog("Tastdive: No recs found", searchKey);
		return [];
	}

	// Get IMDB Ids for all the rec titles
	let recs = await Promise.all(
		recTitles.map(async (rec) => {
			return await titleToImdb(rec.name, "", searchType);
		}),
	);

	const catalog = await createRecCatalog(recs, searchType, rpdbApiKey, metaSource);

	// Save to cache
	await saveCache(searchKey, searchYear, searchType, "tastedive", catalog);
	if (searchedMediaImdbId != null) {
		await saveCache(searchedMediaImdbId, null, searchType, "tastedive", catalog);
	}

	return catalog;
}

async function getGeminiRecCatalog(searchKey, searchYear, searchType, geminiApiKey, rpdbApiKey, metaSource) {
	const apiKey = geminiApiKey.key;
	const validKey = geminiApiKey.valid;
	if (!validKey || searchKey === "") {
		return [];
	}

	// Check cache for previously saved catalog
	let cachedRecsCatalog = await checkCache(searchKey, searchYear, searchType, "gemini");
	if (cachedRecsCatalog) {
		return cachedRecsCatalog;
	}

	// Get searched media's title and year for search
	const { title, year, type } = searchKey.startsWith("tt") || searchKey.startsWith("kitsu") ? await IdToTitleYearType(searchKey, searchType, metaSource) : { title: searchKey, year: searchYear, type: searchType };

	if (type !== searchType) {
		return [];
	}

	logger.info("Gemini: Searched Media", { title, year, type });

	// Before getting recs, perform another cache check, but with the IMDB Id of the search media
	let searchedMediaImdbId = "";
	if (searchKey.startsWith("tt")) {
		searchedMediaImdbId = searchKey;
	} else {
		searchedMediaImdbId = await titleToImdb(title, year, searchType);
	}

	if (searchedMediaImdbId) {
		cachedRecsCatalog = await checkCache(searchedMediaImdbId, null, searchType, "gemini");
		if (cachedRecsCatalog) {
			await saveCache(searchKey, searchYear, searchType, "gemini", cachedRecsCatalog); // Save cached catalog for searchinput as well
			return cachedRecsCatalog;
		}
	}

	// Get recs from Gemini - Gemini returns rec's title and year as a string
	const recTitles = await gemini.getGeminiRecs(title, year, searchType, apiKey);
	if (!recTitles || recTitles.length === 0) {
		logger.emptyCatalog("Gemini: No recs found", searchKey);
		return [];
	}

	// Get IMDB Ids for all the rec titles
	let recs = await Promise.all(
		recTitles
			.filter((row) => row[0] !== "") // Remove blank rows
			.map(async (rec) => {
				return await titleToImdb(rec.title, rec.year, searchType);
			}),
	);

	if (!recs || Object.keys(recs).length === 0) {
		logger.emptyCatalog("Gemini: Recs conversion failed", searchKey);
		return [];
	}

	const catalog = await createRecCatalog(recs, searchType, rpdbApiKey, metaSource);

	// Save to cache
	await saveCache(searchKey, searchYear, searchType, "gemini", catalog);
	if (searchedMediaImdbId !== "") {
		await saveCache(searchedMediaImdbId, null, searchType, "gemini", catalog);
	}

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
	getTraktRecCatalog,
	getGeminiRecCatalog,
	getTastediveRecCatalog,
	getCombinedRecCatalog,
	checkCache,
	saveCache,
	createRecCatalog,
};
