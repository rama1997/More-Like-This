const fetch = require("node-fetch");

async function fetchMetadata(imdbId, type) {
	try {
		const mediaType = type === "movie" ? "movie" : "series";
		const url = `https://v3-cinemeta.strem.io/meta/${mediaType}/${imdbId}.json`;

		const response = await fetch(url);
		const json = await response.json();

		if (json?.meta) {
			// Manually add year field if possible
			if (!json?.meta?.year) {
				if (json?.meta?.releaseInfo) {
					json.meta.year = json.meta.releaseInfo.split(/[–-]/)[0];
				}
			}
			return json.meta;
		}

		return null;
	} catch (error) {
		return null;
	}
}

module.exports = {
	fetchMetadata,
};
