const fetch = require("node-fetch");
const nameToImdb = require("name-to-imdb");
const kitsu = require("../services/kitsu");

async function imdbToMeta(imdbId, type) {
	try {
		const mediaType = type === "movie" ? "movie" : "series";
		const url = `https://v3-cinemeta.strem.io/meta/${mediaType}/${imdbId}.json`;

		const response = await fetch(url);
		const json = await response.json();

		if (json?.meta?.year) {
			return json.meta;
		}
		return null;
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
