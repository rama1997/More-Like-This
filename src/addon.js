const { parseSearchKey } = require("../utils/parser");
const { titleToImdb, IdToTitleYearType } = require("./convertMetadata");
const catalogManager = require("./catalogManager");
const recManager = require("./recManager");
const logger = require("../utils/logger");

async function catalogHandler(type, id, extra, userConfig) {
	// Get user config settings
	const apiKeys = userConfig.apiKeys;
	const metadataSourceInput = userConfig.metadataSource;
	const enableTitleSearching = userConfig.enableTitleSearching;
	const includeTmdbCollection = userConfig.includeTmdbCollection;
	const language = userConfig.language;

	// Retreive and format source data. Used for cache and logging.
	let catalogSource = id.split("-")[1];
	if (catalogSource === "combined") {
		for (let source in apiKeys) {
			if (apiKeys[source].valid) {
				catalogSource = catalogSource + `-${source}`;
			}
		}
	}
	if (includeTmdbCollection && catalogSource.includes("tmdb")) {
		catalogSource = catalogSource + "-collection";
	}

	if (language) {
		catalogSource = catalogSource + `-${language}`;
	}

	// Retreieve and format meta data source
	const metadataSource = {
		source: metadataSourceInput === "tmdb" && apiKeys.tmdb.valid ? "tmdb" : "cinemeta",
		tmdbApiKey: apiKeys.tmdb,
		traktApiKey: apiKeys.trakt,
		language: language,
	};

	// Parse search input
	const searchParam = extra?.split("search=")[1];
	let parsedSearchParam = [];
	if (searchParam) {
		parsedSearchParam = await parseSearchKey(searchParam);
	} else {
		logger.emptyCatalog(`${catalogSource.toUpperCase()}: No search input`);
		return { metas: [] }; // Return empty catalog if no search input so addon does not show up on Discover or Home
	}

	const { searchKey = null, searchYear = null, searchType = null } = parsedSearchParam;

	// Return empty on title search, but title searching option is disabled
	if (!enableTitleSearching && !searchKey.startsWith("tt") && !searchKey.startsWith("kitsu")) {
		return { metas: [] };
	}

	// Return empty catalog if no real search key or if catalog type does not match search type
	if (!searchKey || (searchType && type !== searchType)) {
		logger.emptyCatalog(`${catalogSource.toUpperCase()}: Mismatch type`, { type, searchType });
		return { metas: [] };
	}

	// Check cache for search input
	let cachedRecsCatalog = await catalogManager.checkCache(searchKey, searchYear, type, catalogSource);
	if (cachedRecsCatalog) {
		return { metas: cachedRecsCatalog };
	}

	// Convert search input to IMDB Id, title, and year
	let title;
	let year;
	let searchImdb;

	if (searchKey.startsWith("tt")) {
		const media = await IdToTitleYearType(searchKey, type, metadataSource);
		if (media) {
			title = media.title;
			year = media.year;
		}

		searchImdb = searchKey;
	} else if (searchKey.startsWith("kitsu")) {
		const kitsuMedia = await IdToTitleYearType(searchKey, type, metadataSource);

		// Return empty catalog for invalid kitsu id
		if (!kitsuMedia) {
			logger.emptyCatalog(`${catalogSource.toUpperCase()}: No Kitsu Data found`, { type, searchKey });
			return { metas: [] };
		}

		title = kitsuMedia.title;
		year = kitsuMedia.year;

		searchImdb = await titleToImdb(kitsuMedia.title, kitsuMedia.year, kitsuMedia.type, metadataSource);
	} else {
		title = searchKey;
		year = searchYear;
		searchImdb = await titleToImdb(searchKey, searchYear, type, metadataSource);
	}

	if (searchImdb) {
		// Check cache for IMDB id
		cachedRecsCatalog = await catalogManager.checkCache(searchImdb, null, type, catalogSource);
		if (cachedRecsCatalog) {
			await catalogManager.saveCache(searchKey, searchYear, type, catalogSource, cachedRecsCatalog); // Save catalog to cache for search input
			return { metas: cachedRecsCatalog };
		}

		if (!title || !year) {
			const media = await IdToTitleYearType(searchImdb, type, metadataSource);
			if (media) {
				title = media.title;
				year = media.year;
			}
			if (!title || !year) {
				return { metas: [] };
			}
		}
	} else {
		// Addon does not continue if an associated IMDB Id is not found for the search input
		return { metas: [] };
	}

	logger.info(`${catalogSource.toUpperCase()}: Searched Media`, { title, year, type, searchImdb });

	// Get rec depending on catalog
	let recs = [];
	if (type === "movie") {
		if (id === "mlt-combined-movie-rec") {
			recs = await recManager.getCombinedRecs(title, year, type, searchImdb, apiKeys, includeTmdbCollection);
		} else if (id === "mlt-tmdb-movie-rec") {
			recs = await recManager.getTmdbRecs(searchImdb, type, apiKeys.tmdb.key, apiKeys.tmdb.valid, includeTmdbCollection);
		} else if (id === "mlt-trakt-movie-rec") {
			recs = await recManager.getTraktRecs(searchImdb, type, apiKeys.trakt.key, apiKeys.trakt.valid);
		} else if (id === "mlt-simkl-movie-rec") {
			recs = await recManager.getSimklRecs(searchImdb, type, apiKeys.simkl.valid);
		} else if (id === "mlt-gemini-movie-rec") {
			recs = await recManager.getGeminiRecs(title, year, type, searchImdb, apiKeys.gemini.key, apiKeys.gemini.valid, metadataSource);
		} else if (id === "mlt-tastedive-movie-rec") {
			recs = await recManager.getTastediveRecs(title, year, type, searchImdb, apiKeys.tastedive.key, apiKeys.tastedive.valid, metadataSource);
		} else if (id === "mlt-watchmode-movie-rec") {
			recs = await recManager.getWatchmodeRecs(searchImdb, type, apiKeys.watchmode.key, apiKeys.watchmode.valid);
		} else {
			recs = [];
		}
	} else if (type === "series") {
		if (id === "mlt-combined-series-rec") {
			recs = await recManager.getCombinedRecs(title, year, type, searchImdb, apiKeys, includeTmdbCollection);
		} else if (id == "mlt-tmdb-series-rec") {
			recs = await recManager.getTmdbRecs(searchImdb, type, apiKeys.tmdb.key, apiKeys.tmdb.valid, includeTmdbCollection);
		} else if (id === "mlt-simkl-series-rec") {
			recs = await recManager.getSimklRecs(searchImdb, type, apiKeys.simkl.valid);
		} else if (id === "mlt-trakt-series-rec") {
			recs = await recManager.getTraktRecs(searchImdb, type, apiKeys.trakt.key, apiKeys.trakt.valid);
		} else if (id === "mlt-gemini-series-rec") {
			recs = await recManager.getGeminiRecs(title, year, type, searchImdb, apiKeys.gemini.key, apiKeys.gemini.valid, metadataSource);
		} else if (id === "mlt-tastedive-series-rec") {
			recs = await recManager.getTastediveRecs(title, year, type, searchImdb, apiKeys.tastedive.key, apiKeys.tastedive.valid, metadataSource);
		} else if (id === "mlt-watchmode-series-rec") {
			recs = await recManager.getWatchmodeRecs(searchImdb, type, apiKeys.watchmode.key, apiKeys.watchmode.valid);
		} else {
			recs = [];
		}
	} else {
		recs = [];
	}

	// Transform recs to a Stremio catalog
	let catalog = [];
	if (!recs || recs.length === 0) {
		logger.emptyCatalog(`${catalogSource.toUpperCase()}: No recs found`, { title, year, type, searchImdb });
		return { metas: [] };
	} else {
		catalog = await catalogManager.createRecCatalog(recs, type, apiKeys.rpdb, metadataSource);

		if (!catalog) {
			logger.emptyCatalog(`${catalogSource.toUpperCase()}: Catalog Creation Error`, { title, year, type, searchImdb });
			return { metas: [] };
		}

		// Save to cache
		await catalogManager.saveCache(searchKey, searchYear, type, catalogSource, catalog);
		if (searchImdb && searchKey !== searchImdb) {
			await catalogManager.saveCache(searchImdb, null, type, catalogSource, catalog);
		}

		return { metas: catalog };
	}

	return { metas: [] };
}

async function streamHandler(type, id, platform) {
	let searchKey;

	// Parsing IMDB Id and Kitsu Ids
	if (id.startsWith("tt")) {
		searchKey = id.split(":")[0];
	} else if (id.startsWith("kitsu")) {
		searchKey = id.split(":").slice(0, 2).join(":");
	}

	const appStreamButton = {
		name: "More Like This",
		description: `Search in Stremio App`,
		externalUrl: `stremio:///search?search=${searchKey}`,
	};

	const webStreamButton = {
		name: "More Like This",
		description: `Search in Stremio Web`,
		externalUrl: `https://web.stremio.com/#/search?search=${searchKey}`,
	};

	let stream = [];

	if (platform === "web") {
		stream = [webStreamButton];
	} else if (platform === "app") {
		stream = [appStreamButton];
	} else {
		stream = [appStreamButton, webStreamButton];
	}

	return Promise.resolve({
		streams: stream,
		cacheMaxAge: 0,
	});
}

module.exports = {
	catalogHandler,
	streamHandler,
};
