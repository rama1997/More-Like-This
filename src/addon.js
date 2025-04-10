const { parseSearchKey } = require("../utils/parser");
const { imdbToMeta, titleToImdb, IdToTitleYearType } = require("./convertMetadata");
const catalogManager = require("./catalogManager");
const recManager = require("./recManager");
const tmdb = require("../services/tmdb");
const logger = require("../utils/logger");

async function catalogHandler(type, id, extra, apiKeys, useTmdbMeta) {
	return new Promise(async (resolve, reject) => {
		const catalogSource = id.split("-")[1];

		if (!apiKeys[catalogSource].valid) {
			logger.emptyCatalog(`${catalogSource.toUpperCase()}: No valid API Key`, { type });
			return Promise.resolve([]);
		}

		const metaSource = { source: useTmdbMeta ? "tmdb" : "cinemeta", tmdbApiKey: apiKeys.tmdb };

		// Parse search input
		const searchParam = extra?.split("search=")[1];
		let parsedSearchParam = [];
		if (searchParam) {
			parsedSearchParam = await parseSearchKey(searchParam);
		} else {
			logger.emptyCatalog(`${catalogSource.toUpperCase()}: No search input`);
			return Promise.resolve([]); // Return empty catalog if no search input so addon does not show up on Discover or Home
		}

		const { searchKey = null, searchYear = null, searchType = null } = parsedSearchParam;

		// Return empty catalog if no real search key or if catalog type does not match search type
		if (!searchKey || (searchType && type !== searchType)) {
			logger.emptyCatalog(`${catalogSource.toUpperCase()}: Mismatch type`, { type, searchType });
			return Promise.resolve([]);
		}

		// Fetch detail if search input was Kitsu ID
		let kitsuMedia;
		if (searchKey.startsWith("kitsu")) {
			kitsuMedia = await IdToTitleYearType(searchKey, type, metaSource);
			// Return empty catalog for invalid kitsu id
			if (!kitsuMedia) {
				logger.emptyCatalog(`${catalogSource.toUpperCase()}: No Kitsu Data found`, { type, searchKey });
				return Promise.resolve([]);
			}
		}

		// Check cache for search input
		let cachedRecsCatalog = await catalogManager.checkCache(searchKey, searchYear, type, catalogSource);
		if (cachedRecsCatalog) {
			return Promise.resolve(cachedRecsCatalog).then((items) => {
				resolve({ metas: items });
			});
		}

		// Convert search input to IMDB id
		let searchImdb = null;
		if (searchKey.startsWith("tt")) {
			searchImdb = searchKey;
		} else if (searchKey.startsWith("kitsu")) {
			searchImdb = await titleToImdb(kitsuMedia.title, kitsuMedia.year, kitsuMedia.type);
		} else {
			searchImdb = await titleToImdb(searchKey, searchYear, type);
		}

		// If default method could not find IMDB Id, try searching API's search result as backup if API key provided
		if (!searchImdb && catalogSource === "tmdb") {
			const title = searchKey.startsWith("kitsu") ? kitsuMedia.title : searchKey;
			const year = searchKey.startsWith("kitsu") ? kitsuMedia.year : searchYear;
			const mediaTypeForTmdb = await tmdb.getAPIEndpoint(type);

			// Search TMDB's search results for a title + year and fetch the top result
			const searchResults = await tmdb.fetchSearchResult(title, year, mediaTypeForTmdb, apiKeys.tmdb.key);
			if (!searchResults || searchResults.length === 0) {
				return Promise.resolve([]);
			}
			const foundMedia = searchResults[0];

			// If the IMDB Id's media does not match catalog type, skip the catalog
			const mediaType = foundMedia.release_date ? "movie" : "series";
			if (mediaType !== type) {
				return Promise.resolve([]);
			}

			searchImdb = await tmdb.fetchImdbID(foundMedia.id, mediaTypeForTmdb, apiKeys.tmdb.key);
		}

		// Check cache for IMDB id
		if (searchImdb) {
			cachedRecsCatalog = await catalogManager.checkCache(searchImdb, null, type, catalogSource);
			if (cachedRecsCatalog) {
				await catalogManager.saveCache(searchKey, searchYear, type, catalogSource, cachedRecsCatalog); // Save cached catalog for searchinput as well
				return Promise.resolve(cachedRecsCatalog).then((items) => {
					resolve({ metas: items });
				});
			}
		} else {
			logger.info(`${catalogSource.toUpperCase()}: No imdb id found`, searchKey, searchYear, type);
		}

		// Identiy searched media title/year
		let title;
		let year;
		if (catalogSource === "tastedive" || catalogSource === "gemini")
			if (searchKey.startsWith("tt")) {
				const media = await IdToTitleYearType(searchKey, type, metaSource);
				if (!media) {
					logger.emptyCatalog(`${catalogSource.toUpperCase()}: No title/year found for IMDB Id`, { searchKey, type });
					return Promise.resolve([]);
				}
				title = media.title;
				year = media.year;
			} else if (searchKey.startsWith("kitsu")) {
				title = kitsuMedia.title;
				year = kitsuMedia.year;
			} else {
				title = searchKey;
				year = searchYear;
			}

		logger.info(`${catalogSource.toUpperCase()}: Searched Media`, { searchKey, title, year, type, searchImdb });

		let recs = [];
		if (type === "movie") {
			if (id === "mlt-combined-movie-rec") {
				//catalog = catalogManager.getCombinedRecCatalog(searchKey, searchYear, type, apiKeys, metaSource);
				recs = [];
			} else if (id === "mlt-tmdb-movie-rec") {
				recs = await recManager.getTmdbRecs(searchImdb, type, apiKeys.tmdb.key);
			} else if (id === "mlt-trakt-movie-rec") {
				recs = await recManager.getTraktRecs(searchImdb, type, apiKeys.trakt.key);
			} else if (id === "mlt-tastedive-movie-rec") {
				recs = await recManager.getTastediveRecs(title, year, type, apiKeys.tastedive.key);
			} else if (id === "mlt-gemini-movie-rec") {
				recs = await recManager.getGeminiRecs(title, year, type, apiKeys.gemini.key);
			} else {
				recs = [];
			}
		} else if (type === "series") {
			if (id === "mlt-combined-series-rec") {
				//catalog = catalogManager.getCombinedRecCatalog(searchKey, searchYear, type, apiKeys, metaSource);
				recs = [];
			} else if (id == "mlt-tmdb-series-rec") {
				recs = await recManager.getTmdbRecs(searchImdb, type, apiKeys.tmdb.key);
			} else if (id === "mlt-trakt-series-rec") {
				recs = await recManager.getTraktRecs(searchImdb, type, apiKeys.trakt.key);
			} else if (id === "mlt-tastedive-series-rec") {
				recs = await recManager.getTastediveRecs(title, year, type, apiKeys.tastedive.key);
			} else if (id === "mlt-gemini-series-rec") {
				recs = await recManager.getGeminiRecs(title, year, type, apiKeys.gemini.key);
			} else {
				recs = [];
			}
		} else {
			recs = [];
		}

		let catalog = [];
		if (!recs || recs.length === 0) {
			logger.emptyCatalog(`${catalogSource.toUpperCase()}: No recs found`, searchKey, type);
			return Promise.resolve([]);
		} else {
			console.log("got recs for ", catalogSource, type);
			logger.info(`${catalogSource.toUpperCase()}: Got recs`, { searchKey, title, year, type, searchImdb });
			catalog = await catalogManager.createRecCatalog(recs, type, apiKeys.rpdb, metaSource);

			if (!catalog) {
				logger.emptyCatalog(`${catalogSource.toUpperCase()}: Catalog Creation Error`, searchKey, type);
				return Promise.resolve([]);
			}

			// Save to cache
			await catalogManager.saveCache(searchKey, searchYear, type, catalogSource, catalog);
			if (searchImdb && searchKey !== searchImdb) {
				await catalogManager.saveCache(searchImdb, null, type, catalogSource, catalog);
			}

			Promise.resolve(catalog).then((items) => {
				resolve({ metas: items });
			});
		}

		return Promise.resolve([]);
	});
}

async function streamHandler(type, id) {
	let searchKey;

	// Parsing IMDB Id and Kitsu Ids
	if (id.startsWith("tt")) {
		searchKey = id.split(":")[0];
	} else if (id.startsWith("kitsu")) {
		searchKey = id.split(":").slice(0, 2).join(":");
	}

	const stream = {
		title: `Search for similar ${type}s`,
		externalUrl: `stremio://search?search=${searchKey}`,
	};

	return Promise.resolve({ streams: [stream] });
}

module.exports = {
	catalogHandler,
	streamHandler,
};
