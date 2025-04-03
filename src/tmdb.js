const fetch = require("node-fetch");
const { TMDB_API_KEY } = require("../config/config");
const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";

const apiKey = TMDB_API_KEY();
let validKey = false;

async function validateAPIKey() {
	if (!apiKey || apiKey === "") {
		validKey = false;
		return validKey;
	}

	try {
		const url = `${TMDB_API_BASE_URL}/movie/popular?api_key=${apiKey}`;

		const response = await fetch(url);
		const json = await response.json();

		validKey = json?.results ? true : false;
		return validKey;
	} catch (error) {
		validKey = false;
		return validKey;
	}
}

async function isValidKey() {
	console.log(`API  KEY - ${apiKey}`);
	return validKey;
}

async function getAPIEndpoint(mediaType) {
	// The TMDB API endpoint uses "movie" and "tv"
	return mediaType === "movie" ? "movie" : "tv";
}

async function fetchSearchResult(title, year, mediaType) {
	try {
		let url = `${TMDB_API_BASE_URL}/search/${mediaType}?query=${encodeURIComponent(title)}&include_adult=false&language=en-US&page=1&api_key=${apiKey}`;

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
		const url = `${TMDB_API_BASE_URL}/${mediaType}/${tmdbId}/recommendations?language=en-US&page=1&api_key=${apiKey}`;

		const response = await fetch(url);
		const json = await response.json();
		return json.results && json.results.length > 0 ? json.results : [];
	} catch (error) {
		return [];
	}
}

async function fetchImdbID(tmdbId, mediaType) {
	try {
		const url = `${TMDB_API_BASE_URL}/${mediaType}/${tmdbId}/external_ids?api_key=${apiKey}`;

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
			url = `${TMDB_API_BASE_URL}/find/${id}?external_source=imdb_id&api_key=${apiKey}`;
		} else {
			url = `${TMDB_API_BASE_URL}/${mediaType}/${id}?language=en-US&api_key=${apiKey}`;
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
