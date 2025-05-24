// Load environment variables from .env file
require("dotenv").config();

const ENABLE_LOGGING = process.env.ENABLE_LOGGING === "true" || false;

// Server
const PORT = process.env.PORT || 7000;
const HOST = process.env.LOCAL === "true" ? `localhost:${PORT}` : "bbab4a35b833-more-like-this.baby-beamup.club";

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
	- No explanations or additional text
	- Include ${title} as the first item on the list`.toString();
}

module.exports = {
	GEMINI_MODEL,
	getGeminiPrompt,
	getGeminiSystemInstructions,
	CACHE_TTL,
	MAX_CACHE_SIZE,
	ENABLE_LOGGING,
	PORT,
	HOST,
};
