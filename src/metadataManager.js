const nameToImdb = require("name-to-imdb");
const kitsu = require("../services/kitsu");
const tmdb = require("../services/tmdb");
const trakt = require("../services/trakt");
const cinemeta = require("../services/cinemeta");
const logger = require("../utils/logger");
const rpdb = require("../services/rpdb");
const cache = require("../utils/cache");

async function checkCache(imdbId, source, language, rpdb) {
	const cacheKey = await cache.createMetaCacheKey(imdbId, source, language, rpdb);
	return await cache.getCache(cacheKey);
}

async function saveCache(imdbId, source, language, rpdb, meta) {
	const cacheKey = await cache.createMetaCacheKey(imdbId, source, language, rpdb);
	await cache.setCache(cacheKey, meta);
}

async function imdbToMeta(imdbId, type, metadataSource) {
	const source = metadataSource.source;
	const validTMDBKey = metadataSource.tmdbApiKey.valid;

	try {
		// Get metadata from tmdb
		if (source === "tmdb" && validTMDBKey) {
			const tmdbApiKey = metadataSource.tmdbApiKey.key;
			const language = metadataSource.language;
			const mediaTypeForAPI = await tmdb.getAPIEndpoint(type);

			const tmdbMeta = await tmdb.fetchFullMetadata(imdbId, mediaTypeForAPI, tmdbApiKey, language);
			if (tmdbMeta) {
				return tmdbMeta;
			}
		} else {
			// Default/Backup to Cinemeta
			const rawMeta = await cinemeta.fetchMetadata(imdbId, type);
			const cinemetaMeta = await cinemeta.adjustMeta(rawMeta);
			return cinemetaMeta;
		}
		return null;
	} catch (error) {
		logger.error(error.message, "imdbToMeta");
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
			const mediaTypeForTmdb = await tmdb.getAPIEndpoint(type);

			// Search TMDB's search results for a title + year and fetch the top result
			const searchResults = await tmdb.fetchSearchResult(title, year, mediaTypeForTmdb, tmdbApiKey, language);
			if (searchResults && searchResults.length !== 0) {
				const foundMedia = searchResults[0];

				// If the IMDB Id's media does not match catalog type, skip the catalog
				const mediaType = foundMedia.release_date ? "movie" : "series";
				if (mediaType === type) {
					const tmdbResult = await tmdb.fetchImdbID(foundMedia.id, mediaTypeForTmdb, tmdbApiKey);
					if (tmdbResult) return tmdbResult;
				}
			}
		}

		// Backup method using Trakt if API key provided
		const validTraktKey = metadataSource.traktApiKey.valid;
		if (validTraktKey) {
			const traktApiKey = metadataSource.traktApiKey.key;
			const mediaTypeForTrakt = await trakt.getAPIEndpoint(type);

			const searchResults = await trakt.fetchSearchResult(title, mediaTypeForTrakt, traktApiKey);
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

async function IdToTitleYearType(id, searchType, metadataSource) {
	if (id.startsWith("tt")) {
		// IMDB Id
		const media = await imdbToMeta(id, searchType, metadataSource);
		if (!media || media.type !== searchType) {
			return null;
		}
		return { title: media.title, year: media.year, type: media.type };
	} else if (id.startsWith("kitsu")) {
		// Kitsu Id
		const media = await kitsu.convertKitsuId(id);
		if (!media || media.type !== searchType) {
			return null;
		}
		return { title: media.title, year: media.year, type: media.type };
	}
}

async function generateMeta(imdbId, type, rpdbApiKey, metadataSource) {
	const apiKey = rpdbApiKey.key;
	const validRpdbKey = rpdbApiKey.valid;

	// Check cache for meta
	const source = metadataSource.source;
	const language = metadataSource.language;
	const cachedMeta = await checkCache(imdbId, source, language, validRpdbKey);
	if (cachedMeta) {
		// Remove addon prefix id
		cachedMeta.id = imdbId;
		return cachedMeta;
	}

	const mediaType = type === "movie" ? "movie" : "series";
	const rawMeta = await imdbToMeta(imdbId, mediaType, metadataSource);

	let meta = {};

	if (source === "tmdb") {
		if (rawMeta) {
			let poster = "";
			if (validRpdbKey) {
				poster = await rpdb.getRPDBPoster(imdbId, apiKey);
			}

			// If RPDB is not used or fails to provide a poster, then use default poster
			if (poster === "") {
				poster = rawMeta.poster ? rawMeta.poster : "";
			}

			// Remove media if there is no poster. Mostly for visual improvements for the catalogs
			if (poster === "") {
				return null;
			}

			// Get Genres
			let genres = [];
			if (rawMeta.genres) {
				for (let g of rawMeta.genres) {
					genres.push(g.name);
				}
			}

			meta = {
				id: imdbId,
				name: rawMeta.title,
				description: rawMeta.description,
				poster: poster,
				background: rawMeta.backdrop,
				type: mediaType,
				year: rawMeta.year,
				released: rawMeta.release_date ? new Date(rawMeta.release_date).toISOString() : new Date(rawMeta.first_air_date).toISOString(),
				genres: genres,
				runtime: rawMeta.runtime || "",
				cast: rawMeta.cast,
				director: rawMeta.director,
				videos: rawMeta.videos,
			};
		} else {
			return null;
		}
	} else if (source === "cinemeta") {
		meta = rawMeta;
	}

	// Same meta to cache
	await saveCache(imdbId, source, language, validRpdbKey, meta);

	return meta;
}

module.exports = {
	imdbToMeta,
	titleToImdb,
	IdToTitleYearType,
	generateMeta,
	checkCache,
};
