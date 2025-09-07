const tmdb = require("../services/tmdb");
const rpdb = require("../services/rpdb");
const idConverter = require("../utils/idConverter");

async function createMetaPreview(recs, type, apiKeys, metadataSource) {
	const imdbId = recs.imdbId;
	let tmdbId = recs.tmdbId;

	// Get RPDB poster if valid API key provided
	const rpdbApi = apiKeys.rpdb;
	let rpdbPoster = null;
	if (rpdbApi.valid) {
		rpdbPoster = await rpdb.getRPDBPoster(imdbId, rpdbApi.key);
	}

	// Meta Previews just need id, type, and poster
	if (metadataSource.source === "cinemeta") {
		return rpdbPoster
			? {
					id: imdbId,
					type: type,
					poster: rpdbPoster,
			  }
			: {
					id: imdbId,
					type: type,
			  };
	} else if (metadataSource.source === "tmdb") {
		// Return with RPDB poster
		if (rpdbPoster) {
			return {
				id: "mlt-meta-" + imdbId,
				type: type,
				poster: rpdbPoster,
			};
		}

		// Other wise, fetch TMDB poster
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

		return tmdbPoster
			? {
					id: "mlt-meta-" + imdbId,
					type: type,
					poster: tmdbPoster,
			  }
			: null;
	}
}

module.exports = {
	createMetaPreview,
};
