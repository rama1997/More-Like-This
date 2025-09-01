const tmdb = require("../services/tmdb");
const trakt = require("../services/trakt");
const simkl = require("../services/simkl");
const gemini = require("../services/gemini");
const tastedive = require("../services/tastedive");
const watchmode = require("../services/watchmode");
const { titleToImdb } = require("../utils/idConverter");
const logger = require("../utils/logger");
const cache = require("../utils/cache");
const { withTimeout } = require("../utils/timeout");
const idConverter = require("../utils/idConverter");

async function checkCache(imdbId, type, recSource) {
	const cacheKey = await cache.createRecCacheKey(imdbId, type, recSource);
	return await cache.getCache(cacheKey);
}

async function saveCache(imdbId, type, recSource, data) {
	const cacheKey = await cache.createRecCacheKey(imdbId, type, recSource);
	await cache.setCache(cacheKey, data);
}

async function getTmdbRecs(searchImdb, type, apiKey, validKey, includeTmdbCollection) {
	if (!searchImdb || searchImdb === "" || !validKey) {
		return null;
	}

	const source = includeTmdbCollection ? "tmdb+collection" : "tmdb";

	// Check cache for recs
	const cachedRecs = await checkCache(searchImdb, type, source);
	if (cachedRecs) {
		return cachedRecs;
	}

	// Get recs from TMDB API
	const tmdbId = await idConverter.imdbToTmdb(searchImdb, type, apiKey);
	if (!tmdbId) {
		return null;
	}

	let tmdbRecs = [];
	const defaultRecs = (await tmdb.fetchRecommendations(tmdbId, type, apiKey)) || [];

	// Include TMDB collections into rec if enabled
	if (includeTmdbCollection) {
		const collectionRecs = (await tmdb.fetchCollectionRecs(tmdbId, type, apiKey)) || [];
		tmdbRecs = [...collectionRecs, ...defaultRecs];
	} else {
		tmdbRecs = [...defaultRecs];
	}

	if (!tmdbRecs || tmdbRecs.length === 0) {
		return null;
	}

	tmdbRecs = tmdbRecs.filter((row) => row !== undefined);

	// Get IMDB Id for all recs and add it's placement ranking
	let recs = await Promise.all(
		tmdbRecs.map(async (rec, index) => {
			const imdbId = await idConverter.tmdbToImdb(rec.id, type, apiKey);
			return imdbId ? { imdbId: imdbId, tmdbId: rec.id, ranking: index + 1 } : null;
		}),
	);

	recs = recs.filter((row) => row != null);

	await saveCache(searchImdb, type, source, recs);

	return recs;
}

async function getTraktRecs(searchImdb, type, apiKey, validKey) {
	if (!searchImdb || searchImdb === "" || !validKey) {
		return null;
	}

	// Check cache for recs
	const cachedRecs = await checkCache(searchImdb, type, "trakt");
	if (cachedRecs) {
		return cachedRecs;
	}

	// Get recs based on the found media
	let traktRecs = await trakt.fetchRecommendations(searchImdb, type, apiKey);

	if (!traktRecs || traktRecs.length === 0) {
		return null;
	}
	traktRecs = traktRecs.filter((row) => row !== undefined);

	// Get IMDB Id for all recs and add it's placement ranking
	const recs = await Promise.all(
		traktRecs.map(async (rec, index) => {
			return { imdbId: rec.ids.imdb, tmdbId: rec.ids.tmdb, ranking: index + 1 };
		}),
	);

	await saveCache(searchImdb, type, "trakt", recs);

	return recs;
}

async function getSimklRecs(searchImdb, type, validKey) {
	if (!searchImdb || searchImdb === "" || !validKey) {
		return null;
	}

	// Check cache for recs
	const cachedRecs = await checkCache(searchImdb, type, "simkl");
	if (cachedRecs) {
		return cachedRecs;
	}

	// Get recs based on the found media
	let simklRecs = await simkl.fetchRecommendations(searchImdb, type);
	if (!simklRecs || simklRecs.length === 0) {
		return null;
	}

	simklRecs = simklRecs.filter((row) => row !== undefined);

	let movieRecs = [];
	let seriesRecs = [];

	for (let r of simklRecs) {
		if (r.type === "movie" || r.anime_type === "movie") {
			movieRecs.push(r.ids.simkl);
		} else if (r.type === "tv" || r.anime_type === "tv") {
			seriesRecs.push(r.ids.simkl);
		}
	}

	const typeRecs = type === "movie" ? movieRecs : seriesRecs;
	const recs = await Promise.all(
		typeRecs.map(async (id, index) => {
			const ids = await simkl.simklToExteralId(id, type);
			const imdbId = ids?.imdbId;
			const tmdbId = ids?.tmdbId;
			return imdbId ? { imdbId: imdbId, tmdbId: tmdbId, ranking: index + 1 } : null;
		}),
	);

	await saveCache(searchImdb, type, "simkl", recs);

	return recs;
}

