const fetch = require("node-fetch");
const { withTimeout } = require("../utils/timeout");
const logger = require("../utils/logger");

async function fetchBaseMetadata(imdbId, type) {
	if (!imdbId) {
		return null;
	}

	try {
		const mediaType = type === "movie" ? "movie" : "series";
		const url = `https://v3-cinemeta.strem.io/meta/${mediaType}/${imdbId}.json`;

		const response = await withTimeout(fetch(url), 5000, "Cinemeta fetch timed out");
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
		logger.error(error.message, null);
		return null;
	}
}

async function adjustMetadata(rawMeta) {
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

async function fetchFullMetadata(imdbId, type) {
	let meta = await fetchBaseMetadata(imdbId, type);

	// Adjust metadata for addon usage
	if (meta) {
		meta = await adjustMetadata(meta);
		return meta;
	}

	return null;
}

module.exports = {
	fetchFullMetadata,
};
