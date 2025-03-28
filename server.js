#!/usr/bin/env node

const { serveHTTP, publishToCentral } = require("stremio-addon-sdk");
const { addonInterface, generateManifest } = require("./addon");
const express = require("express");
const path = require("path");
const fs = require("fs");
const PORT = process.env.PORT || 62030;

async function startServer() {
	const app = express();

	// Middleware to parse JSON bodies
	app.use(express.json());

	// Middleware to parse URL-encoded bodies
	app.use(express.urlencoded({ extended: true }));

	// Serve static files
	app.use(express.static(path.join(__dirname, "public")));

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
		const manifest = await generateManifest();
		res.json(manifest);
	});

	app.post("/saveConfig", (req, res) => {
		try {
			// Get form data from the request body
			const config = {
				tmdbApiKey: req.body.tmdbApiKey || "",
				traktApiKey: req.body.traktApiKey || "",
				tastediveApiKey: req.body.tastediveApiKey || "",
				geminiApiKey: req.body.geminiApiKey || "",
				rpdbApiKey: req.body.rpdbApiKey || "",
				combineCatalogs: req.body.combineCatalogs === "on" || false,
				catalogOrder: req.body.catalogOrder.split(",") || null,
			};

			// Save data to JSON file
			const configFilePath = path.join(__dirname, "config", "userConfig.json");
			fs.writeFileSync(configFilePath, JSON.stringify(config, null, 4));

			// Redirect to Stremio download link
			//res.redirect("stremio://bbab4a35b833-more-like-this.baby-beamup.club/manifest.json");
			res.redirect(`/manifest.json`);
		} catch (error) {
			// Redirect back to configuration page with an error message
			res.status(400).send("Error: Something went wrong. Please try again.");
		}
	});

	serveHTTP(await addonInterface, { server: app });

	app.listen(PORT, () => {
		console.log(`Server running at http://localhost:${PORT}`);
	});
}

startServer();

// serveHTTP(addonInterface, { port: PORT });
// cacheMaxAge: parseInt(process.env.CACHE_MAX_AGE) || 1 * 60;
// when you've deployed your addon, un-comment this line
// publishToCentral("https://bbab4a35b833-more-like-this.baby-beamup.club/manifest.json");
// for more information on deploying, see: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/deploying/README.md
