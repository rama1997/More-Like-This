#!/usr/bin/env node

const { serveHTTP, publishToCentral, getRouter } = require("stremio-addon-sdk");
const { addonSetUp, generateManifest } = require("./addon");
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { PORT } = require("./config/config");

async function startServer() {
	const app = express();
	const addonInterface = await addonSetUp();
	const sdkRouter = getRouter(addonInterface);

	// Apply CORS middleware to all routes
	app.use(
		cors({
			origin: "*",
			methods: "*",
			allowedHeaders: "*",
			maxAge: 86400, // Cache preflight requests for 24 hours
		}),
	);

	// Middleware to parse JSON bodies
	app.use(express.json());

	// Middleware to parse URL-encoded bodies
	app.use(express.urlencoded({ extended: true }));

	// Serve static files
	app.use(express.static(path.join(__dirname, "public")));

	app.use((req, res, next) => {
		console.log(`Incoming request: ${req.method} ${req.url}`);
		next();
	});

	// Main route - redirect to configure
	app.get("/", async function (_, res) {
		res.redirect("/configure");
	});

	// Configuration page route
	app.get("/configure", (req, res) => {
		res.sendFile(path.join(__dirname, "public", "configure.html"));
	});

	// Configuration page route
	app.get("/manifest.json", async (req, res) => {
		let manifest = await generateManifest();
		res.json(manifest);
	});

	app.post("/saveConfig", (req, res) => {
		try {
			// Get form data
			const config = {
				tmdbApiKey: req.body.tmdbApiKey || "",
				traktApiKey: req.body.traktApiKey || "",
				tastediveApiKey: req.body.tastediveApiKey || "",
				geminiApiKey: req.body.geminiApiKey || "",
				rpdbApiKey: req.body.rpdbApiKey || "",
				combineCatalogs: req.body.combineCatalogs === "on" || false,
				catalogOrder: req.body.catalogOrder.split(",") || null,
			};

			// Ensure config directory exists
			const configDir = path.join(__dirname, "config");
			if (!fs.existsSync(configDir)) {
				fs.mkdirSync(configDir, { recursive: true });
			}

			// Save data to JSON file
			const configFilePath = path.join(configDir, "userConfig.json");
			fs.writeFileSync(configFilePath, JSON.stringify(config, null, 4));

			// Redirect to Stremio download link
			//res.redirect("stremio://bbab4a35b833-more-like-this.baby-beamup.club/manifest.json");
			res.redirect(`stremio://localhost:${PORT}/manifest.json`);
		} catch (error) {
			// Redirect back to configuration page with an error message
			res.status(400).send("Error: Something went wrong. Please try again.");
		}
	});

	// Mount the Stremio SDK router
	app.use("/", sdkRouter);

	app.listen(PORT, () => {
		console.log(`Server running at http://localhost:${PORT}`);
	});
}

startServer();

// publishToCentral("https://bbab4a35b833-more-like-this.baby-beamup.club/manifest.json");
