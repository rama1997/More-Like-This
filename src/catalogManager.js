const tmdb = require("./tmdb");
const trakt = require("./trakt");
const gemini = require("./gemini");
const rpdb = require("./rpdb");
const tastedive = require("./tastedive");
const kitsu = require("./kitsu");
const fetch = require("node-fetch");
const cache = require("../utils/cache");
const logger = require("../utils/logger");

async function validateAPIKeys() {
	const validGeminiKey = await gemini.validateAPIKey();
	const validTastediveKey = await tastedive.validateAPIKey();
	const validTMDBKey = await tmdb.validateAPIKey();
	const validTraktKey = await trakt.validateAPIKey();
	const validRPDBKey = await rpdb.validateAPIKey();

	logger.info("GEMINI API KEY: " + (validGeminiKey ? "valid" : "invalid"));
	logger.info("TASTEDIVE API KEY: " + (validTastediveKey ? "valid" : "invalid"));
	logger.info("TMDB API KEY: " + (validTMDBKey ? "valid" : "invalid"));
	logger.info("TRAKT API KEY: " + (validTraktKey ? "valid" : "invalid"));
	logger.info("RPDB API KEY: " + (validRPDBKey ? "valid" : "invalid"));
}

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

async function createMeta(imdbId, type) {
	try {
		const mediaType = type === "movie" ? "movie" : "series";
		const url = `https://v3-cinemeta.strem.io/meta/${mediaType}/${imdbId}.json`;

		const response = await fetch(url);
		const json = await response.json();

		let meta = {};
		if (json && json.meta) {
			const media = json.meta;

			// Will not create a meta/add to catalog for any media that is not released yet
			if (media?.status === "Upcoming") {
				return null;
			}

			let poster = "";
			if (await rpdb.isValidKey()) {
				poster = await rpdb.getRPDBPoster(imdbId);
			}
			// If RPDB is not used or fails to provide a poster, then use default Cinemeta poster
			if (poster === "") {
				poster = media.poster_path ? media.poster : "";
			}

			meta = {
				id: media.imdb_id,
				name: media.title || media.name,
				poster: poster,
				backdrop: media.background,
				type: mediaType,
				year: media.releaseInfo,
				genres: media.genres,
			};
		}

		return meta;
	} catch (error) {
		return null;
	}
}

