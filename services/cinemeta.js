const { raw } = require("express");
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

async function cleanMeta(rawMeta) {
	let meta = rawMeta;

	// Remove media that are not released yet
	if (meta?.imdb_id == null || meta?.status === "Upcoming" || meta?.releaseInfo == null) {
		return null;
	}

	const year = Number(meta.releaseInfo);
	const currentYear = new Date().getFullYear();
	if (currentYear < year || year === 0) {
		return null;
	}
	meta.year = meta.releaseInfo;
	meta.backdrop = meta.background;
	meta.title = meta.title ? meta.title : meta.name;

	return meta;
}

module.exports = {
	fetchMetadata,
	cleanMeta,
};
