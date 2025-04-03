const { addonBuilder } = require("stremio-addon-sdk");
const catalogManager = require("./src/catalogManager");
const { parseSearchKey } = require("./utils/parser");
const { COMBINE_CATALOGS, CATALOG_ORDER } = require("./config/config");

async function generateManifest() {
	let catalogs = [];
	const types = ["movie", "series"];
	const combine = COMBINE_CATALOGS();

	if (combine === true) {
		types.forEach((type) => {
			catalogs.push({
				type: type,
				id: `mlt-combined-${type}-rec`,
				name: `Recommendations`,
				extra: [{ name: "search", isRequired: true }],
			});
		});
	} else {
		const order = CATALOG_ORDER();
		order.forEach((source) => {
			catalogs.push({
				type: "movie",
				id: `mlt-${source.toLowerCase().split(" ").join("-")}-movie-rec`,
				name: `${source} Recommendations`,
				extra: [{ name: "search", isRequired: true }],
			});
		});
		order.forEach((source) => {
			catalogs.push({
				type: "series",
				id: `mlt-${source.toLowerCase().split(" ").join("-")}-series-rec`,
				name: `${source} Recommendations`,
				extra: [{ name: "search", isRequired: true }],
			});
		});
	}

	const manifest = {
		id: "community.morelikethis",
		version: "0.0.1",
		resources: ["catalog", "stream"],
		types: ["movie", "series"],
		name: "More Like This",
		description: "Shows recommendations from various sources",
		logo: "https://www.stremio.com/website/stremio-logo-small.png",
		idPrefixes: [""],
		behaviorHints: {
			configurable: true,
		},
		catalogs: catalogs,
	};

	return manifest;
}

async function addonSetUp() {
	const manifest = await generateManifest();
	const builder = new addonBuilder(manifest);
	await catalogManager.validateAPIKeys();

	builder.defineCatalogHandler(({ type, id, extra }) => {
		return new Promise(async (resolve, reject) => {
			console.log("catalog handler");
			// Parse the search input
			let parsedSearchKey = [];
			if (extra.search) {
				parsedSearchKey = await parseSearchKey(extra.search);
			}

			const { searchKey = "", searchYear = "", searchType = "" } = parsedSearchKey;

			console.log(searchKey);

			let catalog;
			switch (type) {
				case "movie":
					if (extra.search && searchType !== "series") {
						if (COMBINE_CATALOGS() === true) {
							if (id === "mlt-combined-movie-rec") {
								console.log("combine movie");
								catalog = catalogManager.getCombinedRecCatalog(searchKey, searchYear, type);
							} else {
								catalog = [];
							}
						} else {
							if (id === "mlt-tmdb-movie-rec") {
								console.log("tmdb movie");
								catalog = catalogManager.getTMDBRecCatalog(searchKey, searchYear, type);
							} else if (id === "mlt-trakt-movie-rec") {
								catalog = catalogManager.getTraktRecCatalog(searchKey, searchYear, type);
							} else if (id === "mlt-tastedive-movie-rec") {
								catalog = catalogManager.getTastediveRecCatalog(searchKey, searchYear, type);
							} else if (id === "mlt-gemini-ai-movie-rec") {
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
						if (COMBINE_CATALOGS() === true) {
							if (id === "mlt-combined-series-rec") {
								catalog = catalogManager.getCombinedRecCatalog(searchKey, searchYear, type);
							} else {
								catalog = [];
							}
						} else {
							if (id == "mlt-tmdb-series-rec") {
								catalog = catalogManager.getTMDBRecCatalog(searchKey, searchYear, type);
							} else if (id === "mlt-trakt-series-rec") {
								catalog = catalogManager.getTraktRecCatalog(searchKey, searchYear, type);
							} else if (id === "mlt-tastedive-series-rec") {
								catalog = catalogManager.getTastediveRecCatalog(searchKey, searchYear, type);
							} else if (id === "mlt-gemini-ai-series-rec") {
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

	const addonInterface = builder.getInterface();
	return addonInterface;
}

module.exports = {
	addonSetUp,
	generateManifest,
};
