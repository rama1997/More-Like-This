const fetch = require("node-fetch");
const TASTEDIVE_API_BASE_URL = "https://tastedive.com/api/similar?";

async function validateAPIKey(apiKey) {
	if (!apiKey || apiKey === "") {
		return false;
	}

	try {
		const url = `${TASTEDIVE_API_BASE_URL}q=hi&type=movie&limit=1&k=${apiKey}`;

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
		const type = await getAPIEndpoint(mediaType);
		const cleanedTitle = title.replace(/[^\p{L}\p{N} ]/gu, "");

		const searchInput = year ? encodeURI(cleanedTitle) : encodeURI(cleanedTitle);

		const url = `${TASTEDIVE_API_BASE_URL}q=${type}:${searchInput}&type=${type}&slimit=2&k=${apiKey}`;

		const response = await fetch(url);
		const json = await response.json();
		return json?.similar ? json.similar : [];
	} catch (error) {
		return [];
	}
}

module.exports = {
	validateAPIKey,
	fetchRecs,
};
