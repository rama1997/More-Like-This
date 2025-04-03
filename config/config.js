// Load environment variables from .env file
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { getUserConfig } = require("./userConfig");

const PORT = process.env.PORT || 7000;
const ENABLE_LOGGING = process.env.ENABLE_LOGGING === "true" || false;

// API Keys
const TMDB_API_KEY = () => process.env.TMDB_API_KEY || getUserConfig().tmdbApiKey || "";
const TRAKT_API_KEY = () => process.env.TRAKT_API_KEY || getUserConfig().traktApiKey || "";
const TASTEDIVE_API_KEY = () => process.env.TASTEDIVE_API_KEY || getUserConfig().tastediveApiKey || "";
const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY || getUserConfig().geminiApiKey || "";
const RPDB_API_KEY = () => process.env.RPDB_API_KEY || getUserConfig().rpdbApiKey || "";

// Catalog
const COMBINE_CATALOGS = () => getUserConfig().combineCatalogs || false;
const CATALOG_ORDER = () => getUserConfig().catalogOrder || ["TMDB", "Trakt", "TasteDive", "Gemini AI"];

// Cache Configs
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // Cache expiration time - 1 week
const MAX_CACHE_SIZE = 10000;

// Gemini Configs
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_REC_LIMIT = 30;

async function getGeminiSystemInstructions(searchType) {
	const mediaType = searchType === "movie" ? "movie" : "tv show";

	return `You are a ${mediaType} recommendation service, not a chatbot. You should only ever output recommendations. Output in the following format: ${mediaType} name, year. Leave it as an empty string if not applicable.`.toString();
}

async function getGeminiPrompt(title, year, type) {
	const mediaType = type === "movie" ? "movie" : "tv show";

	return `You are an advanced ${mediaType} recommendation system with deep domain knowledge across ${mediaType} from all eras, regions, and production scales (mainstream, independent, international).
	
	TASK: Generate ${GEMINI_REC_LIMIT} highly relevant ${mediaType} recommendations that capture the essence of "${title}" ${year} as closely as possible.
	
	ANALYSIS PROCESS:
	1. Analyze the core elements of "${title}" including:
		- Thematic elements and underlying messages
		- Narrative structure and storytelling approach
		- Character dynamics and development arcs
		- Tone, mood, and emotional impact
		- Pacing and structural elements
		- Setting and world-building elements
		
	RECOMMENDATION GUIDELINES:
	- If direct sequels, prequels, spin-offs or remakes exist, list the most relevant ones
	- Prioritize recommendations based on:
		- Structural and thematic similarities 
		- Comparable narrative structures
		- Equivalent emotional impacts
		- Related storytelling approaches
	- Deprioritize superficial connections like shared cast, crew, popularity metrics, or ratings
	- Ensure recommendations deliver a comparable core experience, even if surface details differ

	FORMAT:
	- Output only the recommendation list
	- One recommendation per line in the format: "Title, Year"
	- No explanations or additional text`.toString();
}

function debugConfig() {
	try {
		const userConfig = getUserConfig();
		console.log("DEBUG CONFIG:");
		console.log("__dirname:", __dirname);
		console.log("User Config Path:", path.join(__dirname, "..", "config", "userConfig.json"));
		console.log("File exists:", fs.existsSync(path.join(__dirname, "..", "config", "userConfig.json")));
		console.log("User Config:", userConfig);
		console.log("TMDB API Key from config:", userConfig.tmdbApiKey || "not set");
		console.log("RPDB API Key from config:", userConfig.rpdbApiKey || "not set");
		console.log("Combined Key:", TMDB_API_KEY());
	} catch (error) {
		console.error("Debug config error:", error);
	}
}

// Call this at startup
debugConfig();

module.exports = {
	TMDB_API_KEY,
	TRAKT_API_KEY,
	GEMINI_API_KEY,
	RPDB_API_KEY,
	TASTEDIVE_API_KEY,
	GEMINI_MODEL,
	getGeminiPrompt,
	getGeminiSystemInstructions,
	COMBINE_CATALOGS,
	CATALOG_ORDER,
	CACHE_TTL,
	MAX_CACHE_SIZE,
	ENABLE_LOGGING,
	PORT,
};
