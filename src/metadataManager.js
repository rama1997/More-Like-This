const tmdb = require("../services/tmdb");
const rpdb = require("../services/rpdb");
const cache = require("../utils/cache");
const { withLock } = require("../utils/lock");
const idConverter = require("../utils/idConverter");

async function checkCache(imdbId, metaSource, language) {
	const cacheKey = await cache.createMetaCacheKey(imdbId, metaSource, language);
	return await cache.getCache(cacheKey);
}

async function saveCache(imdbId, metaSource, language, data) {
	const cacheKey = await cache.createMetaCacheKey(imdbId, metaSource, language);
	await cache.setCache(cacheKey, data);
}

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

		const tmdbPoster = await tmdb.fetchPoster(tmdbId, type, apiKeys.tmdb.key, language);

		return tmdbPoster
			? {
					id: "mlt-meta-" + imdbId,
					type: type,
					poster: tmdbPoster,
			  }
			: null;
	}
}

async function generateMeta(imdbId, type, metadataSource) {
	const source = metadataSource.source;
	const language = metadataSource.language || "en";

	// Check cache for meta with lock for each id to prevent cache stampede
	return await withLock(imdbId + source + language, async () => {
		const cachedMeta = await checkCache(imdbId, source, language);
		if (cachedMeta) {
			cachedMeta.id = imdbId; // Remove addon prefix id for better integration after returning metadata
			return cachedMeta;
		}

		const mediaType = type === "movie" ? "movie" : "series";
		const rawMeta = await idConverter.imdbToMeta(imdbId, mediaType, metadataSource);
		if (!rawMeta) return null;

		let meta = {};
		if (source === "tmdb") {
			// Get Genres
			let genres = [];
			if (rawMeta.genres) {
				for (let g of rawMeta.genres) {
					genres.push(g.name);
				}
			}

			// Get released
			let releaseDate = rawMeta.release_date || rawMeta.first_air_date;
			let released = releaseDate && !isNaN(new Date(releaseDate)) ? new Date(releaseDate).toISOString() : null;

			meta = {
				id: imdbId,
				name: rawMeta.title,
				description: rawMeta.description,
				poster: rawMeta.poster,
				background: rawMeta.backdrop,
				type: mediaType,
				year: rawMeta.year,
				released: released,
				genres: genres,
				runtime: rawMeta.runtime || "",
				cast: rawMeta.cast,
				director: rawMeta.director,
				trailers: rawMeta.trailer,
			};

			if (type === "series") {
				meta.videos = rawMeta.videos;
			}
		} else if (source === "cinemeta") {
			meta = rawMeta;
		}

		await saveCache(imdbId, source, language, meta);

		return meta;
	});
}

module.exports = {
	createMetaPreview,
	generateMeta,
};
