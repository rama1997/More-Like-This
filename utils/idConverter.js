const kitsu = require("../services/kitsu");
const tmdb = require("../services/tmdb");
const watchmode = require("../services/watchmode");
const nameToImdb = require("name-to-imdb");
const trakt = require("../services/trakt");
const cinemeta = require("../services/cinemeta");
const logger = require("../utils/logger");
const { idMapByImdb, idMapByTmdbMovie, idMapByTmdbSeries, idMapByWatchmode } = require("../utils/idMaps");

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

async function imdbToFullMeta(imdbId, type, metadataSource) {
	if (!imdbId || !metadataSource) {
		return null;
	}

	const source = metadataSource.source || "cinemeta";
	const validTMDBKey = metadataSource.tmdbApiKey.valid;

	try {
		// Get metadata from tmdb
		if (source === "tmdb" && validTMDBKey) {
			const tmdbApiKey = metadataSource.tmdbApiKey.key;
			const language = metadataSource.language;
			const tmdbId = await imdbToTmdb(imdbId, type, tmdbApiKey);

			const tmdbMeta = await tmdb.fetchFullMetadata(imdbId, tmdbId, type, tmdbApiKey, language);

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

async function imdbToTitleYearType(imdbId, searchType, metadataSource) {
	if (!imdbId || !imdbId.startsWith("tt")) {
		return null;
	}

	const media = await imdbToFullMeta(imdbId, searchType, metadataSource);
	if (!media || media.type !== searchType) {
		return null;
	}
	return {
		title: media.title,
		year: media.year,
		type: media.type,
	};
}

async function imdbToTmdb(imdbId, type, tmdbApiKey) {
	if (!imdbId || !imdbId.startsWith("tt")) {
		return null;
	}

	// Check in-memory map first
	if (idMapByImdb[imdbId]) {
		const tmdbId = idMapByImdb[imdbId].tmdbId;
		const mappedType = idMapByImdb[imdbId].type;

		// Convert to watchmode type for comparison. Return null if types do not match
		const convertedType = await watchmode.getAPIEndpoint(type);
		if (mappedType && mappedType === convertedType) {
			return tmdbId ? tmdbId : null;
		}
	}

	// Call TMDB API if not found in map
	const res = await tmdb.findByImdbId(imdbId, type, tmdbApiKey, "en");
	const tmdbId = res?.id;
	return tmdbId ? tmdbId : null;
}

async function tmdbToImdb(tmdbId, type, tmdbApiKey) {
	if (!tmdbId) {
		return null;
	}

	// Check in-memory map first
	if (type === "movies" && idMapByTmdbMovie[tmdbId]) {
		const imdbId = idMapByTmdbMovie[tmdbId].imdbId;
		if (imdbId && imdbId.startsWith("tt")) {
			return imdbId;
		}
	} else if (type === "series" && idMapByTmdbSeries[tmdbId]) {
		const imdbId = idMapByTmdbSeries[tmdbId].imdbId;
		if (imdbId && imdbId.startsWith("tt")) {
			return imdbId;
		}
	}

	// Call TMDB API if not found in map
	const imdbId = await tmdb.fetchImdbID(tmdbId, type, tmdbApiKey);
	return imdbId ? imdbId : null;
}

async function traktToImdbTitleYearType(traktId, type, traktApiKey, metadataSource) {
	if (!traktId) {
		return null;
	}

	// Call Trakt API to convert Trakt Id
	const res = await trakt.idToImdbTitleYearType(traktId, type, traktApiKey);

	if (res) {
		const title = res.title;
		const year = res.year;
		let imdbId = res.imdbId;

		// If title and year are found, but no imdbId, attempt to manually find using title
		if (!imdbId && title && year) {
			imdbId = await titleToImdb(title, year, type, metadataSource);
		}

		return { title: title, year: year, imdbId: imdbId, type: type };
	}

	return null;
}

async function titleToImdb(title, year, type, metadataSource) {
	if (!title) return null;

	const searchCinemeta = async () => {
		const mediaType = type === "movie" ? "movie" : "series";
		const input = { name: title, year: year, type: mediaType };
		const cinemetaResult = await new Promise((resolve) => {
			nameToImdb(input, (err, res) => {
				if (err) {
					logger.error("Unable to find title in nameToImdb package", { input });
					return resolve(null);
				}
				resolve(res);
			});
		});
		return cinemetaResult || null;
	};

	const searchTmdb = async () => {
		if (!metadataSource.tmdbApiKey.valid) return null;

		const tmdbApiKey = metadataSource.tmdbApiKey.key;
		const language = metadataSource.language;

		// Search TMDB's search results and fetch the top result
		const searchResults = await tmdb.fetchSearchResult(title, year, type, tmdbApiKey, language);
		if (searchResults && searchResults.length !== 0) {
			const foundMedia = searchResults[0];

			// If the IMDB Id's media does not match catalog type, skip the catalog
			const mediaType = foundMedia.release_date ? "movie" : "series";
			if (mediaType === type) {
				const tmdbResult = await tmdbToImdb(foundMedia.id, type, tmdbApiKey);
				return tmdbResult || null;
			}
		}
		return null;
	};

	const searchTrakt = async () => {
		if (!metadataSource.traktApiKey.valid) return null;

		const traktApiKey = metadataSource.traktApiKey.key;

		// Search Trakt's search results and fetch the top result
		const searchResults = await trakt.fetchSearchResult(title, type, traktApiKey);
		if (searchResults && searchResults.length !== 0) {
			const mediaType = await trakt.getAPIEndpoint(type);

			const foundMedia = searchResults[0][mediaType];
			return foundMedia?.ids?.imdb || null;
		}
		return null;
	};

	// Determine order based on metadata source preference
	let order = [];
	if (metadataSource.source === "tmdb") {
		order = [searchTmdb, searchCinemeta, searchTrakt];
	} else if (metadataSource.source === "cinemeta") {
		order = [searchCinemeta, searchTmdb, searchTrakt];
	} else {
		// default order
		order = [searchCinemeta, searchTmdb, searchTrakt];
	}

	// Try each source in order until one returns a valid imdbId
	for (const source of order) {
		try {
			const result = await source();
			if (result) return result;
		} catch (err) {
			// Continue trying next
		}
	}

	return null;
}

async function watchmodeToImdb(watchmodeId, apiKey) {
	if (!watchmodeId) {
		return null;
	}

	// Check in-memory map first
	if (idMapByWatchmode[watchmodeId]) {
		const imdbId = idMapByWatchmode[watchmodeId].imdbId;
		return imdbId ? imdbId : null;
	}

	const res = await watchmodeToExternalId(watchmodeId, apiKey);
	const imdbId = res?.imdbId;
	return imdbId ? imdbId : null;
}

async function watchmodeToTmdb(watchmodeId, apiKey) {
	if (!watchmodeId) {
		return null;
	}

	// Check in-memory map first
	if (idMapByWatchmode[watchmodeId]) {
		const tmdbId = idMapByWatchmode[watchmodeId].tmdbId;
		return tmdbId ? tmdbId : null;
	}

	const res = await watchmodeToExternalId(watchmodeId, apiKey);
	const tmdbId = res?.tmdbId;
	return tmdbId ? tmdbId : null;
}

async function watchmodeToType(watchmodeId, apiKey) {
	if (!watchmodeId) {
		return null;
	}

	// Check in-memory map first
	if (idMapByWatchmode[watchmodeId]) {
		const type = idMapByWatchmode[watchmodeId].type;
		return type ? type : null;
	}

	const res = await watchmodeToExternalId(watchmodeId, apiKey);
	const type = res?.type;
	return type ? type : null;
}

module.exports = {
	kitsuToImdbTitleYearType,
	imdbToFullMeta,
	imdbToTitleYearType,
	imdbToTmdb,
	tmdbToImdb,
	traktToImdbTitleYearType,
	titleToImdb,
	watchmodeToImdb,
	watchmodeToTmdb,
	watchmodeToType,
};
