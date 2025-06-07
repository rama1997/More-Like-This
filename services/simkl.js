const fetch = require("node-fetch");
const SIMKL_API_BASE_URL = "https://api.simkl.com";
const { withTimeout } = require("../utils/timeout");
const logger = require("../utils/logger");

async function validateAPIKey(apiKey) {
	if (!apiKey || apiKey === "") {
		return false;
	}

	try {
		const url = `${SIMKL_API_BASE_URL}/movies/trending`;

		const response = await fetch(url);
		const json = await response.json();

		return json ? true : false;
	} catch (error) {
		return false;
	}
}

async function getAPIEndpoint(mediaType) {
	return mediaType === "movie" ? "movies" : "tv";
}

async function fetchRecommendations(imdbID, mediaType) {
	try {
		const url = `${SIMKL_API_BASE_URL}/${mediaType}/${imdbID}?extended=full`;

		const response = await withTimeout(fetch(url), 5000, "Simkl fetch recs timed out");
		const json = await response.json();

		// Perform a media type check on api call result since Simkl API returns same results regardless of which endpoint is used.
		if (json && json.type) {
			// Obtain and convert to correct media types when dealing with anime titles
			let responseType = json.type === "anime" ? json.anime_type : json.type;
			responseType = responseType === "tv" ? "show" : responseType;

			if ((mediaType === "tv" && responseType === "show") || (mediaType === "movies" && responseType === "movie")) {
				return json?.users_recommendations ?? null;
			}
		}

		return null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function simklToImdbId(simklId, mediaType) {
	try {
		const url = `${SIMKL_API_BASE_URL}/${mediaType}/${simklId}?extended=full`;

		const response = await withTimeout(fetch(url), 5000, "Simkl call in simklToImdbId timed out");
		const json = await response.json();

		return json?.ids?.imdb ?? null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

module.exports = {
	validateAPIKey,
	getAPIEndpoint,
	fetchRecommendations,
	simklToImdbId,
};
