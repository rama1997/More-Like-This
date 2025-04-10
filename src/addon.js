const { parseSearchKey } = require("../utils/parser");
const { imdbToMeta, titleToImdb, IdToTitleYearType } = require("./convertMetadata");
const catalogManager = require("./catalogManager");
const recManager = require("./recManager");
const tmdb = require("../services/tmdb");
const logger = require("../utils/logger");

async function catalogHandler(type, id, extra, apiKeys, useTmdbMeta) {
	return new Promise(async (resolve, reject) => {
		const catalogSource = id.split("-")[1];
		const metaSource = { source: useTmdbMeta ? "tmdb" : "cinemeta", tmdbApiKey: apiKeys.tmdb };

		// Parse search input
		const searchParam = extra?.split("search=")[1];
		let parsedSearchParam = [];
		if (searchParam) {
			parsedSearchParam = await parseSearchKey(searchParam);
		} else {
			return Promise.resolve([]); // Return empty catalog if no search input so addon does not show up on Discover or Home
		}

		const { searchKey = "", searchYear = "", searchType = "" } = parsedSearchParam;

		// Return empty catalog if no real search key or if catalog type does not match search type
		if (searchKey === "" || (searchType !== "" && type !== searchType)) {
			return Promise.resolve([]);
		}

		// Fetch detail if search input was Kitsu ID
		let kitsuMedia;
		if (searchKey.startsWith("kitsu")) {
			kitsuMedia = await IdToTitleYearType(searchKey, type, metaSource);
			// Return empty catalog if kitsu type does not match search type
			if ((searchType !== "" && kitsuMedia.type !== searchType) || kitsuMedia.type !== type) {
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
		if (!searchImdb && apiKeys.tmdb.valid) {
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
				console.log("found");
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
		let mediaType;
		if (searchKey.startsWith("tt")) {
			({ title, year, mediaType } = await IdToTitleYearType(searchKey, type, metaSource));
			if ((searchType !== "" && mediaType !== searchType) || mediaType != type) {
				return Promise.resolve([]);
			}
		} else if (searchKey.startsWith("kitsu")) {
			title = kitsuMedia.title;
			year = kitsuMedia.year;
		} else {
			title = searchKey;
			year = searchYear;
		}

		logger.info(`${catalogSource.toUpperCase()}: Searched Media`, { title, year, type, searchImdb });

		let catalog = [];
		let recs = [];
		if (type === "movie") {
			if (id === "mlt-combined-movie-rec") {
				catalog = catalogManager.getCombinedRecCatalog(searchKey, searchYear, type, apiKeys, metaSource);
			} else if (id === "mlt-tmdb-movie-rec") {
				recs = await recManager.getTmdbRecs(searchImdb, type, apiKeys.tmdb);
			} else if (id === "mlt-trakt-movie-rec") {
				recs = await recManager.getTraktRecs(searchImdb, type, apiKeys.trakt);
			} else if (id === "mlt-tastedive-movie-rec") {
				recs = await recManager.getTastediveRecs(title, year, type, apiKeys.tastedive);
			} else if (id === "mlt-gemini-ai-movie-rec") {
				recs = await recManager.getGeminiRecs(title, year, type, apiKeys.gemini);
			} else {
				catalog = [];
			}
		} else if (type === "series") {
			if (id === "mlt-combined-series-rec") {
				catalog = catalogManager.getCombinedRecCatalog(searchKey, searchYear, type, apiKeys, metaSource);
			} else if (id == "mlt-tmdb-series-rec") {
				recs = await recManager.getTmdbRecs(searchImdb, type, apiKeys.tmdb);
			} else if (id === "mlt-trakt-series-rec") {
				recs = await recManager.getTraktRecs(searchImdb, type, apiKeys.trakt);
			} else if (id === "mlt-tastedive-series-rec") {
				recs = await recManager.getTastediveRecs(title, year, type, apiKeys.tastedive);
			} else if (id === "mlt-gemini-ai-series-rec") {
				recs = await recManager.getGeminiRecs(title, year, type, apiKeys.gemini);
			} else {
				catalog = [];
			}
		} else {
			catalog = [];
		}

		if (!recs || recs.length === 0) {
			logger.emptyCatalog(`${catalogSource.toUpperCase()}: No recs found`, searchKey);
			return Promise.resolve([]);
		} else {
			catalog = await catalogManager.createRecCatalog(recs, type, apiKeys.rpdb, metaSource);

			// Save to cache
			await catalogManager.saveCache(searchKey, searchYear, type, catalogSource, catalog);
			if (searchImdb != null) {
				await catalogManager.saveCache(searchImdb, null, type, catalogSource, catalog);
			}
		}

		Promise.resolve(catalog).then((items) => {
			resolve({ metas: items });
		});
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
