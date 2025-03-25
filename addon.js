const { addonBuilder } = require("stremio-addon-sdk");
const catalogManager = require("./src/catalogManager");
const { parseSearchKey } = require("./utils/helper");
const { COMBINE_RECS } = require("./config");

const manifest = {
	id: "community.morelikethis",
	version: "0.0.1",
	catalogs: [
		{
			type: "movie",
			id: "tmdb-movie-rec",
			name: "TMDB Recommendations",
			extra: [{ name: "search", isRequired: true }],
		},
		{
			type: "movie",
			id: "trakt-movie-rec",
			name: "Trakt Recommendations",
			extra: [{ name: "search", isRequired: true }],
		},
		{
			type: "movie",
			id: "tastedive-movie-rec",
			name: "TasteDive Recommendations",
			extra: [{ name: "search", isRequired: true }],
		},
		{
			type: "movie",
			id: "gemini-movie-rec",
			name: "Gemini AI Recommendations",
			extra: [{ name: "search", isRequired: true }],
		},
		{
			type: "movie",
			id: "combined-movie-rec",
			name: "Recommendations",
			extra: [{ name: "search", isRequired: true }],
		},
		{
			type: "series",
			id: "tmdb-series-rec",
			name: "TMDB Recommendations",
			extra: [{ name: "search", isRequired: true }],
		},
		{
			type: "series",
			id: "trakt-series-rec",
			name: "Trakt Recommendations",
			extra: [{ name: "search", isRequired: true }],
		},
		{
			type: "series",
			id: "tastedive-series-rec",
			name: "TasteDive Recommendations",
			extra: [{ name: "search", isRequired: true }],
		},
		{
			type: "series",
			id: "gemini-series-rec",
			name: "Gemini AI Recommendations",
			extra: [{ name: "search", isRequired: true }],
		},
		{
			type: "series",
			id: "combined-series-rec",
			name: "Recommendations",
			extra: [{ name: "search", isRequired: true }],
		},
	],
	resources: ["catalog", "stream"],
	types: ["movie", "series"],
	name: "More-Like-This",
	description: "Shows recommendations from various sources",
	logo: "https://www.stremio.com/website/stremio-logo-small.png",
	idPrefixes: [""],
};

async function addonSetUp() {
	await catalogManager.validateAPIKeys();
}

addonSetUp();

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(({ type, id, extra }) => {
	return new Promise(async (resolve, reject) => {
		// Parse the search input
		let parsedSearchKey = [];
		if (extra.search) {
			parsedSearchKey = await parseSearchKey(extra.search);
		}

		const { searchKey = "", searchYear = "", searchType = "" } = parsedSearchKey;

		let catalog;
		switch (type) {
			case "movie":
				if (extra.search && searchType !== "series") {
					if (COMBINE_RECS === true) {
						if (id === "combined-movie-rec") {
							catalog = catalogManager.getCombinedRecCatalog(searchKey, searchYear, type);
						} else {
							catalog = [];
						}
					} else {
						if (id === "tmdb-movie-rec") {
							catalog = catalogManager.getTMDBRecCatalog(searchKey, searchYear, type);
						} else if (id === "trakt-movie-rec") {
							catalog = catalogManager.getTraktRecCatalog(searchKey, searchYear, type);
						} else if (id === "tastedive-movie-rec") {
							catalog = catalogManager.getTastediveRecCatalog(searchKey, searchYear, type);
						} else if (id === "gemini-movie-rec") {
							catalog = catalogManager.getGeminiRecCatalog(searchKey, searchYear, type);
						} else {
							catalog = [];
						}
					}
					break;
				} else {
					catalog = [];
					break;
				}
			case "series":
				if (extra.search && searchType !== "movie") {
					if (COMBINE_RECS === true) {
						if (id === "combined-series-rec") {
							catalog = catalogManager.getCombinedRecCatalog(searchKey, searchYear, type);
						} else {
							catalog = [];
						}
					} else {
						if (id == "tmdb-series-rec") {
							catalog = catalogManager.getTMDBRecCatalog(searchKey, searchYear, type);
						} else if (id === "trakt-series-rec") {
							catalog = catalogManager.getTraktRecCatalog(searchKey, searchYear, type);
						} else if (id === "tastedive-series-rec") {
							catalog = catalogManager.getTastediveRecCatalog(searchKey, searchYear, type);
						} else if (id === "gemini-series-rec") {
							catalog = catalogManager.getGeminiRecCatalog(searchKey, searchYear, type);
						} else {
							catalog = [];
						}
					}
					break;
				} else {
					catalog = [];
					break;
				}
			default:
				catalog = [];
				break;
		}

		Promise.resolve(catalog).then((items) => {
			resolve({ metas: items });
		});
	});
});

builder.defineStreamHandler(async ({ type, id }) => {
	let searchKey;

	// Parsing IMDB Id and Kitsu Id
	if (id.startsWith("tt")) {
		searchKey = id.split(":")[0];
	} else if (id.startsWith("kitsu")) {
		searchKey = id.split(":").slice(0, 2).join(":");
	}

	const stream = {
		title: `Search for similar ${type}s`,
		externalUrl: `stremio://search?search=${searchKey}`,
	};

	return Promise.resolve({ streams: [stream] });
});

module.exports = builder.getInterface();
