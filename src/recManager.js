const tmdb = require("../services/tmdb");
const trakt = require("../services/trakt");
const gemini = require("../services/gemini");
const tastedive = require("../services/tastedive");
const { titleToImdb } = require("./convertMetadata");

async function getTmdbRecs(searchImdb, searchType, apiKey, validKey) {
	if (!searchImdb || searchImdb === "" || !validKey) {
		return null;
	}

	// Get specific terminlogy for type for API endpoints
	const mediaTypeForAPI = await tmdb.getAPIEndpoint(searchType);

	// Get recs from TMDB API
	const searchedMedia = await tmdb.findByImdbId(searchImdb, mediaTypeForAPI, apiKey);
	if (!searchedMedia) {
		return null;
	}

	const searchTmdb = searchedMedia[0]?.id;

	let recs = await tmdb.fetchRecommendations(searchTmdb, mediaTypeForAPI, apiKey);
	if (!recs || recs.length === 0) {
		return null;
	}
	recs = recs.filter((row) => row !== undefined);

	// Get IMDB Id for all recs and add it's placement ranking
	const recsImdbId = await Promise.all(
		recs.map(async (rec, index) => {
			return { id: await tmdb.fetchImdbID(rec.id, mediaTypeForAPI, apiKey), ranking: index + 1 };
		}),
	);

	return recsImdbId;
}

async function getTraktRecs(searchImdb, searchType, apiKey, validKey) {
	if (!searchImdb || searchImdb === "" || !validKey) {
		return null;
	}

	// Get specific Trakt terminlogy for movie/series for API endpoints
	const mediaTypeForAPI = await trakt.getAPIEndpoint(searchType);

	// Get recs based on the found media
	let recs = await trakt.fetchRecommendations(searchImdb, mediaTypeForAPI, apiKey);

	if (!recs || recs.length === 0) {
		return null;
	}
	recs = recs.filter((row) => row !== undefined);

	// Get IMDB Id for all recs and add it's placement ranking
	const recsImdbId = await Promise.all(
		recs.map(async (rec, index) => {
			return { id: rec.ids.imdb, ranking: index + 1 };
		}),
	);

	return recsImdbId;
}

async function getTastediveRecs(searchTitle, searchYear, searchType, searchImdb, apiKey, validKey) {
	if (!searchTitle || searchTitle === "" || !validKey) {
		return null;
	}

	// Get specific terminlogy for movie/series for API endpoints
	const mediaTypeForAPI = await tastedive.getAPIEndpoint(searchType);

	// Get API response from Tastedive
	const response = await tastedive.fetchRecs(searchTitle, searchYear, mediaTypeForAPI, apiKey);
	if (!response) {
		return null;
	}

	// If recs were found, verify that it is for the proper search input by comparing Imdb Ids
	const foundMedia = response.info?.[0];
	const foundMediaImdb = await titleToImdb(foundMedia?.name, null, foundMedia?.type);
	if (searchImdb && foundMediaImdb !== searchImdb) {
		return null;
	}

	const recTitles = response.results;
	if (!recTitles || recTitles.length === 0) {
		return null;
	}

	// Get IMDB Ids for all the rec titles and add it's placement ranking
	let recs = await Promise.all(
		recTitles.map(async (rec, index) => {
			return { id: await titleToImdb(rec.name, null, searchType), ranking: index + 1 };
		}),
	);

	return recs;
}

async function getGeminiRecs(searchTitle, searchYear, searchType, searchImdb, apiKey, validKey) {
	if (!searchTitle || searchTitle === "" || !validKey) {
		return null;
	}

	// Get recs from Gemini - Gemini returns rec's title and year as a string
	const recTitles = await gemini.getGeminiRecs(searchTitle, searchYear, searchType, apiKey);
	if (!recTitles || recTitles.length === 0) {
		return null;
	}

	// If recs were found, verify that it is for the proper search input by comparing Imdb Ids
	// The first item of Gemini Recs is always the search input
	const foundMedia = recTitles[0];
	const foundMediaImdb = await titleToImdb(foundMedia?.title, foundMedia?.year, searchType);
	if (searchImdb && foundMediaImdb !== searchImdb) {
		return null;
	}

	// Get IMDB Ids for all the rec titles and add it's placement ranking
	let recs = await Promise.all(
		recTitles
			.slice(1)
			.filter((row) => row[0] !== "") // Remove blank rows
			.map(async (rec, index) => {
				return { id: await titleToImdb(rec.title, rec.year, searchType), ranking: index + 1 };
			}),
	);

	return recs;
}

async function getCombinedRecs(searchTitle, searchYear, searchType, searchImdb, apiKeys) {
	// Get recs from all sources
	const tmdbRecs = (await getTmdbRecs(searchImdb, searchType, apiKeys.tmdb.key, apiKeys.tmdb.valid)) || [];
	const traktRecs = (await getTraktRecs(searchImdb, searchType, apiKeys.trakt.key, apiKeys.trakt.valid)) || [];
	const geminiRecs = (await getGeminiRecs(searchTitle, searchYear, searchType, searchImdb, apiKeys.gemini.key, apiKeys.gemini.valid)) || [];
	const tastediveRecs = (await getTastediveRecs(searchTitle, searchYear, searchType, searchImdb, apiKeys.tastedive.key, apiKeys.tastedive.valid)) || [];

	// Merge recs into one array
	const merged = [...tmdbRecs, ...traktRecs, ...tastediveRecs, ...geminiRecs];

	if (merged == []) {
		logger.emptyCatalog("COMBINED: Empty catalogy after merge", searchKey);
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
	let recs = [];
	const seenIds = new Set();

	for (const media of sorted) {
		if (!seenIds.has(media.id)) {
			recs.push(media);
			seenIds.add(media.id);
		}
	}

	return recs;
}

module.exports = {
	getTmdbRecs,
	getTraktRecs,
	getTastediveRecs,
	getGeminiRecs,
	getCombinedRecs,
};
