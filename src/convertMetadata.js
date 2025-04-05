const fetch = require("node-fetch");
const nameToImdb = require("name-to-imdb");

async function imdbToMeta(imdbId, type) {
	try {
		const mediaType = type === "movie" ? "movie" : "series";
		const url = `https://v3-cinemeta.strem.io/meta/${mediaType}/${imdbId}.json`;

		const response = await fetch(url);
		const json = await response.json();

		if (json?.meta?.year) {
			return json.meta;
		}
		return null;
	} catch (error) {
		return null;
	}
}

async function titleToImdb(title, year, type) {
	const mediaType = type === "movie" ? "movie" : "series";
	const input = { name: title, year: year, type: mediaType };

	nameToImdb(input)
		.then(function ({ res, inf }) {
			return res;
		})
		.catch(function (error) {
			return "";
		});
}

module.exports = {
	imdbToMeta,
	titleToImdb,
};