async function getTMDBRecCatalog(searchKey, searchYear, searchType) {
	console.log("tmdb catalog");
	console.log(searchKey);
	if ((await tmdb.isValidKey()) === false || searchKey === "") {
		return [];
	}
	console.log("valid key");

	// Check cache for previously saved catalog associated with the search input and return if exist
	let cachedRecsCatalog = await checkCache(searchKey, searchYear, searchType, "tmdb");
	if (cachedRecsCatalog) {
		return cachedRecsCatalog;
	}

	// Get specific terminlogy for movie/series for API endpoints
	const mediaTypeForAPI = await tmdb.getAPIEndpoint(searchType);

	let title = "";
	let year = "";
	// Get searched media's metadata
	let foundMedia = {};
	if (searchKey.startsWith("tt")) {
		// If an IMDB Id is searched, TMDB can obtain metadata from that Id
		const idMetaData = await tmdb.fetchMediaDetails(searchKey, mediaTypeForAPI);
		if (!idMetaData || idMetaData.length === 0) {
			logger.emptyCatalog("TMDB: No metadata found for IMDB Id", searchKey);
			return [];
		}
		foundMedia = searchType === "movie" ? idMetaData.movie_results[0] : idMetaData.tv_results[0];
		if (!foundMedia) {
			logger.emptyCatalog(`TMDB: No ${searchType} found for IMDB Id`, searchKey);
			return [];
		}

		// If the IMDB Id's media does not match catalog type, skip this catalog
		const mediaType = foundMedia.media_type === "movie" ? "movie" : "series";
		if (mediaType !== mediaType) {
			return [];
		}
	} else {
		// Otherwise, we have to manually search on TMDB to get metadata.
		// If an Kitsu Id was searched, retrieve title and year associated with that Id so we can search on TMDB
		if (searchKey.startsWith("kitsu")) {
			const kitsuMedia = await kitsu.convertKitsuId(searchKey);
			if (kitsuMedia || Object.keys(kitsuMedia).length !== 0) {
				title = kitsuMedia.title;
				year = kitsuMedia.year;
				const kitsuType = kitsuMedia.type;

				// If the Kitsu Id's media does not match catalog type, skip this catalog
				if (kitsuType != searchType) {
					return [];
				}
			} else {
				logger.emptyCatalog(`TMDB: No metadata found for Kitsu Id`, searchKey);
				return [];
			}
		} else {
			// If a normal title/year was searched, then we will use those
			title = searchKey;
			year = searchYear;
		}

		// Search TMDB's search results for a title + year and fetch the top result
		const searchResults = await tmdb.fetchSearchResult(title, year, mediaTypeForAPI);
		if (!searchResults || searchResults.length === 0) {
			logger.emptyCatalog(`TMDB: No search result found`, { searchKey, searchType });
			return [];
		}
		foundMedia = searchResults[0];
	}
	foundMedia.imdbId = await tmdb.fetchImdbID(foundMedia.id, mediaTypeForAPI);
	logger.info("TMDB: Searched Media", searchType === "movie" ? { title: foundMedia.title, year: foundMedia.release_date, searchType } : { title: foundMedia.name, year: foundMedia.first_air_date, searchType });

	// Check cache for previously saved catalog associated with the associated IMDB Id and return if exist
	cachedRecsCatalog = await checkCache(foundMedia.imdbId, null, searchType, "tmdb");
	if (cachedRecsCatalog) {
		await saveCache(searchKey, year, searchType, "tmdb", cachedRecsCatalog); // Save cached catalog for search input as well
		return cachedRecsCatalog;
	}

	// If none found in cache, get recs of the found media from TMDB API
	const recs = (await tmdb.fetchRecommendations(foundMedia.id, mediaTypeForAPI)).filter((row) => row !== undefined);
	if (!recs || recs.length === 0) {
		logger.emptyCatalog(`TMDB: No recs found`, searchKey);
		return [];
	}

	// Get IMDB Id for all recs
	const recsImdbId = await Promise.all(
		recs.map(async (rec) => {
			return await tmdb.fetchImdbID(rec.id, mediaTypeForAPI);
		}),
	);

	// Create catalog from recs
	let catalog = await Promise.all(
		recsImdbId
			.filter((row) => row != null)
			.map(async (rec, index) => {
				const meta = await createMeta(rec, searchType);
				if (meta != null) {
					return { ...meta, ranking: index + 1 };
				}
				return null;
			}),
	);
	catalog = catalog.filter((row) => row != null);

	// Save to cache
	await saveCache(searchKey, searchYear, searchType, "tmdb", catalog);
	await saveCache(foundMedia.imdbId, null, searchType, "tmdb", catalog);

	return catalog;
}

async function getTraktRecCatalog(searchKey, searchYear, searchType) {
	if ((await trakt.isValidKey()) === false || searchKey === "") {
		return [];
	}

	// Check cache for previously saved catalog associated with the search input and return if exist
	let cachedRecsCatalog = await checkCache(searchKey, searchYear, searchType, "trakt");
	if (cachedRecsCatalog) {
		return cachedRecsCatalog;
	}

	// Get specific Trakt terminlogy for movie/series for API endpoints
	const mediaTypeForAPI = await trakt.getAPIEndpoint(searchType);

	let title = "";
	// Get searched media's metadata
	let foundMedia = {};
	if (searchKey.startsWith("tt")) {
		// If an IMDB Id was searched, Trakt can obtain metadata from that Id
		foundMedia = await trakt.fetchMediaDetails(searchKey, mediaTypeForAPI);
		if (!foundMedia || foundMedia.length === 0) {
			logger.emptyCatalog("Trakt: No metadata found for IMDB Id", searchKey);
			return [];
		}

		// If the IMDB Id's media does not match catalog type, skip the catalog
		const mediaType = foundMedia.released ? "movie" : "series";
		if (mediaType !== mediaType) {
			return [];
		}
	} else {
		// Otherwise, we have to manually search on Trakt to get metadata
		// If an Kitsu Id was searched, retrieve title associated with that Id so we can search on TMDB
		if (searchKey.startsWith("kitsu")) {
			const kitsuMedia = await kitsu.convertKitsuId(searchKey);
			if (kitsuMedia || Object.keys(kitsuMedia).length !== 0) {
				title = kitsuMedia.title;
				const kitsuType = kitsuMedia.type;

				// If the Kitsu Id's media does not match catalog type, skip this catalog
				if (kitsuType != searchType) {
					return [];
				}
			} else {
				logger.emptyCatalog("Trakt: No metadata found for Kitsu Id", searchKey);
				return [];
			}
		} else {
			// If a normal title was searched, then we will use those
			title = searchKey;
		}

		// Search Trakt's search results for a title and fetch the top result
		const searchResults = await trakt.fetchSearchResult(title, mediaTypeForAPI);
		if (!searchResults || searchResults.length === 0) {
			logger.emptyCatalog("Trakt: No search result found", { searchKey, searchType });
			return [];
		}
		foundMedia = searchResults[0][mediaTypeForAPI];
	}
	foundMedia.imdbId = foundMedia.ids.imdb;
	logger.info("Trakt: Searched Media", { title: foundMedia.title, year: foundMedia.year, searchType });

	// Check cache for previously saved catalog associated with the associated IMDB Id and return if exist
	cachedRecsCatalog = await checkCache(foundMedia.imdbId, null, searchType, "trakt");
	if (cachedRecsCatalog) {
		await saveCache(searchKey, searchYear, searchType, "trakt", cachedRecsCatalog); // Save cached catalog for searchinput as well
		return cachedRecsCatalog;
	}

	// Get recs based on the found media
	const recs = (await trakt.fetchRecommendations(foundMedia.imdbId, mediaTypeForAPI)).filter((row) => row !== undefined);
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

	// Create catalog from recs
	let catalog = await Promise.all(
		recsImdbId
			.filter((row) => row != null)
			.map(async (rec, index) => {
				const meta = await createMeta(rec, searchType);
				if (meta != null) {
					return { ...meta, ranking: index + 1 };
				}
				return null;
			}),
	);
	catalog = catalog.filter((row) => row != null);

	// Save to cache
	await saveCache(searchKey, searchYear, searchType, "trakt", catalog);
	await saveCache(foundMedia.imdbId, null, searchType, "trakt", catalog);

	return catalog;
}

