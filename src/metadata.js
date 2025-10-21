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

async function generateFullMeta(imdbId, type, metadataSource) {
	if (!imdbId || !metadataSource) {
		return null;
	}

	const source = metadataSource?.source || "cinemeta";
	const language = metadataSource?.language || "en";

	// Check cache for meta with lock for each id to prevent cache stampede
	return await withLock(imdbId + source + language, async () => {
		const cachedMeta = await checkCache(imdbId, source, language);
		if (cachedMeta) {
			cachedMeta.id = imdbId; // Remove addon prefix id for better integration after returning metadata
			return cachedMeta;
		}

		const mediaType = type === "movie" ? "movie" : "series";
		const rawMeta = await idConverter.imdbToFullMeta(imdbId, mediaType, metadataSource);
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
				logo: rawMeta.logo,
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
		} else {
			return meta;
		}

		await saveCache(imdbId, source, language, meta);

		return meta;
	});
}

module.exports = {
	generateFullMeta,
};
