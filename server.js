#!/usr/bin/env node

const { serveHTTP, publishToCentral } = require("stremio-addon-sdk");
const addonInterface = require("./addon");
const express = require("express");
const path = require("path");
const fs = require("fs");

const PORT = process.env.PORT || 62030;
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

// API endpoint to save configuration
app.post("/saveConfig", (req, res) => {
	try {
		// Get form data from the request body
		const config = {
			tmdbApiKey: req.body.tmdbApiKey,
			traktApiKey: req.body.traktApiKey,
			tastediveApiKey: req.body.tastediveApiKey,
			geminiApiKey: req.body.geminiApiKey,
			combineCatalogs: req.body.combineCatalogs === "on",
			lastUpdated: new Date().toISOString(),
		};

		console.log("Configuration saved:", config);

		// Redirect back to configuration page with a success message
		res.redirect("/configure?status=success");
	} catch (error) {
		// Redirect back to configuration page with an error message
		res.redirect("/configure?status=error");
	}
});

serveHTTP(addonInterface, { server: app });

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});

// serveHTTP(addonInterface, { port: PORT });
// cacheMaxAge: parseInt(process.env.CACHE_MAX_AGE) || 1 * 60;
// when you've deployed your addon, un-comment this line
// publishToCentral("https://bbab4a35b833-more-like-this.baby-beamup.club/manifest.json");
// for more information on deploying, see: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/deploying/README.md
