const fetch = require("node-fetch");
const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
const { withTimeout } = require("../utils/timeout");
const logger = require("../utils/logger");

async function validateAPIKey(apiKey) {
	if (!apiKey || apiKey === "") {
		return false;
	}

	try {
		const url = `${TMDB_API_BASE_URL}/movie/popular?api_key=${apiKey}`;

		const response = await fetch(url);
		const json = await response.json();

		return json?.results ? true : false;
	} catch (error) {
		return false;
	}
}

async function getAPIEndpoint(mediaType) {
	// The TMDB API endpoint uses "movie" and "tv"
	return mediaType === "movie" ? "movie" : "tv";
}

async function fetchSearchResult(title, year, mediaType, apiKey, language) {
	try {
		const type = await getAPIEndpoint(mediaType);
		let url = `${TMDB_API_BASE_URL}/search/${type}?query=${encodeURIComponent(title)}&include_adult=false&language=${language}&page=1&api_key=${apiKey}`;

		if (year && year !== "") {
			url = url + `&year=${year}`;
		}

		const response = await withTimeout(fetch(url), 5000, "TMDB search timed out");
		const json = await response.json();
		return json.results && json.results.length > 0 ? json.results : null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function fetchRecommendations(tmdbId, mediaType, apiKey) {
	try {
		const type = await getAPIEndpoint(mediaType);
		const url = `${TMDB_API_BASE_URL}/${type}/${tmdbId}/recommendations?language=en-US&page=1&api_key=${apiKey}`;

		const response = await withTimeout(fetch(url), 5000, "TMDB fetch recs timed out");
		const json = await response.json();
		return json.results && json.results.length > 0 ? json.results : null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function fetchImdbID(tmdbId, mediaType, apiKey) {
	try {
		const type = await getAPIEndpoint(mediaType);
		const url = `${TMDB_API_BASE_URL}/${type}/${tmdbId}/external_ids?api_key=${apiKey}`;

		const response = await withTimeout(fetch(url), 5000, "TMDB fetchImdbID fetch timed out");
		const json = await response.json();
		return json.imdb_id ? json.imdb_id : null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function findByImdbId(imdbId, mediaType, apiKey, language) {
	try {
		const url = `${TMDB_API_BASE_URL}/find/${imdbId}?external_source=imdb_id&language=${language}&api_key=${apiKey}`;

		const response = await withTimeout(fetch(url), 5000, "TMDB find by id timed out");
		const json = await response.json();

		if (json) {
			return mediaType === "movie" ? json?.movie_results?.[0] : json?.tv_results?.[0];
		} else {
			return null;
		}
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function fetchTvSeasonDetails(tmdbId, season, apiKey, language) {
	if (!tmdbId || !season) return null;

	try {
		const url = `${TMDB_API_BASE_URL}/tv/${tmdbId}/season/${season}?language=${language}&api_key=${apiKey}`;

		const response = await withTimeout(fetch(url), 5000, `TMDB fetching tv season episodes timed out for ${tmdbId}:${season}`);
		const json = await response.json();
		return json ? json : null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function fetchCollectionID(tmdbId, mediaType, apiKey) {
	if (!tmdbId || !mediaType) {
		return null;
	}

	try {
		const url = `${TMDB_API_BASE_URL}/${mediaType}/${tmdbId}?language=en-US&api_key=${apiKey}`;

		const response = await withTimeout(fetch(url), 5000, "TMDB collection id fetch timed out");
		const json = await response.json();

		const collectionID = json?.belongs_to_collection?.id;

		return collectionID || null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function fetchCollectionRecs(tmdbId, mediaType, apiKey) {
	if (!tmdbId || !mediaType) {
		return null;
	}

	try {
		const type = await getAPIEndpoint(mediaType);
		const collectionId = await fetchCollectionID(tmdbId, type, apiKey);

		if (collectionId) {
			const url = `${TMDB_API_BASE_URL}/collection/${collectionId}?language=en-US&api_key=${apiKey}`;

			const response = await withTimeout(fetch(url), 5000, "TMDB collection details fetch timed out");
			const json = await response.json();

			let collectionRecs = [];
			const collectionParts = json?.parts;

			if (collectionParts) {
				const today = new Date();

				collectionParts.forEach((part) => {
					const releaseDate = new Date(part.release_date);
					if (part.id !== tmdbId && part.release_date && releaseDate <= today) {
						const media = { id: part.id };
						collectionRecs.push(media);
					}
				});
				return collectionRecs;
			}
		}

		return null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function fetchCredits(tmdbId, mediaType, apiKey, language) {
	if (!tmdbId || !mediaType) {
		return null;
	}

	try {
		let url;
		if (mediaType === "movie") {
			url = `${TMDB_API_BASE_URL}/${mediaType}/${tmdbId}/credits?language=${language}&api_key=${apiKey}`;
		} else {
			url = `${TMDB_API_BASE_URL}/${mediaType}/${tmdbId}/aggregate_credits?language=${language}&api_key=${apiKey}`;
		}

		const response = await withTimeout(fetch(url), 5000, `TMDB credits fetch timed out for ${tmdbId}`);
		const json = await response.json();

		return json ? json : null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function fetchCastDirectors(tmdbId, mediaType, apiKey, language) {
	const credits = await fetchCredits(tmdbId, mediaType, apiKey, language);

	if (credits) {
		const cast = [credits?.cast?.[0]?.name, credits?.cast?.[1]?.name, credits?.cast?.[2]?.name];
		const director = credits?.crew?.filter((c) => c.job === "Director")[0]?.name || null;
		return {
			cast: cast,
			director: director ? [director] : null,
		};
	}

	return null;
}

async function fetchTrailer(tmdbId, mediaType, apiKey, language) {
	if (!tmdbId || !mediaType) {
		return null;
	}

	try {
		let url = `${TMDB_API_BASE_URL}/${mediaType}/${tmdbId}/videos?language=${language}&api_key=${apiKey}`;

		const response = await withTimeout(fetch(url), 5000, `TMDB trailer fetch timed out for ${tmdbId}`);
		const json = await response.json();

		const videos = json?.results ?? null;

		let trailers = null;
		if (videos) {
			trailers = videos.filter((v) => v.type === "Trailer" && v.site === "YouTube");
		}

		return trailers.length > 0 ? trailers : null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function fetchPoster(tmdbId, mediaType, apiKey, language) {
	if (!tmdbId || !mediaType) {
		return null;
	}

	try {
		const type = await getAPIEndpoint(mediaType);
		let url = `${TMDB_API_BASE_URL}/${type}/${tmdbId}/images?language=${language}&api_key=${apiKey}`;

		const response = await withTimeout(fetch(url), 5000, `TMDB Poster fetch timed out for ${tmdbId}`);
		const json = await response.json();

		const posters = json?.posters;

		if (posters && posters.length > 0) {
			const firstPoster = posters[0].file_path;
			return firstPoster ? `https://image.tmdb.org/t/p/original${firstPoster}` : null;
		}

		return null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function fetchLogo(tmdbId, mediaType, apiKey, language) {
	if (!tmdbId || !mediaType) {
		return null;
	}

	try {
		const type = await getAPIEndpoint(mediaType);
		let url = `${TMDB_API_BASE_URL}/${type}/${tmdbId}/images?language=${language}&api_key=${apiKey}`;

		const response = await withTimeout(fetch(url), 5000, `TMDB Logo fetch timed out for ${tmdbId}`);
		const json = await response.json();

		const logos = json?.logos;

		if (logos && logos.length > 0) {
			const firstLogo = logos[0].file_path;
			return firstLogo ? `https://image.tmdb.org/t/p/original${firstLogo}` : null;
		}

		return null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function fetchBaseMetadata(tmdbId, mediaType, apiKey, language) {
	if (!tmdbId || !mediaType) {
		return null;
	}

	try {
		const url = `${TMDB_API_BASE_URL}/${mediaType}/${tmdbId}?language=${language}&api_key=${apiKey}`;
		const response = await withTimeout(fetch(url), 5000, "TMDB metadata fetch for TMDB Id timed out");
		const json = await response.json();

		return json ? json : null;
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

async function fetchFullMetadata(imdbId, tmdbId, mediaType, apiKey, language) {
	const type = await getAPIEndpoint(mediaType);
	let meta = await fetchBaseMetadata(tmdbId, type, apiKey, language);

	// Adjust metadata for addon usage
	if (meta) {
		meta = await adjustMetadata(meta, imdbId, meta.id, type, apiKey, language);
		return meta;
	}

	return null;
}

async function adjustMetadata(rawMeta, imdbId, tmdbId, mediaType, apiKey, language) {
	if (rawMeta == null) {
		return null;
	}

	let meta = rawMeta;

	// Remove media that are not released yet
	const year = meta.release_date ? Number(meta?.release_date?.split(/[–-]/)[0]) : Number(meta?.first_air_date?.split(/[–-]/)[0]);
	const currentYear = new Date().getFullYear();
	if (currentYear < year || year === 0) {
		return null;
	}

	// Get logo
	const logo_url = await fetchLogo(tmdbId, mediaType, apiKey, language);

	// Get cast and director
	const { cast, director } = await fetchCastDirectors(tmdbId, mediaType, apiKey, language);

	// Get runtime
	let runtime = null;
	if (meta.runtime) {
		runtime = ("" + meta.runtime).split(" ")[0] + " min";
	} else if (meta.episode_run_time?.length > 0) {
		runtime = "" + meta.episode_run_time[0] + " min";
	} else if (meta.last_episode_to_air?.runtime) {
		runtime = "" + meta.last_episode_to_air.runtime + " min";
	}

	// Get description in main language. If none, then use eng description as backup
	let description = meta.overview || meta.description;
	if (!description && language !== "en") {
		const engMeta = await fetchFullMetadata(imdbId, tmdbId, mediaType, apiKey, "en");
		description = engMeta?.overview || engMeta?.description;
	}

	// Create video object for TV series
	let videos = [];
	if (mediaType === "tv") {
		const seasons = meta.number_of_seasons;
		for (let i = 1; i <= seasons; i++) {
			const seasonDetails = await fetchTvSeasonDetails(tmdbId, i, apiKey, language);
			if (seasonDetails?.episodes?.length) {
				for (let e of seasonDetails.episodes) {
					if (!e) continue;

					let episodeMeta = {
						id: `${imdbId}:${i}:${e.episode_number ?? "?"}`,
						title: e.name ?? "",
						released: e.air_date ? new Date(e.air_date).toISOString() : null,
						season: i,
						episode: e.episode_number ?? null,
						overview: e.overview ?? "",
						thumbnail: e.still_path ? `https://image.tmdb.org/t/p/original${e.still_path}` : null,
					};

					videos.push(episodeMeta);
				}
			}
		}
	}

	// Get trailer
	const trailers = await fetchTrailer(tmdbId, mediaType, apiKey, language);
	let trailer = {};
	if (trailers && trailers.length > 0) {
		trailer.source = trailers[0].key;
		trailer.type = "Trailer";
		trailer.url = `https://www.youtube.com/watch?v=${trailers[0].key}`;
		trailer.ytId = trailers[0].key;
	} else {
		trailer.source = "";
		trailer.type = "Trailer";
		trailer.ytId = "";
	}

	let backdrop_path = meta.backdrop_path || meta.background;

	// Append new metadata
	meta.imdb_id = imdbId;
	meta.description = description;
	meta.poster = meta.poster_path ? `https://image.tmdb.org/t/p/original${meta.poster_path}` : null;
	meta.backdrop = backdrop_path ? `https://image.tmdb.org/t/p/original${backdrop_path}` : null;
	meta.logo = logo_url ? logo_url : null;
	meta.title = meta.title ? meta.title : meta.name;
	meta.type = meta.release_date ? "movie" : "series";
	meta.year = year;
	meta.cast = cast;
	meta.director = director;
	meta.runtime = runtime;
	meta.videos = videos;
	meta.trailer = [trailer];

	return meta;
}

module.exports = {
	validateAPIKey,
	fetchSearchResult,
	fetchRecommendations,
	fetchImdbID,
	fetchFullMetadata,
	findByImdbId,
	adjustMetadata,
	fetchCollectionRecs,
	fetchPoster,
};
