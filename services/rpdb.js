const RPDB_API_BASE_URL = "https://api.ratingposterdb.com";
const { withTimeout } = require("../utils/timeout");
const logger = require("../utils/logger");

async function validateAPIKey(apiKey) {
	if (!apiKey || apiKey === "") {
		return false;
	}

	try {
		const url = `${RPDB_API_BASE_URL}/${apiKey}/isValid`;
		const response = await fetch(url);
		const json = await response.json();
		return json ? true : false;
	} catch (error) {
		return false;
	}
}

async function getRPDBPoster(mediaId, apiKey) {
	try {
		const url = `${RPDB_API_BASE_URL}/${apiKey}/imdb/poster-default/${mediaId}.jpg`;

		const response = await withTimeout(fetch(url), 5000, "RPDB poster timed out");
		return response.status === 200 ? response.url : "";
	} catch (error) {
		logger.error(error.message, null);
		return "";
	}
}

module.exports = {
	validateAPIKey,
	getRPDBPoster,
};
