const fetch = require("node-fetch");
const { GEMINI_API_KEY, GEMINI_MODEL, getGeminiPrompt, getGeminiSystemInstructions } = require("../config");
const { GoogleGenerativeAI } = require("@google/generative-ai");

let validKey = false;

async function validateAPIKey() {
	if (!GEMINI_API_KEY || GEMINI_API_KEY === "") {
		validKey = false;
		return;
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
		const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			validKey = false;
			return;
		}

		const responseData = await response.json();
		validKey = responseData ? true : false;
	} catch (error) {
		validKey = false;
	}
}

async function isValidKey() {
	return validKey;
}

async function getGeminiRecs(title, year, mediaType) {
	try {
		const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
		const model = genAI.getGenerativeModel({
			model: GEMINI_MODEL,
			systemInstruction: await getGeminiSystemInstructions(mediaType),
		});

		const prompt = await getGeminiPrompt(title, year, mediaType);
		const result = await model.generateContent(prompt);

		return await parseGeminiReturn(result.response.text());
	} catch {
		return "";
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
	isValidKey,
	validateAPIKey,
	getGeminiRecs,
};
