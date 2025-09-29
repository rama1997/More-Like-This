const fetch = require("node-fetch");
const TRAKT_API_BASE_URL = "https://api.trakt.tv";
const { withTimeout } = require("../utils/timeout");
const logger = require("../utils/logger");

async function validateAPIKey(apiKey) {
	if (!apiKey || apiKey === "") {
		return false;
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

		return json ? true : false;
	} catch (error) {
		return false;
	}
}

async function getAPIEndpoint(mediaType) {
	// The Trakt API sometimes uses "movie" and "show" while other endpoints use "movies" and "shows".
	// Defaulting to "movie" and "show" for better compatibility with Stremio. Manually adjust as needed for API request.
	return mediaType === "movie" ? "movie" : "show";
}

async function fetchSearchResult(title, mediaType, apiKey) {
	try {
		const type = await getAPIEndpoint(mediaType);
		const url = `${TRAKT_API_BASE_URL}/search/${type}?query=${encodeURIComponent(title)}`;
		const options = {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"trakt-api-version": "2",
				"trakt-api-key": apiKey,
			},
		};

		const response = await withTimeout(fetch(url, options), 5000, "Trakt search timed out");
		const json = await response.json();

		if (json.length > 0) {
			return json;
		} else {
			return null;
		}
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function fetchRecommendations(imdbID, mediaType, apiKey) {
	try {
		const type = await getAPIEndpoint(mediaType);
		const adjustedMediaType = type === "movie" ? "movies" : "shows";
		const url = `${TRAKT_API_BASE_URL}/${adjustedMediaType}/${imdbID}/related`;
		const options = {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"trakt-api-version": "2",
				"trakt-api-key": apiKey,
			},
		};

		const response = await withTimeout(fetch(url, options), 5000, "Trakt fetch recs timed out");
		const json = await response.json();

		return json.length > 0 ? json : null;
	} catch (error) {
		logger.error(error.message, { imdbID, mediaType });
		return null;
	}
}

async function fetchMetadata(id, mediaType, apiKey) {
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

		const response = await withTimeout(fetch(url, options), 5000, "Trakt fetch media details timed out");
		const json = await response.json();

		if (json) {
			return json;
		} else {
			return null;
		}
	} catch (error) {
		logger.error(error.message, {});
		return null;
	}
}

async function idToImdbTitleYearType(traktId, mediaType, apiKey) {
	try {
		const type = await getAPIEndpoint(mediaType);
		const adjustedMediaType = type === "movie" ? "movie" : "show";

		const url = `${TRAKT_API_BASE_URL}/search/trakt/${traktId}?type=${adjustedMediaType}`;
		const options = {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"trakt-api-version": "2",
				"trakt-api-key": apiKey,
			},
		};

		const response = await withTimeout(fetch(url, options), 5000, `Trakt Id to Imdb conversion timed out: ${traktId}`);
		const json = await response.json();
		const res = json?.[0];

		let resTitle;
		let resYear;
		let imdbId;
		let resType;
		if (res) {
			resType = res.type;

			if (resType) {
				if (resType === "movie") {
					resTitle = res.movie.title;
					resYear = res.movie.year;
					imdbId = res.movie.ids.imdb;
				} else if (resType === "show") {
					resTitle = res.show.title;
					resYear = res.show.year;
					imdbId = res.show.ids.imdb;
				}
			}
		}

		return { title: resTitle, year: resYear, type: resType, imdbId: imdbId };
	} catch (error) {
		logger.error(error.message, { imdbID: traktId, mediaType });
		return null;
	}
}

module.exports = {
	validateAPIKey,
	fetchSearchResult,
	fetchRecommendations,
	fetchMetadata,
	idToImdbTitleYearType,
	getAPIEndpoint,
};
