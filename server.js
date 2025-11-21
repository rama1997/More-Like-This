#!/usr/bin/env node

const { streamHandler } = require("./src/streamHandler");
const { metaHandler } = require("./src/metaHandler");
const { catalogHandler } = require("./src/catalogHandler");
const express = require("express");
const cors = require("cors");
const path = require("path");
const logger = require("./utils/logger");
const { PORT, ENCRYPTION_KEY_INPUT } = require("./config");
const { validateApiKeys } = require("./services/api");
const { encryptData, decryptData } = require("./utils/encryption");

async function loadUserConfig(config) {
	let userConfig = JSON.parse(decodeURIComponent(config));

	if (ENCRYPTION_KEY_INPUT) {
		try {
			userConfig = await decryptData(userConfig);
		} catch (err) {
			logger.error("Decryption Failed", err);
			const defaultConfig = {
				apiKeys: {
					tmdb: { key: "", valid: false },
					trakt: { key: "", valid: false },
					gemini: { key: "", valid: false },
					watchmode: { key: "", valid: false },
					simkl: { key: "", valid: false },
					tastedive: { key: "", valid: false },
					rpdb: { key: "", valid: false },
				},
				combineCatalogs: false,
				catalogOrder: ["tmdb", "trakt", "simkl", "gemini", "tasteDive", "watchmode"],
				metadataSource: "cinemeta",
				language: "en",
				streamOrder: ["detail", "app", "web", "recs"],
				enabledStreamButtons: {
					detail: false,
					app: false,
					web: false,
					recs: false,
				},
				includeTmdbCollection: false,
				enableTitleSearching: false,
			};
			return defaultConfig;
		}
	}

	return userConfig;
}

async function generateManifest(apiKeys, combine, catalog_order) {
	let catalogs = [];
	const types = ["movie", "series"];

	if (combine === true) {
		types.forEach((type) => {
			catalogs.push({
				type: type,
				id: `mlt-combined-${type}-rec`,
				name: `Similar Recommendations`,
				extra: [{ name: "search", isRequired: true }],
			});
		});
	} else {
		catalog_order.forEach((rawSource) => {
			const source = rawSource.toLowerCase().split(" ")[0];
			if (apiKeys?.[source]?.valid) {
				catalogs.push({
					type: "movie",
					id: `mlt-${source}-movie-rec`,
					name: `${source} Recommendations`,
					extra: [{ name: "search", isRequired: true }],
				});
			}
		});
		catalog_order.forEach((rawSource) => {
			const source = rawSource.toLowerCase().split(" ")[0];
			if (apiKeys?.[source]?.valid) {
				catalogs.push({
					type: "series",
					id: `mlt-${source}-series-rec`,
					name: `${source} Recommendations`,
					extra: [{ name: "search", isRequired: true }],
				});
			}
		});
	}

	const manifest = {
		id: "community.morelikethis",
		version: "0.10.0",
		resources: [
			"catalog",
			"stream",
			{
				name: "meta",
				types: ["movie", "series"],
				idPrefixes: ["mlt-"],
			},
		],
		types: ["movie", "series"],
		name: "More Like This",
		description: "Shows recommendations from various sources",
		logo: "https://i.imgur.com/DHKJ7dT.png",
		idPrefixes: [""],
		behaviorHints: {
			configurable: true,
		},
		catalogs: catalogs,
	};

	return manifest;
}

