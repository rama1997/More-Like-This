const fetch = require("node-fetch");
const { TMDB_API_KEY } = require("../config");
const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";

let validKey = false;

async function validateAPIKey() {
	if (!TMDB_API_KEY || TMDB_API_KEY === "") {
		validKey = false;
	}

	try {
		const url = `${TMDB_API_BASE_URL}/movie/popular`;

		const response = await fetch(url);
		const json = await response.json();

		validKey = json ? true : false;
	} catch (error) {
		validKey = false;
	}
}

async function isValidKey() {
	return validKey;
}

async function getAPIEndpoint(mediaType) {
	// The TMDB API endpoint uses "movie" and "tv"
	return mediaType === "movie" ? "movie" : "tv";
}

async function fetchSearchResult(title, year, mediaType) {
	try {
		let url = `${TMDB_API_BASE_URL}/search/${mediaType}?query=${encodeURIComponent(title)}&include_adult=false&language=en-US&page=1&api_key=${TMDB_API_KEY}`;

		if (year && year !== "") {
			url = url + `&year=${year}`;
		}

		const response = await fetch(url);
		const json = await response.json();
		return json.results && json.results.length > 0 ? json.results : [];
	} catch (error) {
		return [];
	}
}

async function fetchRecommendations(tmdbId, mediaType) {
	try {
		const url = `${TMDB_API_BASE_URL}/${mediaType}/${tmdbId}/recommendations?language=en-US&page=1&api_key=${TMDB_API_KEY}`;

		const response = await fetch(url);
		const json = await response.json();
		return json.results && json.results.length > 0 ? json.results : [];
	} catch (error) {
		return [];
	}
}

async function fetchImdbID(tmdbId, mediaType) {
	try {
		const url = `${TMDB_API_BASE_URL}/${mediaType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;

		const response = await fetch(url);
		const json = await response.json();
		return json.imdb_id ? json.imdb_id : null;
	} catch (error) {
		return "";
	}
}

async function fetchMediaDetails(id, mediaType) {
	try {
		let url = "";

		// Get details through different endpoints depending on what type of id is given. Either imdb id or tmdb id
		if (id.toString().startsWith("tt")) {
			url = `${TMDB_API_BASE_URL}/find/${id}?external_source=imdb_id&api_key=${TMDB_API_KEY}`;
		} else {
			url = `${TMDB_API_BASE_URL}/${mediaType}/${id}?language=en-US&api_key=${TMDB_API_KEY}`;
		}

		const response = await fetch(url);
		const json = await response.json();
		return json ? json : {};
	} catch (error) {
		return {};
	}
}

module.exports = {
	validateAPIKey,
	isValidKey,
	fetchSearchResult,
	fetchRecommendations,
	fetchImdbID,
	fetchMediaDetails,
	getAPIEndpoint,
};
