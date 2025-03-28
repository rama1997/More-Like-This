const fetch = require("node-fetch");
const { TASTEDIVE_API_KEY } = require("../config/config");
const TASTEDIVE_API_BASE_URL = "https://tastedive.com/api/similar?";

const apiKey = TASTEDIVE_API_KEY();
let validKey = false;

async function validateAPIKey() {
	if (!apiKey || apiKey === "") {
		validKey = false;
		return validKey;
	}

	try {
		const url = `${TASTEDIVE_API_BASE_URL}q=hi&type=movie&limit=1&slimit=1&k=${apiKey}`;

		const response = await fetch(url);
		const json = await response.json();

		validKey = json.similar ? true : false;
		return validKey;
	} catch (error) {
		validKey = false;
		return validKey;
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

		const url = `${TASTEDIVE_API_BASE_URL}q=${mediaType}:${cleanedTitle}+${year}&type=${mediaType}&slimit=1&k=${apiKey}`;

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
