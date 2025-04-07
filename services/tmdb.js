const fetch = require("node-fetch");
const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";

async function validateAPIKey(apiKey) {
	if (!apiKey || apiKey === "") {
		return false;
	}

	try {
		const url = `${TMDB_API_BASE_URL}/movie/popular?api_key=${apiKey}`;

		const response = await fetch(url);
		const json = await response.json();

		return json?.results ? true : false;
	} catch (error) {
		return false;
	}
}

async function getAPIEndpoint(mediaType) {
	// The TMDB API endpoint uses "movie" and "tv"
	return mediaType === "movie" ? "movie" : "tv";
}

async function fetchSearchResult(title, year, mediaType, apiKey) {
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

async function fetchRecommendations(tmdbId, mediaType, apiKey) {
	try {
		const url = `${TMDB_API_BASE_URL}/${mediaType}/${tmdbId}/recommendations?language=en-US&page=1&api_key=${apiKey}`;

		const response = await fetch(url);
		const json = await response.json();
		return json.results && json.results.length > 0 ? json.results : [];
	} catch (error) {
		return [];
	}
}

async function fetchImdbID(tmdbId, mediaType, apiKey) {
	try {
		const url = `${TMDB_API_BASE_URL}/${mediaType}/${tmdbId}/external_ids?api_key=${apiKey}`;

		const response = await fetch(url);
		const json = await response.json();
		return json.imdb_id ? json.imdb_id : null;
	} catch (error) {
		return "";
	}
}

async function fetchMediaDetails(id, mediaType, apiKey) {
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

async function findByImdbId(imdbId, searchType, apiKey) {
	try {
		const url = `${TMDB_API_BASE_URL}/find/${imdbId}?external_source=imdb_id&api_key=${apiKey}`;

		const response = await fetch(url);
		const json = await response.json();

		if (json) {
			return searchType === "movie" ? json?.movie_results : json?.tv_results;
		} else {
			return {};
		}
	} catch (error) {
		return {};
	}
}

module.exports = {
	validateAPIKey,
	fetchSearchResult,
	fetchRecommendations,
	fetchImdbID,
	fetchMediaDetails,
	getAPIEndpoint,
	findByImdbId,
};