async function getTastediveRecs(searchTitle, searchYear, type, searchImdb, apiKey, validKey, metadataSource) {
	if (!searchTitle || searchTitle === "" || !searchImdb || searchImdb === "" || !validKey) {
		return null;
	}

	// Check cache for recs
	const cachedRecs = await checkCache(searchImdb, type, "tastedive");
	if (cachedRecs) {
		return cachedRecs;
	}

	// Get API response from Tastedive
	const response = await tastedive.fetchRecs(searchTitle, searchYear, type, apiKey);
	if (!response) {
		return null;
	}

	// If recs were found, verify that it is for the proper search input by comparing Imdb Ids
	const foundMedia = response.info?.[0];
	if (!foundMedia || foundMedia.length === 0) {
		return null;
	}
	const foundMediaImdb = await titleToImdb(foundMedia.name, null, foundMedia.type, metadataSource);
	if (searchImdb && foundMediaImdb !== searchImdb) {
		return null;
	}

	const recTitles = response.results;
	if (!recTitles || recTitles.length === 0) {
		return null;
	}

	// Get IMDB Ids for all the rec titles and add it's placement ranking
	let recs = await Promise.all(
		recTitles.map(async (rec, index) => {
			const imdbId = await titleToImdb(rec.name, null, type, metadataSource);
			return { imdbId: imdbId, tmdbId: null, ranking: index + 1 };
		}),
	);

	await saveCache(searchImdb, type, "tastedive", recs);

	return recs;
}

async function getGeminiRecs(searchTitle, searchYear, type, searchImdb, apiKey, validKey, metadataSource) {
	if (!searchTitle || searchTitle === "" || !searchImdb || searchImdb === "" || !validKey) {
		return null;
	}

	// Check cache for recs
	const cachedRecs = await checkCache(searchImdb, type, "gemini");
	if (cachedRecs) {
		return cachedRecs;
	}

	// Get recs from Gemini - Gemini returns rec's title and year as a string
	const recTitles = await gemini.getGeminiRecs(searchTitle, searchYear, type, apiKey);
	if (!recTitles || recTitles.length === 0) {
		return null;
	}

	// If recs were found, verify that the first item is the search input by comparing imdb id
	const foundMedia = recTitles[0];
	const foundMediaImdb = await titleToImdb(foundMedia?.title, foundMedia?.year, type, metadataSource);
	if (searchImdb && foundMediaImdb !== searchImdb) {
		return null;
	}

	// Get IMDB Ids for all the rec titles and add it's placement ranking
	let recs = await Promise.all(
		recTitles
			.slice(1)
			.filter((row) => row[0] !== "") // Remove blank rows
			.map(async (rec, index) => {
				const imdbId = await titleToImdb(rec.title, rec.year, type, metadataSource);
				return imdbId ? { imdbId: imdbId, tmdbId: null, ranking: index + 1 } : null;
			}),
	);

	recs = recs.filter((row) => row != null);

	await saveCache(searchImdb, type, "gemini", recs);

	return recs;
}

async function getWatchmodeRecs(searchImdb, type, apiKey, validKey) {
	if (!searchImdb || searchImdb === "" || !validKey) {
		return null;
	}

	const convertedType = await watchmode.getAPIEndpoint(type);

	// Check cache for recs
	const cachedRecs = await checkCache(searchImdb, type, "watchmode");
	if (cachedRecs) {
		return cachedRecs;
	}

	// Get recs based on the found media
	let watchmodeRecs = await watchmode.fetchRecommendations(searchImdb, apiKey);
	if (!watchmodeRecs || watchmodeRecs.length === 0) {
		return null;
	}
	watchmodeRecs = watchmodeRecs.filter((row) => row !== undefined);

	let movieRecs = [];
	let seriesRecs = [];

	for (let r of watchmodeRecs) {
		const recType = await idConverter.watchmodeToType(r, apiKey);

		if (recType && recType === convertedType) {
			const imdbId = await idConverter.watchmodeToImdb(r, apiKey);
			const tmdbId = await idConverter.watchmodeToTmdb(r, apiKey);

			if (recType === "tv") {
				seriesRecs.push({ imdbId: imdbId, tmdbId: tmdbId });
			} else if (recType === "movie") {
				movieRecs.push({ imdbId: imdbId, tmdbId: tmdbId });
			}
		}
	}

	const typeRecs = type === "movie" ? movieRecs : seriesRecs;
	const recs = await Promise.all(
		typeRecs.map(async (rec, index) => {
			return { imdbId: rec.imdbId, tmdbId: rec.tmdbId, ranking: index + 1 };
		}),
	);

	await saveCache(searchImdb, type, "watchmode", recs);

	return recs;
}