async function startServer() {
	const app = express();

	// Middle Ware
	app.use(
		cors({
			origin: "*",
			methods: "*",
			allowedHeaders: "*",
		}),
	); // Apply CORS middleware to all routes

	app.use(express.json()); // Middleware to parse JSON bodies

	app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies

	app.use(express.static(path.join(__dirname, "public"))); // Serve static files

	// Main route - redirect to configure
	app.get("/", async function (_, res) {
		res.redirect("/configure");
	});

	app.get("/configure", (req, res) => {
		res.sendFile(path.join(__dirname, "public", "configure.html"));
	});

	app.get("/:userConfig/configure", async (req, res) => {
		try {
			let userConfig = await loadUserConfig(req.params.userConfig);
			userConfig = encodeURIComponent(JSON.stringify(userConfig));
			res.redirect(`/configure?data=${userConfig}`);
		} catch (error) {
			// If parsing fails, serve the default configure page
			res.redirect("/configure");
		}
	});

	app.get("/manifest.json", async (req, res) => {
		let manifest = await generateManifest({}, false, []); // Default Manifest

		res.json(manifest);
	});

	app.get("/:userConfig/manifest.json", async (req, res) => {
		let manifest = "";
		try {
			const userConfig = await loadUserConfig(req.params.userConfig);
			manifest = await generateManifest(userConfig.apiKeys, userConfig.combineCatalogs, userConfig.catalogOrder);
		} catch (err) {
			manifest = await generateManifest({}, false, []); // Default Manifest
		}
		res.json(manifest);
	});

	app.get("/:userConfig/catalog/:type/:id/:extra?.json", async (req, res) => {
		const userConfig = await loadUserConfig(req.params.userConfig);

		// Retreieve and format meta data source
		const metadataSource = {
			source: userConfig.metadataSource === "tmdb" && userConfig.apiKeys.tmdb.valid ? "tmdb" : "cinemeta",
			tmdbApiKey: userConfig.apiKeys.tmdb,
			traktApiKey: userConfig.apiKeys.trakt,
			language: userConfig.language,
			keepEnglishPosters: userConfig.keepEnglishPosters,
		};

		const catalog = (await catalogHandler(req.params.type, req.params.id, req.params.extra, userConfig, metadataSource)) || [];
		res.json(catalog);
	});

	app.get("/:userConfig/stream/:type/:id.json", async (req, res) => {
		const userConfig = await loadUserConfig(req.params.userConfig);

		// Retreieve and format meta data source
		const metadataSource = {
			source: userConfig.metadataSource === "tmdb" && userConfig.apiKeys.tmdb.valid ? "tmdb" : "cinemeta",
			tmdbApiKey: userConfig.apiKeys.tmdb,
			traktApiKey: userConfig.apiKeys.trakt,
			language: userConfig.language,
			keepEnglishPosters: userConfig.keepEnglishPosters,
		};

		const streams = await streamHandler(req.headers["origin"], req.params.type, req.params.id, userConfig, metadataSource);
		res.json(streams);
	});

	app.get("/:userConfig/meta/:type/:id.json", async (req, res) => {
		const userConfig = await loadUserConfig(req.params.userConfig);

		// Retreieve and format meta data source
		const metadataSource = {
			source: userConfig.metadataSource === "tmdb" && userConfig.apiKeys.tmdb.valid ? "tmdb" : "cinemeta",
			tmdbApiKey: userConfig.apiKeys.tmdb,
			traktApiKey: userConfig.apiKeys.trakt,
			language: userConfig.language,
			keepEnglishPosters: userConfig.keepEnglishPosters,
		};

		const meta = await metaHandler(req.params.type, req.params.id, userConfig, metadataSource);
		res.json(meta);
	});

	app.post("/saveConfig", async (req, res) => {
		try {
			// Build API Keys object
			const sources = ["tmdb", "trakt", "tastedive", "gemini", "watchmode", "simkl", "rpdb"];
			const apiKeys = {};

			for (const source of sources) {
				const key = req.body[`${source}ApiKey`];
				apiKeys[source] = {
					key: key || "",
					valid: Boolean(key),
				};
			}

			const metadataSource = req.body.metadataSource || null;

			// Get user config
			const config = {
				apiKeys: apiKeys,
				combineCatalogs: req.body.combineCatalogs === "on" || false,
				catalogOrder: req.body.catalogOrder.split(",") || ["tmdb", "trakt", "simkl", "gemini", "tasteDive", "watchmode"],
				metadataSource: metadataSource,
				language: metadataSource === "tmdb" ? req.body.language || "en" : "en",
				keepEnglishPosters: req.body.keepEnglishPoster === "on" || false,
				streamOrder: req.body.streamOrder.split(",") || ["detail", "app", "web", "recs"],
				enabledStreamButtons: {
					detail: req.body.streamDetailEnabled === "on" || false,
					app: req.body.streamAppEnabled === "on" || false,
					web: req.body.streamWebEnabled === "on" || false,
					recs: req.body.streamRecEnabled === "on" || false,
				},
				includeTmdbCollection: req.body.includeTmdbCollection === "on" || false,
				enableTitleSearching: req.body.enableTitleSearching === "on" || false,
			};

			let userConfig;
			if (ENCRYPTION_KEY_INPUT) {
				const encryptedObject = await encryptData(config);
				userConfig = encodeURIComponent(JSON.stringify(encryptedObject));
			} else {
				userConfig = encodeURIComponent(JSON.stringify(config));
			}

			let host = req.headers.host;
			if (host === "bbab4a35b833-more-like-this") {
				host = host + ".baby-beamup.club";
			}
			if (req.body.forCopy === "true") {
				const manifestUrl = `http://${host}/${userConfig}/manifest.json`;
				return res.json({ manifestUrl });
			} else {
				res.redirect(`stremio://${host}/${userConfig}/manifest.json`);
			}
		} catch (error) {
			res.status(400).send("Error: Something went wrong. Please try again.");
		}
	});

	app.post("/verifyKey", async (req, res) => {
		try {
			const { source, key } = req.body;

			if (!source || !key) {
				return res.status(400).json({ valid: false, error: "Missing source or key" });
			}

			const result = await validateApiKeys({ [source]: key });
			res.json(result[source]);
		} catch (err) {
			res.status(500).json({ valid: false, error: "Server error during validation" });
		}
	});

	app.listen(PORT, () => {});
}

startServer();
