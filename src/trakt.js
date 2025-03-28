const fetch = require("node-fetch");
const { TRAKT_API_KEY } = require("../config/config");
const TRAKT_API_BASE_URL = "https://api.trakt.tv";

const apiKey = TRAKT_API_KEY();
let validKey = false;

async function validateAPIKey() {
	if (!apiKey || apiKey === "") {
		validKey = false;
		return validKey;
	}

	try {
		const url = `${TRAKT_API_BASE_URL}/movies/trending`;
		const options = {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"trakt-api-version": "2",
				"trakt-api-key": apiKey,
			},
		};

		const response = await fetch(url, options);
		const json = await response.json();

		validKey = json ? true : false;
		return validKey;
	} catch (error) {
		validKey = false;
		return validKey;
	}
}

async function isValidKey() {
	return validKey;
}

async function getAPIEndpoint(mediaType) {
	// The Trakt API sometimes uses "movie" and "show" while other endpoints use "movies" and "shows".
	// Defaulting to "movie" and "show" for better compatibility with Stremio. Manually adjust as needed for API request.
	return mediaType === "movie" ? "movie" : "show";
}

async function fetchSearchResult(title, mediaType) {
	try {
		const url = `${TRAKT_API_BASE_URL}/search/${mediaType}?query=${encodeURIComponent(title)}`;
		const options = {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"trakt-api-version": "2",
				"trakt-api-key": apiKey,
			},
		};

		const response = await fetch(url, options);
		const json = await response.json();

		if (json.length > 0) {
			return json;
		} else {
			return Promise.resolve([]);
		}
	} catch (error) {
		return [];
	}
}

async function fetchRecommendations(imdbID, mediaType) {
	const adjustedMediaType = mediaType === "movie" ? "movies" : "shows";
	try {
		const url = `${TRAKT_API_BASE_URL}/${adjustedMediaType}/${imdbID}/related`;
		const options = {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"trakt-api-version": "2",
				"trakt-api-key": apiKey,
			},
		};

		const response = await fetch(url, options);
		const json = await response.json();
		return json.length > 0 ? json : [];
	} catch (error) {
		return [];
	}
}

async function fetchMediaDetails(id, mediaType) {
	const adjustedMediaType = mediaType === "movie" ? "movies" : "shows";

	try {
		const url = `${TRAKT_API_BASE_URL}/${adjustedMediaType}/${id}?extended=full`;
		const options = {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"trakt-api-version": "2",
				"trakt-api-key": apiKey,
			},
		};

		const response = await fetch(url, options);
		const json = await response.json();

		if (json) {
			return json;
		} else {
			return Promise.resolve([]);
		}
	} catch (error) {
		return [];
	}
}

module.exports = {
	isValidKey,
	validateAPIKey,
	fetchSearchResult,
	fetchRecommendations,
	fetchMediaDetails,
	getAPIEndpoint,
};