async function getTastediveRecCatalog(searchKey, searchYear, searchType) {
	if ((await tastedive.isValidKey()) === false || searchKey === "") {
		return [];
	}

	// Check cache for previously saved catalog
	let cachedRecsCatalog = await checkCache(searchKey, searchYear, searchType, "tastedive");
	if (cachedRecsCatalog) {
		return cachedRecsCatalog;
	}

	// Get specific terminlogy for movie/series for API endpoints
	const mediaTypeForTasteDiveAPI = await tastedive.getAPIEndpoint(searchType);
	const mediaTypeForTmdbAPI = await tmdb.getAPIEndpoint(searchType);

	let title = "";
	let year = "";
	if (searchKey.startsWith("tt")) {
		// Tastedive API does not take a Imdb id input
		// If an IMDB Id was searched, then use TMDB's API to get metadata
		const idDetails = await tmdb.fetchMediaDetails(searchKey, mediaTypeForTmdbAPI);
		if (!idDetails || idDetails.length === 0) {
			logger.emptyCatalog("Tastedive: No metadata found for IMDB Id", searchKey);
			return [];
		}
		const foundMedia = searchType === "movie" ? idDetails.movie_results[0] : idDetails.tv_results[0];
		if (!foundMedia) {
			logger.emptyCatalog(`Tastedive: No ${searchType} found for IMDB Id`, searchKey);
			return [];
		}

		// If the IMDB Id's media does not match catalog type, skip the catalog
		const mediaType = foundMedia.media_type === "movie" ? "movie" : "series";
		if (mediaType !== searchType) {
			return [];
		}

		title = mediaType === "movie" ? foundMedia.title : foundMedia.name;
		year = mediaType === "movie" ? foundMedia.release_date.split("-")[0] : foundMedia.first_air_date.split("-")[0];
	} else {
		// Otherwise, we have to manually search on Tastedive to get metadata.
		// If an Kitsu Id was searched, retrieve title and year associated with that Id to search on Tastedive
		if (searchKey.startsWith("kitsu")) {
			const kitsuMedia = await kitsu.convertKitsuId(searchKey);
			if (kitsuMedia || Object.keys(kitsuMedia).length !== 0) {
				title = kitsuMedia.title;
				year = kitsuMedia.year;
				const kitsuType = kitsuMedia.type;

				// If the Kitsu Id's media does not match catalog type, skip this catalog
				if (kitsuType != searchType) {
					return [];
				}
			} else {
				logger.emptyCatalog("Tastdive: No metadata found for Kitsu Id", searchKey);
				return [];
			}
		} else {
			// If a normal title/year was searched, then we will use those
			title = searchKey;
			year = searchYear;
		}
	}

	logger.info("Tastedive: Searched Media", { title, year, searchType });

	// Before getting recs, check cache for previously saved catalog associated with the IMDB Id
	// Convert to Imdb Id if search input was not an Imdb Id using TMDB API
	let searchedMediaImdbId = "";
	if (searchKey.startsWith("tt")) {
		searchedMediaImdbId = searchKey;
	} else {
		const searchResults = await tmdb.fetchSearchResult(title, year, mediaTypeForTmdbAPI);
		if (searchResults && searchResults.length !== 0) {
			const foundMedia = searchResults[0];
			searchedMediaImdbId = await tmdb.fetchImdbID(foundMedia.id, mediaTypeForTmdbAPI);
		}
	}

	// Check cache
	cachedRecsCatalog = await checkCache(searchedMediaImdbId, null, searchType, "tastedive");
	if (cachedRecsCatalog) {
		await saveCache(searchKey, searchYear, searchType, "tastedive", cachedRecsCatalog); // Save cached catalog for searchinput as well
		return cachedRecsCatalog;
	}

	// Get recs from Tastedive. Only contains title of each recommendation
	const recTitles = await tastedive.fetchRecs(title, year, mediaTypeForTasteDiveAPI);
	if (!recTitles || recTitles.length === 0) {
		logger.emptyCatalog("Tastdive: No recs found", searchKey);
		return [];
	}

	// Need to search each rec in TMDB to get details
	let recs = await Promise.all(
		recTitles.map(async (rec) => {
			// Search TMDB for recs
			const searchResults = await tmdb.fetchSearchResult(rec.name, "", mediaTypeForTmdbAPI);
			if (!searchResults || searchResults.length === 0) {
				return;
			}
			const foundMedia = searchResults[0];

			return await tmdb.fetchImdbID(foundMedia.id, mediaTypeForTmdbAPI);
		}),
	);

	// Create catalog from recs
	let catalog = await Promise.all(
		recs
			.filter((row) => row != null)
			.map(async (rec, index) => {
				const meta = await createMeta(rec, searchType);
				if (meta != null) {
					return { ...meta, ranking: index + 1 };
				}
				return null;
			}),
	);
	catalog = catalog.filter((row) => row != null);

	// Save to cache
	await saveCache(searchKey, searchYear, searchType, "tastedive", catalog);
	if (searchedMediaImdbId != null) {
		await saveCache(searchedMediaImdbId, null, searchType, "tastedive", catalog);
	}

	return catalog;
}

