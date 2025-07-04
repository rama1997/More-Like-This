const tmdb = require("../services/tmdb");
const trakt = require("../services/trakt");
const simkl = require("../services/simkl");
const gemini = require("../services/gemini");
const tastedive = require("../services/tastedive");
const { titleToImdb } = require("./convertMetadata");
const logger = require("../utils/logger");

async function getTmdbRecs(searchImdb, searchType, apiKey, validKey, includeTmdbCollection) {
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

	const tmdbId = searchedMedia[0]?.id;

	let recs = [];
	const baseRecs = (await tmdb.fetchRecommendations(tmdbId, mediaTypeForAPI, apiKey)) || [];

	// Include TMDB collections into rec if enabled
	if (includeTmdbCollection) {
		const collectionRecs = (await tmdb.fetchCollectionRecs(tmdbId, mediaTypeForAPI, apiKey)) || [];
		recs = [...collectionRecs, ...baseRecs];
	} else {
		recs = [...baseRecs];
	}

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

async function getSimklRecs(searchImdb, searchType, validKey) {
	if (!searchImdb || searchImdb === "" || !validKey) {
		return null;
	}

	// Get specific Trakt terminlogy for movie/series for API endpoints
	const mediaTypeForAPI = await simkl.getAPIEndpoint(searchType);
	const returnTypeCheck = mediaTypeForAPI === "movies" ? "movie" : "tv";

	// Get recs based on the found media
	let recs = await simkl.fetchRecommendations(searchImdb, mediaTypeForAPI);
	if (!recs || recs.length === 0) {
		return null;
	}

	recs = recs.filter((row) => row !== undefined && (row.type === returnTypeCheck || row.anime_type === returnTypeCheck));

	// Get IMDB Id for all recs and add it's placement ranking
	const recsImdbId = await Promise.all(
		recs.map(async (rec, index) => {
			const simklId = rec.ids.simkl;
			const imdbId = await simkl.simklToImdbId(simklId, mediaTypeForAPI);
			return { id: imdbId ?? null, ranking: index + 1 };
		}),
	);

	return recsImdbId;
}

async function getTastediveRecs(searchTitle, searchYear, searchType, searchImdb, apiKey, validKey) {
	if (!searchTitle || searchTitle === "" || !searchImdb || searchImdb === "" || !validKey) {
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
	if (!foundMedia || foundMedia.length === 0) {
		return null;
	}
	const foundMediaImdb = await titleToImdb(foundMedia.name, null, foundMedia.type);
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
	if (!searchTitle || searchTitle === "" || !searchImdb || searchImdb === "" || !validKey) {
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

async function getCombinedRecs(searchTitle, searchYear, searchType, searchImdb, apiKeys, includeTmdbCollection) {
	// Get recs from all sources
	// prettier-ignore
	const [tmdbRecs, traktRecs, simklRecs, geminiRecs, tastediveRecs] = await Promise.all([
		getTmdbRecs(searchImdb, searchType, apiKeys.tmdb.key, apiKeys.tmdb.valid, includeTmdbCollection), 
		getTraktRecs(searchImdb, searchType, apiKeys.trakt.key, apiKeys.trakt.valid), 
		getSimklRecs(searchImdb, searchType, apiKeys.simkl.valid), 
		getGeminiRecs(searchTitle, searchYear, searchType, searchImdb, apiKeys.gemini.key, apiKeys.gemini.valid), 
		getTastediveRecs(searchTitle, searchYear, searchType, searchImdb, apiKeys.tastedive.key, apiKeys.tastedive.valid)
	]);

	// Merge recs into one array
	const merged = [...(tmdbRecs || []), ...(traktRecs || []), ...(simklRecs || []), ...(geminiRecs || []), ...(tastediveRecs || [])];

	if (merged.length === 0) {
		logger.emptyCatalog("COMBINED: Empty catalog after merge", searchTitle);
		return [];
	}

	// Count occurrences of each media ID and sum their ranking within the recommendations
	const recMap = {};
	for (const media of merged) {
		if (!recMap[media.id]) {
			recMap[media.id] = {
				...media,
				count: 1,
				rankingSum: media.ranking,
			};
		} else {
			recMap[media.id].count += 1;
			recMap[media.id].rankingSum += media.ranking;
		}
	}

	// Convert to array and sort by count, then average ranking
	const sorted = Object.values(recMap).sort((a, b) => {
		if (b.count !== a.count) {
			return b.count - a.count; // More appearances = better
		}
		const aAvgRank = a.rankingSum / a.count;
		const bAvgRank = b.rankingSum / b.count;
		return aAvgRank - bAvgRank; // Lower average rank = better
	});

	return sorted;
}

module.exports = {
	getTmdbRecs,
	getTraktRecs,
	getSimklRecs,
	getTastediveRecs,
	getGeminiRecs,
	getCombinedRecs,
};
