const { parseSearchKey } = require("../utils/parser");
const { imdbToMeta, titleToImdb, IdToTitleYearType } = require("./convertMetadata");
const catalogManager = require("./catalogManager");
const recManager = require("./recManager");

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

		// Return empty catalog if no real search key
		if (searchKey === "") {
			return Promise.resolve([]);
		}

		// Return empty catalog if catalog type does not match search type
		if (searchType !== "" && type !== searchType) {
			return Promise.resolve([]);
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
			const kitsuMedia = await IdToTitleYearType(searchKey, type, metaSource);
			searchImdb = await titleToImdb(kitsuMedia.title, kitsuMedia.year, kitsuMedia.type);
		} else {
			searchImdb = await titleToImdb(searchKey, searchYear, type);
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
		}

		let catalog = [];
		if (type === "movie") {
			if (id === "mlt-combined-movie-rec") {
				catalog = catalogManager.getCombinedRecCatalog(searchKey, searchYear, type, apiKeys, metaSource);
			} else if (id === "mlt-tmdb-movie-rec") {
				const recs = await recManager.getTmdbRecs(searchKey, searchYear, type, searchImdb, apiKeys.tmdb, metaSource);
				catalog = await catalogManager.createRecCatalog(recs, type, apiKeys.rpdb, metaSource);
			} else if (id === "mlt-trakt-movie-rec") {
				catalog = catalogManager.getTraktRecCatalog(searchKey, searchYear, type, apiKeys.trakt, apiKeys.rpdb, metaSource);
			} else if (id === "mlt-tastedive-movie-rec") {
				catalog = catalogManager.getTastediveRecCatalog(searchKey, searchYear, type, apiKeys.tastedive, apiKeys.rpdb, metaSource);
			} else if (id === "mlt-gemini-ai-movie-rec") {
				catalog = catalogManager.getGeminiRecCatalog(searchKey, searchYear, type, apiKeys.gemini, apiKeys.rpdb, metaSource);
			} else {
				catalog = [];
			}
		} else if (type === "series") {
			if (id === "mlt-combined-series-rec") {
				catalog = catalogManager.getCombinedRecCatalog(searchKey, searchYear, type, apiKeys, metaSource);
			} else if (id == "mlt-tmdb-series-rec") {
				const recs = await recManager.getTmdbRecs(searchKey, searchYear, type, searchImdb, apiKeys.tmdb, metaSource);
				catalog = await catalogManager.createRecCatalog(recs, type, apiKeys.rpdb, metaSource);
			} else if (id === "mlt-trakt-series-rec") {
				catalog = catalogManager.getTraktRecCatalog(searchKey, searchYear, type, apiKeys.trakt, apiKeys.rpdb, metaSource);
			} else if (id === "mlt-tastedive-series-rec") {
				catalog = catalogManager.getTastediveRecCatalog(searchKey, searchYear, type, apiKeys.tastedive, apiKeys.rpdb, metaSource);
			} else if (id === "mlt-gemini-ai-series-rec") {
				catalog = catalogManager.getGeminiRecCatalog(searchKey, searchYear, type, apiKeys.gemini, apiKeys.rpdb, metaSource);
			} else {
				catalog = [];
			}
		} else {
			catalog = [];
		}

		// // Save to cache
		// await saveCache(searchKey, searchYear, searchType, "tmdb", catalog);
		// if (searchedMediaImdbId != null) {
		// 	await saveCache(searchedMediaImdbId, null, searchType, "tmdb", catalog);
		// }

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