async function getCombinedRecs(searchTitle, searchYear, type, searchImdb, apiKeys, includeTmdbCollection, metadataSource, catalogSource) {
	// Check cache for recs
	const cachedRecs = await checkCache(searchImdb, type, catalogSource);
	if (cachedRecs) {
		return cachedRecs;
	}

	// Get recs from all sources. All sources have a timeout to prevent the whole catalog from not showing if
	// prettier-ignore
	const timeoutMs = 10000;
	const [tmdbRecs, traktRecs, simklRecs, geminiRecs, tastediveRecs, watchmodeRecs] = await Promise.all([
		withTimeout(getTmdbRecs(searchImdb, type, apiKeys.tmdb.key, apiKeys.tmdb.valid, includeTmdbCollection), timeoutMs, "TMDB recs timed out in combined Recs").catch(() => {
			return [];
		}),
		withTimeout(getTraktRecs(searchImdb, type, apiKeys.trakt.key, apiKeys.trakt.valid), timeoutMs, "Trakt recs timed out in combined Recs").catch(() => {
			return [];
		}),
		withTimeout(getSimklRecs(searchImdb, type, apiKeys.simkl.valid), timeoutMs, "Simkl recs timed out in combined Recs").catch(() => {
			return null;
		}),
		withTimeout(getGeminiRecs(searchTitle, searchYear, type, searchImdb, apiKeys.gemini.key, apiKeys.gemini.valid, metadataSource), timeoutMs, "Gemini recs timed out in combined Recs").catch(() => {
			return [];
		}),
		withTimeout(getTastediveRecs(searchTitle, searchYear, type, searchImdb, apiKeys.tastedive.key, apiKeys.tastedive.valid, metadataSource), timeoutMs, "Tastedive recs timed out in combined Recs").catch(() => {
			return [];
		}),
		withTimeout(getWatchmodeRecs(searchImdb, type, apiKeys.watchmode.key, apiKeys.watchmode.valid), timeoutMs, "Watchmode recs timed out in combined Recs").catch(() => {
			return [];
		}),
	]);

	// Merge recs into one array
	let combinedRecs = [...(tmdbRecs || []), ...(traktRecs || []), ...(simklRecs || []), ...(geminiRecs || []), ...(tastediveRecs || []), ...(watchmodeRecs || [])];

	if (!combinedRecs || combinedRecs.length === 0) {
		logger.emptyCatalog("COMBINED: Empty catalog after merge", searchTitle);
		return [];
	}

	combinedRecs = combinedRecs.filter((row) => row != null);

	// Count occurrences of each media ID and sum their ranking within the recommendations
	const recMap = {};
	for (const media of combinedRecs) {
		if (!recMap[media.imdbId]) {
			recMap[media.imdbId] = {
				...media,
				count: 1,
				rankingSum: media.ranking,
			};
		} else {
			recMap[media.imdbId].count += 1;
			recMap[media.imdbId].rankingSum += media.ranking;
		}
	}

	// Convert to array and sort by count, then average ranking
	const sorted = Object.values(recMap).sort((a, b) => {
		if (b.count !== a.count) {
			return b.count - a.count; // More appearances = better
		}
		const aAvgRank = a.rankingSum / a.count;
		const bAvgRank = b.rankingSum / b.count;
		return aAvgRank - bAvgRank; // Lower average rank = better
	});

	await saveCache(searchImdb, type, catalogSource, sorted);

	return sorted;
}

module.exports = {
	getTmdbRecs,
	getTraktRecs,
	getSimklRecs,
	getTastediveRecs,
	getGeminiRecs,
	getWatchmodeRecs,
	getCombinedRecs,
};
