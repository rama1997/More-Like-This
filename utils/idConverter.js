const kitsu = require("../services/kitsu");
const tmdb = require("../services/tmdb");
const watchmode = require("../services/watchmode");
const nameToImdb = require("name-to-imdb");
const trakt = require("../services/trakt");
const cinemeta = require("../services/cinemeta");
const logger = require("../utils/logger");
const { idMapByImdb, idMapByTmdb, idMapByWatchmode } = require("../utils/idMaps");

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

async function imdbToMeta(imdbId, type, metadataSource) {
	const source = metadataSource.source;
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

	const media = await imdbToMeta(imdbId, searchType, metadataSource);
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
		if (mappedType && mappedType !== convertedType) {
			return null;
		}

		return tmdbId ? tmdbId : null;
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
	if (idMapByTmdb[tmdbId]) {
		const imdbId = idMapByTmdb[tmdbId].imdbId;
		return imdbId ? imdbId : null;
	}

	// Call TMDB API if not found in map
	const imdbId = await tmdb.fetchImdbID(tmdbId, type, tmdbApiKey);
	return imdbId ? imdbId : null;
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
					const tmdbResult = await idConverter.tmdbToImdb(foundMedia.id, type, tmdbApiKey);
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
	imdbToMeta,
	imdbToTitleYearType,
	imdbToTmdb,
	tmdbToImdb,
	titleToImdb,
	watchmodeToImdb,
	watchmodeToTmdb,
	watchmodeToType,
};
