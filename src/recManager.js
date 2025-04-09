const tmdb = require("../services/tmdb");
const trakt = require("../services/trakt");
const gemini = require("../services/gemini");
const rpdb = require("../services/rpdb");
const tastedive = require("../services/tastedive");
const logger = require("../utils/logger");
const { imdbToMeta, titleToImdb, IdToTitleYearType } = require("./convertMetadata");

async function getTmdbRecs(searchKey, searchYear, searchType, searchImdb, tmdbApiKey, metaSource) {
	const apiKey = tmdbApiKey.key;
	const validKey = tmdbApiKey.valid;
	if (!validKey || searchKey === "") {
		return [];
	}

	// Get specific terminlogy for movie/series for API endpoints
	const mediaTypeForAPI = await tmdb.getAPIEndpoint(searchType);

	// Get searched media's title and year for backup search
	const { title, year, type } = searchKey.startsWith("kitsu") ? await IdToTitleYearType(searchKey, searchType, metaSource) : { title: searchKey, year: searchYear, type: searchType };

	if (type !== searchType) {
		return [];
	}

	// If Imdb ID could not previously be found, search TMDB search result as a backup
	if (!searchImdb || searchImdb === "") {
		// Search TMDB's search results for a title + year and fetch the top result
		const searchResults = await tmdb.fetchSearchResult(title, year, mediaTypeForAPI, apiKey);
		if (!searchResults || searchResults.length === 0) {
			logger.emptyCatalog(`TMDB: No search result found`, { searchKey, searchType });
			return [];
		}
		const foundMedia = searchResults[0];

		// If the IMDB Id's media does not match catalog type, skip the catalog
		const mediaType = foundMedia.released ? "movie" : "series";
		if (mediaType !== searchType) {
			return [];
		}

		searchImdb = await tmdb.fetchImdbID(foundMedia.id, mediaTypeForAPI, apiKey);
	}

	logger.info("TMDB: Searched Media", { title, year, searchType, searchImdb });

	// // Check cache for previously saved catalog associated with the associated IMDB Id and return if exist
	// cachedRecsCatalog = await checkCache(searchedMediaImdbId, null, searchType, "tmdb");
	// if (cachedRecsCatalog) {
	// 	await saveCache(searchKey, year, searchType, "tmdb", cachedRecsCatalog); // Save cached catalog for search input as well
	// 	return cachedRecsCatalog;
	// }

	// Get recs from TMDB API
	const searchedMedia = await tmdb.findByImdbId(searchImdb, mediaTypeForAPI, apiKey);
	const searchedMediaTmdbId = searchedMedia[0]?.id;

	const recs = (await tmdb.fetchRecommendations(searchedMediaTmdbId, mediaTypeForAPI, apiKey)).filter((row) => row !== undefined);
	if (!recs || recs.length === 0) {
		logger.emptyCatalog(`TMDB: No recs found`, searchKey);
		return [];
	}

	// Get IMDB Id for all recs
	const recsImdbId = await Promise.all(
		recs.map(async (rec) => {
			return await tmdb.fetchImdbID(rec.id, mediaTypeForAPI, apiKey);
		}),
	);

	return recsImdbId;
}

module.exports = {
	getTmdbRecs,
};
