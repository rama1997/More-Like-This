// Load environment variables from .env file
require("dotenv").config();

const ENABLE_LOGGING = process.env.ENABLE_LOGGING === "true" || false;
const ENCRYPTION_KEY_INPUT = process.env.ENCRYPTION_KEY || null;

// Server
const PORT = process.env.PORT || 8080;

// Cache Configs
const CACHE_TTL = process.env.CACHE_TTL || 3 * 24 * 60 * 60; // Cache expiration time - 3 days
const MAX_CACHE_SIZE = process.env.CACHE_MAX_SIZE || 3000;
const REDIS_URL = process.env.REDIS_URL || null;
const REDIS_HOST = process.env.REDIS_HOST || null;
const REDIS_PORT = process.env.REDIS_PORT || null;
const REDIS_DB = process.env.REDIS_DB || null;

// Gemini Configs
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_REC_LIMIT = process.env.GEMINI_MAX_RESULT || 20;

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
	- No explanations or additional text
	- Include ${title} as the first item on the list`.toString();
}

module.exports = {
	GEMINI_MODEL,
	getGeminiPrompt,
	getGeminiSystemInstructions,
	ENCRYPTION_KEY_INPUT,
	CACHE_TTL,
	MAX_CACHE_SIZE,
	ENABLE_LOGGING,
	PORT,
	REDIS_URL,
	REDIS_HOST,
	REDIS_PORT,
	REDIS_DB,
};
