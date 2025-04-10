const tmdb = require("../services/tmdb");
const trakt = require("../services/trakt");
const gemini = require("../services/gemini");
const rpdb = require("../services/rpdb");
const tastedive = require("../services/tastedive");
const logger = require("../utils/logger");
const { imdbToMeta, titleToImdb, IdToTitleYearType } = require("./convertMetadata");

async function getTmdbRecs(searchImdb, searchType, tmdbApiKey) {
	const apiKey = tmdbApiKey.key;
	const validKey = tmdbApiKey.valid;
	if (!validKey || searchImdb === "") {
		return [];
	}

	// Get specific terminlogy for type for API endpoints
	const mediaTypeForAPI = await tmdb.getAPIEndpoint(searchType);

	// Get recs from TMDB API
	const searchedMedia = await tmdb.findByImdbId(searchImdb, mediaTypeForAPI, apiKey);
	const searchTmdb = searchedMedia[0]?.id;

	const recs = (await tmdb.fetchRecommendations(searchTmdb, mediaTypeForAPI, apiKey)).filter((row) => row !== undefined);
	if (!recs || recs.length === 0) {
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

async function getTraktRecs(searchImdb, searchType, traktApiKey) {
	const apiKey = traktApiKey.key;
	const validKey = traktApiKey.valid;
	if (!validKey || searchImdb === "") {
		return [];
	}

	// Get specific Trakt terminlogy for movie/series for API endpoints
	const mediaTypeForAPI = await trakt.getAPIEndpoint(searchType);

	// Get recs based on the found media
	const recs = (await trakt.fetchRecommendations(searchImdb, mediaTypeForAPI, apiKey)).filter((row) => row !== undefined);
	if (!recs || recs.length === 0) {
		return [];
	}

	// Get IMDB Id for all recs
	const recsImdbId = await Promise.all(
		recs.map(async (rec) => {
			return rec.ids.imdb;
		}),
	);

	return recsImdbId;
}

async function getTastediveRecs(searchTitle, searchYear, searchType, tastediveApiKey) {
	const apiKey = tastediveApiKey.key;
	const validKey = tastediveApiKey.valid;
	if (!validKey || searchTitle === "") {
		return [];
	}

	// Get specific terminlogy for movie/series for API endpoints
	const mediaTypeForAPI = await tastedive.getAPIEndpoint(searchType);

	// Get recs titles from Tastedive
	const recTitles = await tastedive.fetchRecs(searchTitle, searchYear, mediaTypeForAPI, apiKey);
	if (!recTitles || recTitles.length === 0) {
		return [];
	}

	// Get IMDB Ids for all the rec titles
	let recs = await Promise.all(
		recTitles.map(async (rec) => {
			return await titleToImdb(rec.name, "", searchType);
		}),
	);

	return recs;
}

async function getGeminiRecs(searchTitle, searchYear, searchType, geminiApiKey) {
	const apiKey = geminiApiKey.key;
	const validKey = geminiApiKey.valid;
	if (!validKey || searchTitle === "") {
		return [];
	}

	// Get recs from Gemini - Gemini returns rec's title and year as a string
	const recTitles = await gemini.getGeminiRecs(searchTitle, searchYear, searchType, apiKey);
	if (!recTitles || recTitles.length === 0) {
		return [];
	}

	// Get IMDB Ids for all the rec titles
	let recs = await Promise.all(
		recTitles
			.filter((row) => row[0] !== "") // Remove blank rows
			.map(async (rec) => {
				return await titleToImdb(rec.title, rec.year, searchType);
			}),
	);

	return recs;
}

module.exports = {
	getTmdbRecs,
	getTraktRecs,
	getTastediveRecs,
	getGeminiRecs,
};
