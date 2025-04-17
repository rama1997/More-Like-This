const { parseSearchKey } = require("../utils/parser");
const { titleToImdb, IdToTitleYearType } = require("./convertMetadata");
const catalogManager = require("./catalogManager");
const recManager = require("./recManager");
const tmdb = require("../services/tmdb");
const trakt = require("../services/trakt");
const logger = require("../utils/logger");

async function catalogHandler(type, id, extra, apiKeys, useTmdbMeta) {
	const catalogSource = id.split("-")[1];
	const metaSource = { source: useTmdbMeta ? "tmdb" : "cinemeta", tmdbApiKey: apiKeys.tmdb };

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

	// Convert search input to IMDB id or title/year for source API search
	let title;
	let year;
	let searchImdb;

	if (searchKey.startsWith("tt")) {
		const media = await IdToTitleYearType(searchKey, type, metaSource);
		if (media) {
			title = media.title;
			year = media.year;
		}

		searchImdb = searchKey;
	} else if (searchKey.startsWith("kitsu")) {
		const kitsuMedia = await IdToTitleYearType(searchKey, type, metaSource);

		// Return empty catalog for invalid kitsu id
		if (!kitsuMedia) {
			logger.emptyCatalog(`${catalogSource.toUpperCase()}: No Kitsu Data found`, { type, searchKey });
			return { metas: [] };
		}

		title = kitsuMedia.title;
		year = kitsuMedia.year;

		searchImdb = await titleToImdb(kitsuMedia.title, kitsuMedia.year, kitsuMedia.type);
	} else {
		title = searchKey;
		year = searchYear;
		searchImdb = await titleToImdb(searchKey, searchYear, type);
	}

	// If IMDB id not found, try Tmdb search if API key provided as backup
	if (!searchImdb && apiKeys.tmdb.valid) {
		const mediaTypeForTmdb = await tmdb.getAPIEndpoint(type);

		// Search TMDB's search results for a title + year and fetch the top result
		const searchResults = await tmdb.fetchSearchResult(title, year, mediaTypeForTmdb, apiKeys.tmdb.key);
		if (!searchResults || searchResults.length === 0) {
			return;
		}
		const foundMedia = searchResults[0];

		// If the IMDB Id's media does not match catalog type, skip the catalog
		const mediaType = foundMedia.release_date ? "movie" : "series";
		if (mediaType !== type) {
			return;
		}

		searchImdb = await tmdb.fetchImdbID(foundMedia.id, mediaTypeForTmdb, apiKeys.tmdb.key);
	}

	// If IMDB id not found, try Trakt search if API key provided as backup
	if (!searchImdb && apiKeys.trakt.valid) {
		const mediaTypeForTrakt = await trakt.getAPIEndpoint(type);

		const searchResults = await trakt.fetchSearchResult(title, mediaTypeForTrakt, apiKeys.trakt.key);
		if (!searchResults || searchResults.length === 0) {
			return;
		}

		const foundMedia = searchResults[0][mediaTypeForTrakt];
		searchImdb = foundMedia?.ids?.imdb;
	}

	// Check cache for IMDB id
	if (searchImdb) {
		cachedRecsCatalog = await catalogManager.checkCache(searchImdb, null, type, catalogSource);
		if (cachedRecsCatalog) {
			await catalogManager.saveCache(searchKey, searchYear, type, catalogSource, cachedRecsCatalog); // Save catalog to cache for search input
			return { metas: cachedRecsCatalog };
		}
	}

	logger.info(`${catalogSource.toUpperCase()}: Searched Media`, { title, year, type, searchImdb });

	// Get rec depending on catalog
	let recs = [];
	if (type === "movie") {
		if (id === "mlt-combined-movie-rec") {
			recs = await recManager.getCombinedRecs(title, year, type, searchImdb, apiKeys);
		} else if (id === "mlt-tmdb-movie-rec") {
			recs = await recManager.getTmdbRecs(searchImdb, type, apiKeys.tmdb.key, apiKeys.tmdb.valid);
		} else if (id === "mlt-trakt-movie-rec") {
			recs = await recManager.getTraktRecs(searchImdb, type, apiKeys.trakt.key, apiKeys.trakt.valid);
		} else if (id === "mlt-tastedive-movie-rec") {
			recs = await recManager.getTastediveRecs(title, year, type, searchImdb, apiKeys.tastedive.key, apiKeys.tastedive.valid);
		} else if (id === "mlt-gemini-movie-rec") {
			recs = await recManager.getGeminiRecs(title, year, type, searchImdb, apiKeys.gemini.key, apiKeys.gemini.valid);
		} else {
			recs = [];
		}
	} else if (type === "series") {
		if (id === "mlt-combined-series-rec") {
			recs = await recManager.getCombinedRecs(title, year, type, searchImdb, apiKeys);
		} else if (id == "mlt-tmdb-series-rec") {
			recs = await recManager.getTmdbRecs(searchImdb, type, apiKeys.tmdb.key, apiKeys.tmdb.valid);
		} else if (id === "mlt-trakt-series-rec") {
			recs = await recManager.getTraktRecs(searchImdb, type, apiKeys.trakt.key, apiKeys.trakt.valid);
		} else if (id === "mlt-tastedive-series-rec") {
			recs = await recManager.getTastediveRecs(title, year, type, searchImdb, apiKeys.tastedive.key, apiKeys.tastedive.valid);
		} else if (id === "mlt-gemini-series-rec") {
			recs = await recManager.getGeminiRecs(title, year, type, searchImdb, apiKeys.gemini.key, apiKeys.gemini.valid);
		} else {
			recs = [];
		}
	} else {
		recs = [];
	}

	// Transform recs to a Stremio catalog
	let catalog = [];
	if (!recs || recs.length === 0) {
		logger.emptyCatalog(`${catalogSource.toUpperCase()}: No recs found`, title, year, type, searchImdb);
		return { metas: [] };
	} else {
		catalog = await catalogManager.createRecCatalog(recs, type, apiKeys.rpdb, metaSource);

		if (!catalog) {
			logger.emptyCatalog(`${catalogSource.toUpperCase()}: Catalog Creation Error`, itle, year, type, searchImdb);
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
