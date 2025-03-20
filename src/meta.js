const rpdb = require("./rpdb");
const fetch = require("node-fetch");

async function createMeta(imdbId, type) {
	try {
		const mediaType = type === "movie" ? "movie" : "series";
		const url = `https://v3-cinemeta.strem.io/meta/${mediaType}/${imdbId}.json`;

		const response = await fetch(url);
		const json = await response.json();

		let meta = {};
		if (json && json.meta) {
			const media = json.meta;

			// Will not create a meta/add to catalog for any media that is not released yet
			if (media?.status === "Upcoming") {
				return null;
			}

			let poster = "";
			if (await rpdb.isValidKey()) {
				poster = await rpdb.getRPDBPoster(imdbId);
			} else {
				poster = media.poster_path ? media.poster : null;
			}

			meta = {
				id: media.imdb_id,
				name: media.title || media.name,
				poster: poster,
				backdrop: media.background,
				type: mediaType,
				year: media.releaseInfo,
				genres: media.genres,
			};
		}

		return meta;
	} catch (error) {
		return null;
	}
}

module.exports = {
	createMeta,
};
