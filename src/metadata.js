const cache = require("../utils/cache");
const { withLock } = require("../utils/lock");
const idConverter = require("../utils/idConverter");
const { catalogHandler } = require("./catalog");

async function checkCache(imdbId, metaSource, language) {
	const cacheKey = await cache.createMetaCacheKey(imdbId, metaSource, language);
	return await cache.getCache(cacheKey);
}

async function saveCache(imdbId, metaSource, language, data) {
	const cacheKey = await cache.createMetaCacheKey(imdbId, metaSource, language);
	await cache.setCache(cacheKey, data);
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

async function metaHandler(type, id, userConfig, metadataSource) {
	const request = id.split("-")[1];
	const rawId = id.split("-")[2];

	let imdbId = null;

	if (rawId?.startsWith("tt")) {
		imdbId = rawId.split(":")[0];
	} else if (rawId?.startsWith("kitsu")) {
		const [, id] = rawId.split(":");
		const kitsuId = `kitsu:${id}`;

		const convertedKitsu = await idConverter.kitsuToImdbTitleYearType(kitsuId, metadataSource);
		imdbId = convertedKitsu?.imdbId;
	}

	if (request === "meta") {
		const meta = await generateMeta(imdbId, type, metadataSource);
		return { meta: meta };
	} else if (request === "rec") {
		// Get meta for "searched" media to provide proper UI meta
		const meta = await generateMeta(imdbId, type, metadataSource);

		let recsAsVideos = [];

		// Get recs for "searched" media via combined recs catalog so that we can also cache catalogs/recs
		const catalog = await catalogHandler(type, `mlt-combined`, `search=${imdbId}`, userConfig, metadataSource);
		let recs = catalog?.metas;

		if (recs) {
			if (type === "movie") {
				// Reverse to show correct order.
				// Non in place reversal so catalog is not affected by Stremio cache.
				// Only needed for movies since series will automatically show correct rec order via episodes.
				recs = [...recs].reverse();
			}

			recsAsVideos = await Promise.all(
				recs.map(async (rec, i) => {
					const recId = rec.id?.split("-").at(-1);
					const recMeta = await generateMeta(recId, type, metadataSource);

					if (!recMeta) return null;

					recMeta.id = recId;
					recMeta.season = 1;
					recMeta.episode = i + 1;
					recMeta.thumbnail = recMeta.background;
					recMeta.overview =
						`RUNTIME: ${recMeta.runtime || ""} <br> 
						YEAR: ${recMeta.year || ""} <br>
						IMDB RATING: ${recMeta.imdbRating || ""} <br>
						GENRES: ${recMeta.genres || ""} <br>
						DIRECTOR: ${recMeta.director || ""} <br>
						CAST: ${recMeta.cast || ""} <br> <br>
						` + recMeta.description;

					return recMeta;
				}),
			);

			recsAsVideos = recsAsVideos.filter((row) => row != null);
		}

		const recObject = {
			...meta,
			videos: recsAsVideos,
		};

		recObject.behaviorHints = {}; // Reset behavior hints to properly show recs as a video list

		if (type === "series") {
			recObject.id = "mlt-meta-" + imdbId;
		}

		return { meta: recObject };
	}
}

module.exports = {
	generateMeta,
	metaHandler,
};