async function getGeminiRecCatalog(searchKey, searchYear, searchType) {
	if ((await gemini.isValidKey()) === false || (await tmdb.isValidKey()) === false || searchKey === "") {
		return [];
	}

	// Check cache for previously saved catalog
	let cachedRecsCatalog = await checkCache(searchKey, searchYear, searchType, "gemini");
	if (cachedRecsCatalog) {
		return cachedRecsCatalog;
	}

	// Gemini uses TMDB API to get metadata. Get specific TMDB terminlogy for movie/series for API endpoints
	const mediaTypeForAPI = await tmdb.getAPIEndpoint(searchType);

	// Get searched media's title and year for Gemini prompt
	let title = "";
	let year = "";
	if (searchKey.startsWith("tt")) {
		// If an IMDB Id was searched, then call TMDB's API to retreive metadata associated with that Id
		// Gemini is inaccurate in determining what media is associated with what IMDB Id.
		const idDetails = await tmdb.fetchMediaDetails(searchKey, mediaTypeForAPI);
		if (!idDetails || idDetails.length === 0) {
			logger.emptyCatalog("Gemini: No metadata found for IMDB Id", searchKey);
			return [];
		}
		const foundMedia = searchType === "movie" ? idDetails.movie_results[0] : idDetails.tv_results[0];
		if (!foundMedia) {
			logger.emptyCatalog(`Gemini: No ${searchType} found for IMDB Id`, searchKey);
			return [];
		}

		// If the IMDB Id's media does not match catalog type, skip the catalog
		const mediaType = foundMedia.media_type === "movie" ? "movie" : "series";
		if (mediaType !== searchType) {
			return [];
		}

		title = mediaType === "movie" ? foundMedia.title : foundMedia.name;
		year = mediaType === "movie" ? foundMedia.release_date.split("-")[0] : foundMedia.first_air_date.split("-")[0];
	} else if (searchKey.startsWith("kitsu")) {
		// If an Kitsu Id was searched, call Kitsu API to retrieve metadata associated with that Id
		const kitsuMedia = await kitsu.convertKitsuId(searchKey);
		if (kitsuMedia || Object.keys(kitsuMedia).length !== 0) {
			title = kitsuMedia.title;
			year = kitsuMedia.year;
			const kitsuType = kitsuMedia.type;

			// If the Kitsu Id's media does not match catalog type, skip this catalog
			if (kitsuType != searchType) {
				return [];
			}
		} else {
			logger.emptyCatalog("Gemini: No metadata found for Kitsu Id", searchKey);
			return [];
		}
	} else {
		// If a normal title/year was searched, then we will just use those
		title = searchKey;
		year = searchYear;
	}

	logger.info("Gemini: Searched Media", { title, year, searchType });

	// Before asking Gemini for recs, check cache for previously saved catalog associated with the IMDB Id
	// Convert to Imdb Id if search input was not an Imdb Id using TMDB API
	let searchedMediaImdbId = "";
	if (searchKey.startsWith("tt")) {
		searchedMediaImdbId = searchKey;
	} else {
		const searchResults = await tmdb.fetchSearchResult(title, year, mediaTypeForAPI);
		if (searchResults && searchResults.length !== 0) {
			const foundMedia = searchResults[0];
			searchedMediaImdbId = await tmdb.fetchImdbID(foundMedia.id, mediaTypeForAPI);
		}
	}

	// Check cache
	cachedRecsCatalog = await checkCache(searchedMediaImdbId, null, searchType, "gemini");
	if (cachedRecsCatalog) {
		await saveCache(searchKey, searchYear, searchType, "gemini", cachedRecsCatalog); // Save cached catalog for searchinput as well
		return cachedRecsCatalog;
	}

	// Get recs from Gemini - Gemini can only return rec's title and year as a string
	const recTitles = await gemini.getGeminiRecs(title, year, mediaTypeForAPI);
	if (!recTitles || recTitles.length === 0) {
		logger.emptyCatalog("Gemini: No recs found", searchKey);
		return [];
	}

	// Need to search each rec in TMDB to get details
	let recs = await Promise.all(
		recTitles
			.filter((row) => row[0] !== "") // Remove blank rows
			.map(async (rec) => {
				const { title: recTitle, year: recYear } = rec;

				// Search TMDB for recs
				const searchResults = await tmdb.fetchSearchResult(recTitle, recYear, mediaTypeForAPI);
				if (!searchResults || searchResults.length === 0) {
					return;
				}
				const foundMedia = searchResults[0];

				return await tmdb.fetchImdbID(foundMedia.id, mediaTypeForAPI);
			}),
	);

	if (!recs || Object.keys(recs).length === 0) {
		return [];
	}

	// Create catalog from recs
	let catalog = await Promise.all(
		recs
			.filter((row) => row != null)
			.map(async (rec, index) => {
				const meta = await createMeta(rec, searchType);
				if (meta != null) {
					return { ...meta, ranking: index + 1 };
				}
				return null;
			}),
	);
	catalog = catalog.filter((row) => row != null);

	// Save to cache
	await saveCache(searchKey, searchYear, searchType, "gemini", catalog);
	if (searchedMediaImdbId !== "") {
		await saveCache(searchedMediaImdbId, null, searchType, "gemini", catalog);
	}

	return catalog;
}

