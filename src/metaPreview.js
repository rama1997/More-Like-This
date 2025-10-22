const tmdb = require("../services/tmdb");
const rpdb = require("../services/rpdb");
const cinemeta = require("../services/cinemeta");
const idConverter = require("../utils/idConverter");
const { generateFullMeta } = require("./metadata");

async function createMetaPreview(recs, type, apiKeys, metadataSource) {
	const imdbId = recs.imdbId;
	let tmdbId = recs.tmdbId;

	// Get RPDB poster if valid API key provided
	const rpdbApi = apiKeys.rpdb;
	let rpdbPoster = null;
	if (rpdbApi.valid) {
		rpdbPoster = await rpdb.getRPDBPoster(imdbId, rpdbApi.key);
	}

	//const meta = await generateFullMeta(imdbId, type, metadataSource);
	const meta = null;

	if (metadataSource.source === "cinemeta") {
		const poster = rpdbPoster || (await cinemeta.fetchPoster(imdbId, type));

		return poster
			? {
					id: imdbId,
					type: type,
					poster: poster,
					background: meta?.background || poster,
					name: meta?.name,
					releaseInfo: meta?.releaseInfo,
					description: meta?.description,
					imdbRating: meta?.imdbRating,
			  }
			: null;
	} else if (metadataSource.source === "tmdb") {
		// If no rpdbPoster, fetch TMDB poster
		let poster = rpdbPoster;
		if (!poster) {
			const keepEnglishPoster = metadataSource.keepEnglishPosters;
			const language = keepEnglishPoster ? "en" : metadataSource.language;

			if (!tmdbId) {
				tmdbId = await idConverter.imdbToTmdb(imdbId, type, apiKeys.tmdb.key);
			}

			let tmdbPoster = await tmdb.fetchPoster(tmdbId, type, apiKeys.tmdb.key, language);

			// If poster not available in desired language, default to english posters
			if (!tmdbPoster) {
				tmdbPoster = await tmdb.fetchPoster(tmdbId, type, apiKeys.tmdb.key, "en");
			}

			poster = tmdbPoster;
		}

		return poster
			? {
					id: "mlt-meta-" + imdbId,
					type: type,
					poster: poster,
					background: meta?.background || poster,
					name: meta?.name,
					releaseInfo: meta?.year,
					description: meta?.description,
			  }
			: null;
	}
}

module.exports = {
	createMetaPreview,
};
