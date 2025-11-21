const idConverter = require("../utils/idConverter");
const { catalogHandler } = require("./catalogHandler");
const { collectInChunksUntilTimeout } = require("../utils/timeout");
const { generateFullMeta } = require("./metadata");

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
		const meta = await generateFullMeta(imdbId, type, metadataSource);
		return { meta: meta ? meta : {} };
	} else if (request === "rec") {
		// Get meta for "searched" media to provide proper UI meta
		const meta = await generateFullMeta(imdbId, type, metadataSource);
		if (!meta) return { meta: {} };

		let recsAsVideos = [];

		// Get recs for "searched" media via combined recs catalog so that we can also cache catalogs/recs
		const catalog = await catalogHandler(type, `mlt-combined-${type}-rec`, `search=${imdbId}`, userConfig, metadataSource);
		let recs = catalog?.metas;

		if (recs) {
			if (type === "movie") {
				// Reverse to show correct order.
				// Non in place reversal so catalog is not affected by Stremio cache.
				// Only needed for movies since series will automatically show correct rec order via episodes.
				// Movies on mobile seems to respect the order, but not on Mac app
				recs = [...recs].reverse();
			}

			recs = recs.filter((row) => row.id !== imdbId); // Remove base movie/show from the rec list if it exist
			recs = recs.slice(0, 20); // Limit to first 20 recs to reduce load time

			recsAsVideos = await collectInChunksUntilTimeout(
				recs.map(async (rec, i) => {
					const recId = rec.id?.split("-").at(-1);
					const recMeta = await generateFullMeta(recId, type, metadataSource);
					if (!recMeta) return null;

					recMeta.id = recId;
					recMeta.season = 1;
					recMeta.episode = i + 1;
					recMeta.thumbnail = recMeta.background || recMeta.poster;
					recMeta.overview =
						`RUNTIME: ${recMeta.runtime || ""} <br>
			 			YEAR: ${recMeta.year || ""} <br>
			 			IMDB RATING: ${recMeta.imdbRating || ""} <br>
			 			GENRES: ${recMeta.genres || ""} <br>
			 			DIRECTOR: ${recMeta.director || ""} <br>
			 			CAST: ${recMeta.cast || ""} <br><br>` + recMeta.description;

					delete recMeta.title; // deletes "duplicate" title attribute so the rec list can work on mobile

					return recMeta;
				}),
				20, // chuck size
				7000, // global cutoff
			);

			recsAsVideos = recsAsVideos.filter((row) => row !== null);
		}

		const recObject = {
			...meta,
			videos: recsAsVideos,
		};

		recObject.behaviorHints = {}; // Reset behavior hints to properly show recs as a video list
		delete recObject.title; // deletes "duplicate" title attribute so the rec list can work on mobile

		if (type === "series") {
			recObject.id = "mlt-meta-" + imdbId;
		}

		return { meta: recObject };
	}
}

module.exports = {
	metaHandler,
};
