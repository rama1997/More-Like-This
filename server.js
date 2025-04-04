#!/usr/bin/env node

const { catalogHandler, streamHandler } = require("./src/addon");
const express = require("express");
const cors = require("cors");
const path = require("path");
const { PORT } = require("./config");

async function generateManifest(combine, catalog_order) {
	let catalogs = [];
	const types = ["movie", "series"];

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
		catalog_order.forEach((source) => {
			catalogs.push({
				type: "movie",
				id: `mlt-${source.toLowerCase().split(" ").join("-")}-movie-rec`,
				name: `${source} Recommendations`,
				extra: [{ name: "search", isRequired: true }],
			});
		});
		catalog_order.forEach((source) => {
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

async function startServer() {
	const app = express();
	let manifest = await generateManifest(true, []); // Default Manifest

	// Middle Ware
	app.use(
		cors({
			origin: "*",
			methods: "*",
			allowedHeaders: "*",
			maxAge: 86400, // Cache preflight requests for 24 hours
		}),
	); // Apply CORS middleware to all routes

	app.use(express.json()); // Middleware to parse JSON bodies

	app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies

	app.use(express.static(path.join(__dirname, "public"))); // Serve static files

	app.use((req, res, next) => {
		console.log(`Incoming request: ${req.method} ${req.url}`);
		next();
	});

	// Main route - redirect to configure
	app.get("/", async function (_, res) {
		res.redirect("/configure");
	});

	app.get("/configure", (req, res) => {
		res.sendFile(path.join(__dirname, "public", "configure.html"));
	});

	app.get("/:userConfig/configure", (req, res) => {
		res.sendFile(path.join(__dirname, "public", "configure.html"));
	});

	app.get("/manifest.json", async (req, res) => {
		res.json(manifest);
	});

	app.get("/:userConfig/manifest.json", async (req, res) => {
		const userConfig = JSON.parse(decodeURIComponent(req.params.userConfig));
		manifest = await generateManifest(userConfig.combineCatalogs, userConfig.catalogOrder);
		res.json(manifest);
	});

	app.get("/:userConfig?/catalog/:type/:id/:extra?.json", async (req, res) => {
		const userConfig = JSON.parse(decodeURIComponent(req.params.userConfig));
		const catalog = await catalogHandler(req.params.type, req.params.id, req.params.extra, userConfig.apiKeys);
		res.json(catalog);
	});

	app.get("/:userConfig?/stream/:type/:id.json", async (req, res) => {
		const streams = await streamHandler(req.params.type, req.params.id);
		res.json(streams);
	});

	app.post("/saveConfig", (req, res) => {
		try {
			// Get form data
			const config = {
				apiKeys: {
					tmdb: req.body.tmdbApiKey || "",
					trakt: req.body.traktApiKey || "",
					tastedive: req.body.tastediveApiKey || "",
					gemini: req.body.geminiApiKey || "",
					rpdb: req.body.rpdbApiKey || "",
				},
				combineCatalogs: req.body.combineCatalogs === "on" || false,
				catalogOrder: req.body.catalogOrder.split(",") || null,
			};

			const userConfig = encodeURIComponent(JSON.stringify(config));

			// Redirect to Stremio download link
			//res.redirect(`stremio://bbab4a35b833-more-like-this.baby-beamup.club/${userConfig}/manifest.json`);
			res.redirect(`stremio://localhost:7001/${userConfig}/manifest.json`);
		} catch (error) {
			res.status(400).send("Error: Something went wrong. Please try again.");
		}
	});

	app.listen(PORT, () => {
		console.log(`Server running at http://localhost:${PORT}`);
	});
}

startServer();

module.exports = {
	generateManifest,
};
