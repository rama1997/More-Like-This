const tmdb = require("../services/tmdb");
const trakt = require("../services/trakt");
const gemini = require("../services/gemini");
const tastedive = require("../services/tastedive");
const { titleToImdb } = require("./convertMetadata");

async function getTmdbRecs(searchImdb, searchType, apiKey) {
	if (!searchImdb || searchImdb === "") {
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

	// Get IMDB Id for all recs
	const recsImdbId = await Promise.all(
		recs.map(async (rec) => {
			return await tmdb.fetchImdbID(rec.id, mediaTypeForAPI, apiKey);
		}),
	);

	return recsImdbId;
}

async function getTraktRecs(searchImdb, searchType, apiKey) {
	if (!searchImdb || searchImdb === "") {
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

	// Get IMDB Id for all recs
	const recsImdbId = await Promise.all(
		recs.map(async (rec) => {
			return rec.ids.imdb;
		}),
	);

	return recsImdbId;
}

async function getTastediveRecs(searchTitle, searchYear, searchType, searchImdb, apiKey) {
	if (!searchTitle || searchTitle === "") {
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

	// Get IMDB Ids for all the rec titles
	let recs = await Promise.all(
		recTitles.map(async (rec) => {
			return await titleToImdb(rec.name, null, searchType);
		}),
	);

	return recs;
}

async function getGeminiRecs(searchTitle, searchYear, searchType, searchImdb, apiKey) {
	if (!searchTitle || searchTitle === "") {
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

	// Get IMDB Ids for all the rec titles
	let recs = await Promise.all(
		recTitles
			.slice(1)
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
