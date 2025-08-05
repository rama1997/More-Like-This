#!/usr/bin/env node

const { catalogHandler, streamHandler, metaHandler } = require("./src/addon");
const express = require("express");
const cors = require("cors");
const path = require("path");
const { PORT } = require("./config");
const { validateApiKeys } = require("./services/api");

async function detectPlatform(user_agent, origin) {
	let stremio_origin;
	let platform;

	if (user_agent) {
		if (user_agent.includes("Tizen") || user_agent.includes("SMART-TV") || user_agent.includes("tv")) {
			platform = "tv";
		} else if (user_agent.includes("Macintosh")) {
			platform = "mac";
		} else if (user_agent.includes("Windows")) {
			platform = "windows";
		}
	}

	if (origin) {
		if (origin.includes("web")) {
			stremio_origin = "web";
		} else {
			stremio_origin = "app";
		}
	}

	return { stremio_origin, platform };
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
			if (apiKeys[source].valid) {
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
			if (apiKeys[source].valid) {
				catalogs.push({
					type: "series",
					id: `mlt-${source.toLowerCase().split(" ").join("-")}-series-rec`,
					name: `${source} Recommendations`,
					extra: [{ name: "search", isRequired: true }],
				});
			}
		});
	}

	const manifest = {
		id: "community.morelikethis",
		version: "0.3.7",
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
	let manifest = await generateManifest({}, true, []); // Default Manifest

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

	app.get("/:userConfig/configure", (req, res) => {
		try {
			res.redirect(`/configure?data=${req.params.userConfig}`);
		} catch (error) {
			// If parsing fails, serve the default configure page
			res.redirect("/configure");
		}
	});

	app.get("/manifest.json", async (req, res) => {
		res.json(manifest);
	});

	app.get("/:userConfig/manifest.json", async (req, res) => {
		const userConfig = JSON.parse(decodeURIComponent(req.params.userConfig));
		manifest = await generateManifest(userConfig.apiKeys, userConfig.combineCatalogs, userConfig.catalogOrder);
		res.json(manifest);
	});

	app.get("/:userConfig/catalog/:type/:id/:extra?.json", async (req, res) => {
		const userConfig = JSON.parse(decodeURIComponent(req.params.userConfig));

		// Retreieve and format meta data source
		const metadataSource = {
			source: userConfig.metadataSource === "tmdb" && userConfig.apiKeys.tmdb.valid ? "tmdb" : "cinemeta",
			tmdbApiKey: userConfig.apiKeys.tmdb,
			traktApiKey: userConfig.apiKeys.trakt,
			language: userConfig.language,
		};

		const catalog = (await catalogHandler(req.params.type, req.params.id, req.params.extra, userConfig, metadataSource)) || [];
		res.json(catalog);
	});

	app.get("/:userConfig/stream/:type/:id.json", async (req, res) => {
		const userConfig = JSON.parse(decodeURIComponent(req.params.userConfig));
		const platform = userConfig.streamButtonPlatform;
		const streams = await streamHandler(req.params.type, req.params.id, platform);
		res.json(streams);
	});

	app.get("/:userConfig/meta/:type/:id.json", async (req, res) => {
		const userConfig = JSON.parse(decodeURIComponent(req.params.userConfig));

		// Retreieve and format meta data source
		const metadataSource = {
			source: userConfig.metadataSource === "tmdb" && userConfig.apiKeys.tmdb.valid ? "tmdb" : "cinemeta",
			tmdbApiKey: userConfig.apiKeys.tmdb,
			traktApiKey: userConfig.apiKeys.trakt,
			language: userConfig.language,
		};

		const meta = await metaHandler(req.params.type, req.params.id, userConfig.apiKeys.rpdb, metadataSource);
		res.json(meta);
	});

	app.post("/saveConfig", async (req, res) => {
		try {
			// Build API Keys object
			const sources = ["tmdb", "trakt", "tastedive", "gemini", "watchmode", "rpdb"];
			const apiKeys = {};

			for (const source of sources) {
				const key = req.body[`${source}ApiKey`];
				apiKeys[source] = {
					key: key || "",
					valid: Boolean(key),
				};
			}

			// Handle special case: simkl toggle checkbox
			apiKeys.simkl = {
				valid: req.body.simkl === "on",
			};

			const metadataSource = req.body.metadataSource || null;

			// Get user config
			const config = {
				apiKeys: apiKeys,
				combineCatalogs: req.body.combineCatalogs === "on" || false,
				catalogOrder: req.body.catalogOrder.split(",") || null,
				metadataSource: metadataSource,
				language: metadataSource === "tmdb" ? req.body.language || "en" : "en",
				streamButtonPlatform: req.body.streamButtonPlatform || "",
				includeTmdbCollection: req.body.includeTmdbCollection === "on" || false,
				enableTitleSearching: req.body.enableTitleSearching === "on" || false,
			};

			const userConfig = encodeURIComponent(JSON.stringify(config));

			let host = req.headers.host;
			if (req.body.forCopy === "true") {
				res.redirect(`http://${host}/${userConfig}/manifest.json`);
			} else {
				if (host === "bbab4a35b833-more-like-this") {
					host = host + ".baby-beamup.club";
				}
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

module.exports = {
	generateManifest,
};
