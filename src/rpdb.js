const { RPDB_API_KEY } = require("../config");
const RPDB_API_BASE_URL = "https://api.ratingposterdb.com";

let validKey = false;

async function validateAPIKey() {
	if (!RPDB_API_KEY || RPDB_API_KEY === "") {
		validKey = false;
	}

	try {
		const url = `${RPDB_API_BASE_URL}/${RPDB_API_KEY}/isValid`;
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

async function getRPDBPoster(mediaId) {
	return `${RPDB_API_BASE_URL}/${RPDB_API_KEY}/imdb/poster-default/${mediaId}.jpg`;
}

module.exports = {
	isValidKey,
	validateAPIKey,
	getRPDBPoster,
};
