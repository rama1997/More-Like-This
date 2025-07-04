const fetch = require("node-fetch");
const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
const { withTimeout } = require("../utils/timeout");
const logger = require("../utils/logger");

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

		const response = await withTimeout(fetch(url), 5000, "TMDB search timed out");
		const json = await response.json();
		return json.results && json.results.length > 0 ? json.results : null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function fetchRecommendations(tmdbId, mediaType, apiKey) {
	try {
		const url = `${TMDB_API_BASE_URL}/${mediaType}/${tmdbId}/recommendations?language=en-US&page=1&api_key=${apiKey}`;

		const response = await withTimeout(fetch(url), 5000, "TMDB fetch recs timed out");
		const json = await response.json();
		return json.results && json.results.length > 0 ? json.results : null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function fetchImdbID(tmdbId, mediaType, apiKey) {
	try {
		const url = `${TMDB_API_BASE_URL}/${mediaType}/${tmdbId}/external_ids?api_key=${apiKey}`;

		const response = await withTimeout(fetch(url), 5000, "TMDB id fetch timed out");
		const json = await response.json();
		return json.imdb_id ? json.imdb_id : null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function fetchMediaDetails(id, mediaType, apiKey) {
	if (!id || !mediaType) {
		return null;
	}

	try {
		let url = "";

		// Get details through different endpoints depending on what type of id is given. Either imdb id or tmdb id
		if (id.toString().startsWith("tt")) {
			url = `${TMDB_API_BASE_URL}/find/${id}?external_source=imdb_id&api_key=${apiKey}`;
		} else {
			url = `${TMDB_API_BASE_URL}/${mediaType}/${id}?language=en-US&api_key=${apiKey}`;
		}

		const response = await withTimeout(fetch(url), 5000, "TMDB media details fetch timed out");
		const json = await response.json();
		return json ? json : null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function findByImdbId(imdbId, searchType, apiKey) {
	try {
		const url = `${TMDB_API_BASE_URL}/find/${imdbId}?external_source=imdb_id&api_key=${apiKey}`;

		const response = await withTimeout(fetch(url), 1000, "TMDB find by id timed out");
		const json = await response.json();

		if (json) {
			return searchType === "movie" ? json?.movie_results : json?.tv_results;
		} else {
			return null;
		}
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function cleanMeta(rawMeta, imdbId) {
	if (rawMeta == null) {
		return null;
	}

	let meta = rawMeta;

	// Remove media that are not released yet
	const year = meta.release_date ? Number(meta?.release_date?.split(/[–-]/)[0]) : Number(meta?.first_air_date?.split(/[–-]/)[0]);
	const currentYear = new Date().getFullYear();
	if (currentYear < year || year === 0) {
		return null;
	}

	meta.imdb_id = imdbId;
	meta.poster = `https://image.tmdb.org/t/p/original/${meta.poster_path}`;
	meta.title = meta.title ? meta.title : meta.name;
	meta.type = meta.media_type === "movie" ? "movie" : "series";
	meta.year = year;
	meta.backdrop = meta.backdrop_path;
	meta.genre = meta.genres_ids;
	return meta;
}

async function fetchCollectionID(tmdbId, mediaType, apiKey) {
	if (!tmdbId || !mediaType) {
		return null;
	}

	try {
		const url = `${TMDB_API_BASE_URL}/${mediaType}/${tmdbId}?language=en-US&api_key=${apiKey}`;

		const response = await withTimeout(fetch(url), 5000, "TMDB collection id fetch timed out");
		const json = await response.json();

		const collectionID = json?.belongs_to_collection?.id;

		return collectionID || null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function fetchCollectionRecs(tmdbId, mediaType, apiKey) {
	if (!tmdbId || !mediaType) {
		return null;
	}

	try {
		const collectionId = await fetchCollectionID(tmdbId, mediaType, apiKey);

		if (collectionId) {
			const url = `${TMDB_API_BASE_URL}/collection/${collectionId}?language=en-US&api_key=${apiKey}`;

			const response = await withTimeout(fetch(url), 5000, "TMDB collection details fetch timed out");
			const json = await response.json();

			let collectionRecs = [];
			const collectionParts = json?.parts;

			if (collectionParts) {
				collectionParts.forEach((part) => {
					if (part.id !== tmdbId) {
						const media = { id: part.id };
						collectionRecs.push(media);
					}
				});
				return collectionRecs;
			}
		}

		return null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
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
	cleanMeta,
	fetchCollectionRecs,
};
