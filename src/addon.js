const catalogManager = require("./catalogManager");
const { parseSearchKey } = require("../utils/parser");

async function catalogHandler(type, id, extra, apiKeys, useTmdbMeta) {
	return new Promise(async (resolve, reject) => {
		// Parse search input
		const searchParam = extra?.split("search=")[1];
		let parsedSearchParam = [];
		if (searchParam) {
			parsedSearchParam = await parseSearchKey(searchParam);
		}

		const { searchKey = "", searchYear = "", searchType = "" } = parsedSearchParam;

		const metaSource = { source: useTmdbMeta ? "tmdb" : "cinemeta", tmdbApiKey: apiKeys.tmdb };

		let catalog;
		switch (type) {
			case "movie":
				if (searchParam && searchType !== "series") {
					if (id === "mlt-combined-movie-rec") {
						catalog = catalogManager.getCombinedRecCatalog(searchKey, searchYear, type, apiKeys, metaSource);
					} else if (id === "mlt-tmdb-movie-rec") {
						catalog = catalogManager.getTMDBRecCatalog(searchKey, searchYear, type, apiKeys.tmdb, apiKeys.rpdb, metaSource);
					} else if (id === "mlt-trakt-movie-rec") {
						catalog = catalogManager.getTraktRecCatalog(searchKey, searchYear, type, apiKeys.trakt, apiKeys.rpdb, metaSource);
					} else if (id === "mlt-tastedive-movie-rec") {
						catalog = catalogManager.getTastediveRecCatalog(searchKey, searchYear, type, apiKeys.tastedive, apiKeys.rpdb, metaSource);
					} else if (id === "mlt-gemini-ai-movie-rec") {
						catalog = catalogManager.getGeminiRecCatalog(searchKey, searchYear, type, apiKeys.gemini, apiKeys.rpdb, metaSource);
					} else {
						catalog = [];
					}
					break;
				} else {
					catalog = [];
					break;
				}
			case "series":
				if (searchParam && searchType !== "movie") {
					if (id === "mlt-combined-series-rec") {
						catalog = catalogManager.getCombinedRecCatalog(searchKey, searchYear, type, apiKeys, metaSource);
					} else if (id == "mlt-tmdb-series-rec") {
						catalog = catalogManager.getTMDBRecCatalog(searchKey, searchYear, type, apiKeys.tmdb, apiKeys.rpdb, metaSource);
					} else if (id === "mlt-trakt-series-rec") {
						catalog = catalogManager.getTraktRecCatalog(searchKey, searchYear, type, apiKeys.trakt, apiKeys.rpdb, metaSource);
					} else if (id === "mlt-tastedive-series-rec") {
						catalog = catalogManager.getTastediveRecCatalog(searchKey, searchYear, type, apiKeys.tastedive, apiKeys.rpdb, metaSource);
					} else if (id === "mlt-gemini-ai-series-rec") {
						catalog = catalogManager.getGeminiRecCatalog(searchKey, searchYear, type, apiKeys.gemini, apiKeys.rpdb, metaSource);
					} else {
						catalog = [];
					}
					break;
				} else {
					catalog = [];
					break;
				}
			default:
				catalog = [];
				break;
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
