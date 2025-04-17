const fetch = require("node-fetch");
const TASTEDIVE_API_BASE_URL = "https://tastedive.com/api/similar?";

async function validateAPIKey(apiKey) {
	if (!apiKey || apiKey === "") {
		return false;
	}

	try {
		const url = `${TASTEDIVE_API_BASE_URL}q=hi&type=movie&limit=1&slimit=1&k=${apiKey}`;

		const response = await fetch(url);
		const json = await response.json();

		return json.similar ? true : false;
	} catch (error) {
		return false;
	}
}

async function getAPIEndpoint(mediaType) {
	// Tastedive API endpoint uses "movie" and "show"
	return mediaType === "movie" ? "movie" : "show";
}

async function fetchRecs(title, year, mediaType, apiKey) {
	try {
		const cleanedTitle = encodeURI(title.replace(/[^a-zA-Z0-9 ]/g, ""));

		const url = `${TASTEDIVE_API_BASE_URL}q=${mediaType}:${cleanedTitle}+${year}&type=${mediaType}&slimit=1&k=${apiKey}`;

		const response = await fetch(url);
		const json = await response.json();
		return json?.similar ? json.similar : [];
	} catch (error) {
		return [];
	}
}

module.exports = {
	validateAPIKey,
	getAPIEndpoint,
	fetchRecs,
};
