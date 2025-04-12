const fetch = require("node-fetch");
const { GEMINI_MODEL, getGeminiPrompt, getGeminiSystemInstructions } = require("../config");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../utils/logger");

async function validateAPIKey(apiKey) {
	if (!apiKey || apiKey === "") {
		return false;
	}

	// Create the request payload
	const data = {
		contents: [
			{
				parts: [{ text: 'Say "hi"' }],
			},
		],
	};

	try {
		const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			return false;
		}

		const responseData = await response.json();
		return responseData ? true : false;
	} catch (error) {
		return false;
	}
}

async function getGeminiRecs(title, year, mediaType, apiKey) {
	try {
		const genAI = new GoogleGenerativeAI(apiKey);
		const model = genAI.getGenerativeModel({
			model: GEMINI_MODEL,
			systemInstruction: await getGeminiSystemInstructions(mediaType),
		});

		const prompt = await getGeminiPrompt(title, year, mediaType);
		const result = await model.generateContent(prompt);

		return await parseGeminiReturn(result.response.text());
	} catch {
		logger.error(error.message, null);
		return null;
	}
}

async function parseGeminiReturn(str) {
	// Split the input string by newlines to get each movie data
	const rows = str.split("\n");

	// Map each row to an object with title and year
	const recs = rows
		.filter((row) => row.trim() !== "") // Remove blank rows
		.map((row) => {
			const [title, year] = row.split(",");
			return {
				title: title ? title.trim() : "",
				year: year ? year.trim() : "",
			};
		});

	return recs;
}

module.exports = {
	validateAPIKey,
	getGeminiRecs,
};
