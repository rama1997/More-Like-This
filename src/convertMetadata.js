const fetch = require("node-fetch");
const nameToImdb = require("name-to-imdb");
const kitsu = require("../services/kitsu");
const cinemeta = require("../services/cinemeta");

async function imdbToMeta(imdbId, type) {
	const meta = await cinemeta.fetchMetadata(imdbId, type);
	return meta;
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
				return resolve(null);
			}
			resolve(res);
		});
	});
}

async function IdToTitleYearType(id, searchType) {
	if (id.startsWith("tt")) {
		// IMDB Id
		const media = await imdbToMeta(id, searchType);
		if (!media || media.type !== searchType) {
			return {};
		}
		return { title: media.name, year: media.year.split(/[–-]/)[0], type: media.type === "movie" ? "movie" : "series" };
	} else if (id.startsWith("kitsu")) {
		// Kitsu Id
		const media = await kitsuToMeta(id);
		if (!media || media.type !== searchType) {
			return {};
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
