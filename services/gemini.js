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
		const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-goog-api-key": apiKey,
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
		const cleanedTitle = title.replace(/[^\p{L}\p{N} ]/gu, "");

		const systemInstruction = await getGeminiSystemInstructions(mediaType);
		const prompt = await getGeminiPrompt(cleanedTitle, year, mediaType);

		const data = {
			systemInstruction: {
				parts: [
					{
						text: systemInstruction,
					},
				],
			},
			contents: [
				{
					parts: [
						{
							text: prompt,
						},
					],
				},
			],
		};

		const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-goog-api-key": apiKey,
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			return null;
		}

		const responseData = await response.json();

		const text = responseData?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";

		if (!text) {
			return null;
		}

		return await parseGeminiReturn(text);
	} catch (error) {
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
