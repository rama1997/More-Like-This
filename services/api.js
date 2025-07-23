const tmdb = require("../services/tmdb");
const trakt = require("../services/trakt");
const simkl = require("../services/simkl");
const gemini = require("../services/gemini");
const rpdb = require("../services/rpdb");
const tastedive = require("../services/tastedive");
const watchmode = require("../services/watchmode");

async function validateApiKeys(apiKeys) {
	const validators = {
		tmdb: tmdb.validateAPIKey,
		trakt: trakt.validateAPIKey,
		simkl: simkl.validateAPIKey,
		tastedive: tastedive.validateAPIKey,
		gemini: gemini.validateAPIKey,
		rpdb: rpdb.validateAPIKey,
		watchmode: watchmode.validateAPIKey,
	};

	const results = {};

	for (const [keyName, keyValue] of Object.entries(apiKeys)) {
		const validator = validators[keyName];
		if (keyValue !== "" && validator) {
			try {
				const isValid = await validator(keyValue);
				results[keyName] = {
					key: keyValue,
					valid: isValid,
				};
			} catch (err) {
				results[keyName] = {
					key: keyValue,
					valid: false,
					error: err.message || "Validation error",
				};
			}
		} else {
			results[keyName] = {
				key: keyValue,
				valid: false,
				error: "No validator found",
			};
		}
	}

	return results;
}

module.exports = {
	validateApiKeys,
};
