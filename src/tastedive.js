const fetch = require("node-fetch");
const { TASTEDIVE_API_KEY } = require("../config");
const TASTEDIVE_API_BASE_URL = "https://tastedive.com/api/similar?";

let validKey = false;

async function validateAPIKey() {
	if (!TASTEDIVE_API_KEY || TASTEDIVE_API_KEY === "") {
		validKey = false;
	}

	try {
		const url = `${TASTEDIVE_API_BASE_URL}q=hi&type=movie&limit=1&slimit=1&k=${TASTEDIVE_API_KEY}`;

		const response = await fetch(url);
		const json = await response.json();
		validKey = json.similar ? true : false;
	} catch (error) {
		validKey = false;
	}
}

async function isValidKey() {
	return validKey;
}

async function getAPIEndpoint(mediaType) {
	// Tastedive API endpoint uses "movie" and "show"
	return mediaType === "movie" ? "movie" : "show";
}

async function fetchRecs(title, year, mediaType) {
	try {
		const cleanedTitle = encodeURI(title.replace(/[^a-zA-Z0-9 ]/g, ""));

		const url = `${TASTEDIVE_API_BASE_URL}q=${mediaType}:${cleanedTitle}+${year}&type=${mediaType}&slimit=1&k=${TASTEDIVE_API_KEY}`;

		const response = await fetch(url);
		const json = await response.json();
		return json?.similar?.results ? json.similar.results : [];
	} catch (error) {
		return [];
	}
}

module.exports = {
	validKey,
	validateAPIKey,
	getAPIEndpoint,
	isValidKey,
	fetchRecs,
};
