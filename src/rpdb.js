const { RPDB_API_KEY } = require("../config/config");
const RPDB_API_BASE_URL = "https://api.ratingposterdb.com";

const apiKey = RPDB_API_KEY();
let validKey = false;

async function validateAPIKey() {
	if (!apiKey || apiKey === "") {
		validKey = false;
		return validKey;
	}

	try {
		const url = `${RPDB_API_BASE_URL}/${apiKey}/isValid`;
		const response = await fetch(url);
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

async function getRPDBPoster(mediaId) {
	return `${RPDB_API_BASE_URL}/${apiKey}/imdb/poster-default/${mediaId}.jpg`;
}

module.exports = {
	isValidKey,
	validateAPIKey,
	getRPDBPoster,
};
