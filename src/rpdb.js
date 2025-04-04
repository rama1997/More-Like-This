const RPDB_API_BASE_URL = "https://api.ratingposterdb.com";

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

		const response = await fetch(url);
		return response.status === 200 ? response.url : "";
	} catch (error) {
		return "";
	}
}

module.exports = {
	validateAPIKey,
	getRPDBPoster,
};
