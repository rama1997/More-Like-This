const nameToImdb = require("name-to-imdb");
const kitsu = require("../services/kitsu");
const tmdb = require("../services/tmdb");
const trakt = require("../services/trakt");
const cinemeta = require("../services/cinemeta");
const logger = require("../utils/logger");
const rpdb = require("../services/rpdb");
const cache = require("../utils/cache");
const { withLock } = require("../utils/lock");

async function checkCache(imdbId, metaSource, language) {
	const cacheKey = await cache.createMetaCacheKey(imdbId, metaSource, language);
	return await cache.getCache(cacheKey);
}

async function saveCache(imdbId, metaSource, language, data) {
	const cacheKey = await cache.createMetaCacheKey(imdbId, metaSource, language);
	await cache.setCache(cacheKey, data);
}

async function imdbToMeta(imdbId, type, metadataSource) {
	const source = metadataSource.source;
	const validTMDBKey = metadataSource.tmdbApiKey.valid;

	try {
		// Get metadata from tmdb
		if (source === "tmdb" && validTMDBKey) {
			const tmdbApiKey = metadataSource.tmdbApiKey.key;
			const language = metadataSource.language;

			const tmdbMeta = await tmdb.fetchFullMetadata(imdbId, type, tmdbApiKey, language);
			if (tmdbMeta) return tmdbMeta;
		} else {
			// Default/Backup to Cinemeta
			const cinemetaMeta = await cinemeta.fetchFullMetadata(imdbId, type);
			if (cinemetaMeta) return cinemetaMeta;
		}
		return null;
	} catch (error) {
		logger.error(error.message, "Error converting IMDB Id to metadata");
		return null;
	}
}

async function titleToImdb(title, year, type, metadataSource) {
	if (!title) {
		return null;
	}

	try {
		// Default method is Cinemeta
		const mediaType = type === "movie" ? "movie" : "series";
		const input = { name: title, year: year, type: mediaType };

		const cinemetaResult = await new Promise((resolve, reject) => {
			nameToImdb(input, (err, res, inf) => {
				if (err) {
					logger.error("Unable to find title in nameToImdb package", { input });
					return resolve(null);
				}
				resolve(res);
			});
		});

		if (cinemetaResult) return cinemetaResult;

		// Backup method using TMDB if API key provided
		const validTMDBKey = metadataSource.tmdbApiKey.valid;
		if (validTMDBKey) {
			const tmdbApiKey = metadataSource.tmdbApiKey.key;
			const language = metadataSource.language;

			// Search TMDB's search results for a title + year and fetch the top result
			const searchResults = await tmdb.fetchSearchResult(title, year, type, tmdbApiKey, language);
			if (searchResults && searchResults.length !== 0) {
				const foundMedia = searchResults[0];

				// If the IMDB Id's media does not match catalog type, skip the catalog
				const mediaType = foundMedia.release_date ? "movie" : "series";
				if (mediaType === type) {
					const tmdbResult = await tmdb.fetchImdbID(foundMedia.id, type, tmdbApiKey);
					if (tmdbResult) return tmdbResult;
				}
			}
		}

		// Backup method using Trakt if API key provided
		const validTraktKey = metadataSource.traktApiKey.valid;
		if (validTraktKey) {
			const traktApiKey = metadataSource.traktApiKey.key;

			const searchResults = await trakt.fetchSearchResult(title, type, traktApiKey);
			if (searchResults && searchResults.length !== 0) {
				const foundMedia = searchResults[0][mediaTypeForTrakt];
				const traktResult = foundMedia?.ids?.imdb;
				if (traktResult) return traktResult;
			}
		}

		return null;
	} catch (error) {
		return null;
	}
}

async function imdbToTitleYearType(id, searchType, metadataSource) {
	if (!id || !id.startsWith("tt")) {
		return null;
	}

	const media = await imdbToMeta(id, searchType, metadataSource);
	if (!media || media.type !== searchType) {
		return null;
	}
	return {
		title: media.title,
		year: media.year,
		type: media.type,
	};
}

async function kitsuToImdbTitleYearType(kitsuId, metadataSource) {
	if (!kitsuId || !kitsuId.startsWith("kitsu")) {
		return null;
	}

	const kitsuMedia = await kitsu.idToTitleYearType(kitsuId);

	// Return empty catalog for invalid kitsu id
	if (!kitsuMedia) {
		return null;
	}

	const imdbId = await titleToImdb(kitsuMedia.title, kitsuMedia.year, kitsuMedia.type, metadataSource);

	return imdbId
		? {
				imdbId: imdbId,
				title: kitsuMedia.title,
				year: kitsuMedia.year,
				type: kitsuMedia.type,
		  }
		: null;
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
			const res = await tmdb.findByImdbId(imdbId, type, apiKeys.tmdb.key, language);
			tmdbId = res?.id;
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
		const rawMeta = await imdbToMeta(imdbId, mediaType, metadataSource);
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
	titleToImdb,
	imdbToTitleYearType,
	kitsuToImdbTitleYearType,
	createMetaPreview,
	generateMeta,
};
