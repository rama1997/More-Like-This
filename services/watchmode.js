const fetch = require("node-fetch");
const WATCHMODE_API_BASE_URL = "https://api.watchmode.com/v1";
const { withTimeout } = require("../utils/timeout");
const logger = require("../utils/logger");

const rawIdList = require("./watchmode_title_id_map.json");

const idMap = rawIdList.reduce((acc, row) => {
	acc[row.watchmodeID] = { imdbId: row.imdbID, tmdbId: row.tmdbID, type: row.type };
	return acc;
}, {});

async function validateAPIKey(apiKey) {
	if (!apiKey || apiKey === "") {
		return false;
	}

	try {
		const url = `${WATCHMODE_API_BASE_URL}/sources/?apiKey=${apiKey}`;

		const response = await fetch(url);
		const json = await response.json();

		return json.errorMessage ? false : true;
	} catch (error) {
		return false;
	}
}

async function getAPIEndpoint(mediaType) {
	return mediaType === "movie" ? "movie" : "tv";
}

async function fetchRecommendations(imdbID, apiKey) {
	try {
		const url = `${WATCHMODE_API_BASE_URL}/title/${imdbID}/details/?apiKey=${apiKey}`;

		const response = await withTimeout(fetch(url), 5000, "Watchmode fetch recs timed out");
		const json = await response.json();
		return json?.similar_titles ? json?.similar_titles : null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function watchmodeToExternalId(watchmodeId, apiKey) {
	try {
		// Look up id in ID dataset first
		if (idMap[watchmodeId]) {
			const imdbId = idMap[watchmodeId].imdbId;
			const tmdbId = idMap[watchmodeId].tmdbId;
			const type = idMap[watchmodeId].type;

			return imdbId && type ? { imdbId: imdbId, tmdbId, tmdbId, type: type } : null;
		} else {
			// Call Watchmode API as a backup
			const url = `${WATCHMODE_API_BASE_URL}/title/${watchmodeId}/details/?apiKey=${apiKey}`;
			const response = await withTimeout(fetch(url), 5000, "Watchmode id fetch timed out");
			const json = await response.json();

			const imdbId = json?.imdb_id;
			const type = json?.tmdb_type;

			return imdbId && type ? { imdbId: imdbId, type: type } : null;
		}
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

module.exports = {
	validateAPIKey,
	fetchRecommendations,
	watchmodeToExternalId,
};
