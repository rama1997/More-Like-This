const nameToImdb = require("name-to-imdb");
const kitsu = require("../services/kitsu");
const tmdb = require("../services/tmdb");
const cinemeta = require("../services/cinemeta");
const logger = require("../utils/logger");

async function imdbToMeta(imdbId, type, metaSource) {
	const source = metaSource.source;
	const tmdbApiKey = metaSource.tmdbApiKey.key;
	const validKey = metaSource.tmdbApiKey.valid;
	const language = metaSource.language;

	try {
		// Get metadata from tmdb
		if (source == "tmdb" && validKey) {
			const mediaTypeForAPI = await tmdb.getAPIEndpoint(type);

			const res = await tmdb.fetchMediaDetails(imdbId, mediaTypeForAPI, tmdbApiKey, language);
			if (!res || res.length === 0) {
				return null;
			}

			const media = mediaTypeForAPI === "movie" ? res.movie_results?.[0] : res.tv_results?.[0];
			if (media) {
				const meta = await tmdb.cleanMeta(media, imdbId);
				return meta;
			}
			return null;
		} else {
			// Default to Cinemeta
			const rawMeta = await cinemeta.fetchMetadata(imdbId, type);
			const meta = await cinemeta.cleanMeta(rawMeta);
			return meta;
		}
	} catch (error) {
		return null;
	}
}

async function kitsuToMeta(kitsuId) {
	const meta = await kitsu.convertKitsuId(kitsuId);
	return meta ? meta : null;
}

async function titleToImdb(title, year, type) {
	const mediaType = type === "movie" ? "movie" : "series";
	const input = { name: title, year: year, type: mediaType };

	return new Promise((resolve, reject) => {
		nameToImdb(input, (err, res, inf) => {
			if (err) {
				logger.error("Error with nameToImdb package", { input });
				return resolve(null);
			}
			resolve(res);
		});
	});
}

async function IdToTitleYearType(id, searchType, metaSource) {
	if (id.startsWith("tt")) {
		// IMDB Id
		const media = await imdbToMeta(id, searchType, metaSource);
		if (!media || media.type !== searchType) {
			return null;
		}
		return { title: media.title, year: media.year, type: media.type };
	} else if (id.startsWith("kitsu")) {
		// Kitsu Id
		const media = await kitsuToMeta(id);
		if (!media || media.type !== searchType) {
			return null;
		}
		return { title: media.title, year: media.year, type: media.type };
	}
}

module.exports = {
	imdbToMeta,
	titleToImdb,
	kitsuToMeta,
	IdToTitleYearType,
};