async function getCombinedRecCatalog(searchKey, searchYear, searchType) {
	if (searchKey === "") {
		return [];
	}

	// Check cache for previously saved catalog associated with the search input and return if exist
	let cachedRecsCatalog = await checkCache(searchKey, searchYear, searchType, "combined");
	if (cachedRecsCatalog) {
		return cachedRecsCatalog;
	}

	// Get specific TMDB terminlogy for movie/series for API endpoints
	const mediaTypeForAPI = await tmdb.getAPIEndpoint(searchType);

	// Get recs from all sources
	let tmdbRecs = (await getTMDBRecCatalog(searchKey, searchYear, searchType)) || [];
	let traktRecs = (await getTraktRecCatalog(searchKey, searchYear, searchType)) || [];
	let geminiRecs = (await getGeminiRecCatalog(searchKey, searchYear, searchType)) || [];
	let tastediveRecs = (await getTastediveRecCatalog(searchKey, searchYear, searchType)) || [];

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

	// Save to cache via imdb id, but need to get first
	let searchedMediaId;
	if (searchKey.startsWith("tt")) {
		searchedMediaId = searchKey;
		await saveCache(searchedMediaId, null, searchType, "combined", catalog);
	} else {
		const searchResults = await tmdb.fetchSearchResult(searchKey, searchYear, mediaTypeForAPI);
		if (searchResults && searchResults.length > 0) {
			const foundMedia = searchResults[0];
			searchedMediaId = await tmdb.fetchImdbID(foundMedia.id, mediaTypeForAPI);
		}
	}

	if (searchedMediaId != null) {
		await saveCache(searchedMediaId, null, searchType, "combined", catalog);
	}

	return catalog;
}

module.exports = {
	getTMDBRecCatalog,
	getTraktRecCatalog,
	getGeminiRecCatalog,
	getTastediveRecCatalog,
	getCombinedRecCatalog,
	validateAPIKeys,
};
